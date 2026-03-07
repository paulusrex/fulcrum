import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TaskQuestion } from '@shared/types'

const API_BASE = ''

interface AnswerQuestionPayload {
  taskId: string
  questionId: string
  answer: string
}

interface DeleteQuestionPayload {
  taskId: string
  questionId: string
}

export function useTaskQuestions(taskId: string) {
  return useQuery({
    queryKey: ['task-questions', taskId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}/questions`)
      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }
      return response.json() as Promise<TaskQuestion[]>
    },
    enabled: !!taskId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, questionId, answer }: AnswerQuestionPayload) => {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to answer question' }))
        throw new Error(error.error || 'Failed to answer question')
      }

      return response.json() as Promise<TaskQuestion>
    },
    onMutate: async ({ taskId, questionId, answer }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['task-questions', taskId] })

      // Snapshot previous value
      const previousQuestions = queryClient.getQueryData<TaskQuestion[]>(['task-questions', taskId])

      // Optimistically update the answer
      queryClient.setQueryData<TaskQuestion[]>(
        ['task-questions', taskId],
        (old = []) =>
          old.map((q) =>
            q.id === questionId
              ? { ...q, answer, answeredAt: new Date().toISOString() }
              : q
          )
      )

      return { previousQuestions }
    },
    onError: (_err, { taskId }, context) => {
      // Rollback on error
      if (context?.previousQuestions) {
        queryClient.setQueryData(['task-questions', taskId], context.previousQuestions)
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-questions', variables.taskId] })
    },
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, questionId }: DeleteQuestionPayload) => {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}/questions/${questionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete question' }))
        throw new Error(error.error || 'Failed to delete question')
      }

      return response.json()
    },
    onMutate: async ({ taskId, questionId }) => {
      await queryClient.cancelQueries({ queryKey: ['task-questions', taskId] })

      const previousQuestions = queryClient.getQueryData<TaskQuestion[]>(['task-questions', taskId])

      // Optimistically remove the question
      queryClient.setQueryData<TaskQuestion[]>(
        ['task-questions', taskId],
        (old = []) => old.filter((q) => q.id !== questionId)
      )

      return { previousQuestions }
    },
    onError: (_err, { taskId }, context) => {
      if (context?.previousQuestions) {
        queryClient.setQueryData(['task-questions', taskId], context.previousQuestions)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-questions', variables.taskId] })
    },
  })
}
