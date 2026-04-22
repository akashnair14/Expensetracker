import { Transaction } from '@/types'

export interface RecurringCharge {
  merchant: string
  estimatedAmount: number
  frequency: 'monthly' | 'weekly'
  lastCharged: string
}

export function detectRecurring(transactions: Transaction[]): RecurringCharge[] {
  const merchants: Record<string, Transaction[]> = {}
  
  // Group by merchant
  transactions.forEach(tx => {
    if (!tx.is_debit) return
    const merchantName = tx.merchant || 'Unknown Merchant'
    if (!merchants[merchantName]) {
      merchants[merchantName] = []
    }
    merchants[merchantName].push(tx)
  })

  const recurring: RecurringCharge[] = []

  Object.entries(merchants).forEach(([merchant, txs]) => {
    if (txs.length < 2) return

    // Sort by date descending
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Group by month to see if it's monthly
    const monthGroups: Record<string, number[]> = {}
    txs.forEach(tx => {
      const month = tx.date.slice(0, 7)
      if (!monthGroups[month]) monthGroups[month] = []
      monthGroups[month].push(tx.amount)
    })

    const months = Object.keys(monthGroups).length
    if (months >= 2) {
      // Check if amounts are within 10% tolerance
      const amounts = txs.map(t => t.amount)
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const isConsistent = amounts.every(amt => Math.abs(amt - avg) <= avg * 0.1)

      if (isConsistent) {
        recurring.push({
          merchant,
          estimatedAmount: Math.round(avg),
          frequency: 'monthly',
          lastCharged: txs[0].date
        })
      }
    }
  })

  return recurring
}
