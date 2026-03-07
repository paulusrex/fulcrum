import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  QuestionCircleIcon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useTaskQuestions, useAnswerQuestion, useDeleteQuestion } from '@/hooks/use-task-questions'
import type { Task } from '@shared/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TaskQuestionsPanelProps {
  task: Task
}

export function TaskQuestionsPanel({ task }: TaskQuestionsPanelProps) {
  const { t } = useTranslation('common')
  const { data: questions = [], isLoading } = useTaskQuestions(task.id)
  const answerQuestion = useAnswerQuestion()
  const deleteQuestion = useDeleteQuestion()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <HugeiconsIcon
          icon={Loading03Icon}
          size={24}
          strokeWidth={2}
          className="animate-spin text-muted-foreground"
        />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <HugeiconsIcon icon={QuestionCircleIcon} size={48} strokeWidth={1.5} className="opacity-50" />
        <p className="text-sm">{t('questions.noQuestions', 'No pending questions')}</p>
        <p className="text-xs text-muted-foreground/70">{t('questions.noQuestionsHint', 'Questions from AI agents will appear here during planning')}</p>
      </div>
    )
  }

  // Track which specific question is being answered/deleted
  const answeringId = answerQuestion.variables?.questionId ?? null
  const deletingId = deleteQuestion.variables?.questionId ?? null

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="space-y-4">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onAnswer={(answer) => {
              answerQuestion.mutate(
                { taskId: task.id, questionId: question.id, answer },
                {
                  onSuccess: () => toast.success(t('questions.answerSaved', 'Answer saved')),
                  onError: (err) => toast.error(err.message),
                }
              )
            }}
            onDelete={() => {
              deleteQuestion.mutate(
                { taskId: task.id, questionId: question.id },
                {
                  onSuccess: () => toast.success(t('questions.questionRemoved', 'Question removed')),
                  onError: (err) => toast.error(err.message),
                }
              )
            }}
            isAnswering={answeringId === question.id && answerQuestion.isPending}
            isDeleting={deletingId === question.id && deleteQuestion.isPending}
            isDisabled={answerQuestion.isPending || deleteQuestion.isPending}
          />
        ))}
      </div>
    </div>
  )
}

interface QuestionCardProps {
  question: {
    id: string
    question: string
    options?: { label: string; description?: string }[]
    answer?: string | null
    askedAt: string
    answeredAt?: string | null
  }
  onAnswer: (answer: string) => void
  onDelete: () => void
  isAnswering: boolean
  isDeleting: boolean
  isDisabled: boolean
}

function QuestionCard({ question, onAnswer, onDelete, isAnswering, isDeleting, isDisabled }: QuestionCardProps) {
  const { t } = useTranslation('common')
  const [selectedOption, setSelectedOption] = useState(question.answer ?? '')
  const [textAnswer, setTextAnswer] = useState(question.answer ?? '')
  const isAnswered = question.answer != null

  const handleSubmit = () => {
    const answer = question.options ? selectedOption : textAnswer
    if (answer.trim()) {
      onAnswer(answer.trim())
    }
  }

  const askedDate = new Date(question.askedAt)
  const answeredDate = question.answeredAt ? new Date(question.answeredAt) : null

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-opacity',
        isAnswered
          ? 'border-border/50 bg-muted/30 opacity-70'
          : 'border-border bg-card',
        isDeleting && 'opacity-50'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isAnswered && (
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={16}
                strokeWidth={2}
                className="text-green-500"
              />
            )}
            <p className={cn('text-sm font-medium', isAnswered && 'text-muted-foreground')}>
              {question.question}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('questions.askedAt', 'Asked')} {askedDate.toLocaleDateString()} {askedDate.toLocaleTimeString()}
          </p>
          {answeredDate && (
            <p className="text-xs text-green-600 dark:text-green-400">
              {t('questions.answeredAt', 'Answered')} {answeredDate.toLocaleDateString()} {answeredDate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting || isDisabled}
        >
          {isDeleting ? (
            <HugeiconsIcon icon={Loading03Icon} size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
          )}
        </Button>
      </div>

      {!isAnswered && (
        <>
          {question.options && question.options.length > 0 ? (
            <RadioGroup
              value={selectedOption}
              onValueChange={setSelectedOption}
              className="mb-3 space-y-2"
            >
              {question.options.map((option, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-2 rounded-md border border-border/50 p-2 hover:bg-muted/50"
                >
                  <RadioGroupItem value={option.label} id={`${question.id}-${index}`} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={`${question.id}-${index}`} className="text-sm font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={t('questions.enterAnswer', 'Enter your answer...')}
              className="mb-3 min-h-[80px]"
              disabled={isDisabled}
            />
          )}

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isAnswering || isDisabled || (question.options ? !selectedOption : !textAnswer.trim())}
          >
            {isAnswering ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={14} strokeWidth={2} className="mr-2 animate-spin" />
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('questions.submitAnswer', 'Submit Answer')
            )}
          </Button>
        </>
      )}

      {isAnswered && (
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-xs text-muted-foreground">{t('questions.yourAnswer', 'Your answer')}:</p>
          <p className="text-sm">{question.answer}</p>
        </div>
      )}
    </div>
  )
}
