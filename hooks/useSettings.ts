import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useProfile() {
  return useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: async () => {
      const res = await fetch('/api/settings/profile')
      if (!res.ok) throw new Error('Failed to fetch profile')
      return res.json()
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'profile'] }),
  })
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: async () => {
      const res = await fetch('/api/settings/notifications')
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
  })
}

export function useUpdateNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update notifications')
      return res.json()
    },
    onMutate: async (newPrefs) => {
      await qc.cancelQueries({ queryKey: ['settings', 'notifications'] })
      const prev = qc.getQueryData(['settings', 'notifications'])
      qc.setQueryData(['settings', 'notifications'], (old: any) => ({ ...old, ...newPrefs }))
      return { prev }
    },
    onError: (_, __, ctx) => {
      qc.setQueryData(['settings', 'notifications'], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['settings', 'notifications'] }),
  })
}

export function useCustomCategories() {
  return useQuery({
    queryKey: ['settings', 'categories'],
    queryFn: async () => {
      const res = await fetch('/api/settings/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { merchant_pattern: string; category: string }) => {
      const res = await fetch('/api/settings/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create category rule')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/categories/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete category rule')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'categories'] }),
  })
}
