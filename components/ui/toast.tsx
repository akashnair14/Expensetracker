'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { create } from 'zustand'

interface ToastStore {
  toasts: { id: string; title: string; description?: string; variant: 'success' | 'error' | 'info' }[]
  toast: (title: string, description?: string, variant?: 'success' | 'error' | 'info') => void
  remove: (id: string) => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  toast: (title, description, variant = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({ toasts: [...state.toasts, { id, title, description, variant }] }))
    
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (variant === 'error') navigator.vibrate(50)
      else navigator.vibrate(10)
    }
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export function ToastProvider() {
  const { toasts, remove } = useToast()

  return (
    <ToastPrimitive.Provider swipeDirection="down">
      {toasts.map(({ id, title, description, variant }) => (
        <ToastPrimitive.Root
          key={id}
          className={`bg-surface border border-border p-4 rounded-2xl shadow-2xl flex items-start gap-4 animate-slideIn ${
            variant === 'success' ? 'border-l-4 border-l-brand-green' :
            variant === 'error' ? 'border-l-4 border-l-red-400' :
            'border-l-4 border-l-brand-blue'
          }`}
          onOpenChange={(open) => !open && remove(id)}
        >
          <div className="mt-1">
            {variant === 'success' && <CheckCircle2 className="w-5 h-5 text-brand-green" />}
            {variant === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {variant === 'info' && <Info className="w-5 h-5 text-brand-blue" />}
          </div>
          <div className="flex-1">
            <ToastPrimitive.Title className="text-sm font-ui font-bold text-white">
              {title}
            </ToastPrimitive.Title>
            {description && (
              <ToastPrimitive.Description className="text-xs font-mono text-text-muted mt-1">
                {description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="text-text-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 left-1/2 -translate-x-1/2 p-6 flex flex-col gap-3 w-full max-w-md z-[100] md:top-0 md:bottom-auto md:right-0 md:left-auto md:translate-x-0" />
    </ToastPrimitive.Provider>
  )
}
