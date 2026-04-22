import { create } from 'zustand'
import { Transaction, Account } from '@/types'

interface AppState {
  selectedAccountId: string | null
  selectedMonth: string
  transactions: Transaction[]
  accounts: Account[]
  setSelectedAccount: (id: string | null) => void
  setSelectedMonth: (month: string) => void
  setTransactions: (transactions: Transaction[]) => void
  setAccounts: (accounts: Account[]) => void
}

export const useAppStore = create<AppState>((set) => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return {
    selectedAccountId: null,
    selectedMonth: currentMonth,
    transactions: [],
    accounts: [],
    setSelectedAccount: (id) => set({ selectedAccountId: id }),
    setSelectedMonth: (month) => set({ selectedMonth: month }),
    setTransactions: (transactions) => set({ transactions }),
    setAccounts: (accounts) => set({ accounts }),
  }
})
