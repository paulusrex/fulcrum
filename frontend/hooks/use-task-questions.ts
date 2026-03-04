import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TaskQuestion } from '@shared/types'

const API_BASE = ''

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
  })
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, questionId, answer }: { taskId: string; questionId: string; answer: string }) => {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to answer question')
      }

      return response.json() as Promise<TaskQuestion>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-questions', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
    },
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, questionId }: { taskId: string; questionId: string }) => {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}/questions/${questionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete question')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-questions', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
    },
  })
}
