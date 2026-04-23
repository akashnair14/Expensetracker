import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GoalWithStats } from '@/types/goals'

export function useGoals() {
  return useQuery<{ goals: GoalWithStats[], totalSaved: number, totalTarget: number }>({
    queryKey: ['goals'],
    queryFn: () => fetch('/api/goals').then(r => {
      if (!r.ok) throw new Error('Failed to fetch goals')
      return r.json()
    }),
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) =>
      fetch('/api/goals', { 
        method: 'POST', 
        body: JSON.stringify(data), 
        headers: { 'Content-Type': 'application/json' } 
      }).then(r => {
        if (!r.ok) throw new Error('Failed to create goal')
        return r.json()
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      fetch(`/api/goals/${id}`, { 
        method: 'PATCH', 
        body: JSON.stringify(data), 
        headers: { 'Content-Type': 'application/json' } 
      }).then(r => {
        if (!r.ok) throw new Error('Failed to update goal')
        return r.json()
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/goals/${id}`, { method: 'DELETE' }).then(r => {
        if (!r.ok) throw new Error('Failed to delete goal')
        return r.json()
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useContribute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, amount, note }: { goalId: string; amount: number; note?: string }) =>
      fetch(`/api/goals/${goalId}/contribute`, { 
        method: 'POST', 
        body: JSON.stringify({ amount, note }), 
        headers: { 'Content-Type': 'application/json' } 
      }).then(r => {
        if (!r.ok) throw new Error('Failed to contribute')
        return r.json()
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useAISuggestions() {
  return useMutation({
    mutationFn: (goals: any[]) =>
      fetch('/api/goals/ai-suggest', { 
        method: 'POST', 
        body: JSON.stringify({ goals }), 
        headers: { 'Content-Type': 'application/json' } 
      }).then(r => {
        if (!r.ok) throw new Error('Failed to get AI suggestions')
        return r.json()
      })
  })
}
