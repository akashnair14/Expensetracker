import { Goal, GoalWithStats, GoalContribution } from '@/types/goals'

export function computeGoalStats(
  goal: Goal,
  contributions: GoalContribution[]
): GoalWithStats {
  const progressPercent = Math.min(100, (goal.saved_amount / goal.target_amount) * 100)
  const remainingAmount = Math.max(0, goal.target_amount - goal.saved_amount)

  // Months to goal based on monthly contribution
  const monthsToGoal = goal.monthly_contribution && goal.monthly_contribution > 0
    ? Math.ceil(remainingAmount / goal.monthly_contribution)
    : null

  // Projected completion date
  const projectedCompletionDate = monthsToGoal
    ? new Date(Date.now() + monthsToGoal * 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
    : null

  // Is on track? Compare projected vs deadline
  let isOnTrack = true
  if (goal.deadline && projectedCompletionDate) {
    isOnTrack = projectedCompletionDate <= goal.deadline
  }

  return {
    ...goal,
    progressPercent,
    remainingAmount,
    monthsToGoal,
    projectedCompletionDate,
    isOnTrack,
    contributionHistory: contributions,
  }
}

// Suggest a monthly contribution based on deadline or a default 12-month horizon
export function suggestMonthlyContribution(
  goal: Goal
): number {
  const remaining = goal.target_amount - goal.saved_amount
  if (remaining <= 0) return 0

  if (goal.deadline) {
    const monthsLeft = Math.max(1,
      Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000))
    )
    return Math.ceil(remaining / monthsLeft)
  }

  // Default: spread over 12 months
  return Math.ceil(remaining / 12)
}

// How much of current savings rate should be allocated to this goal
export function savingsAllocationPercent(
  suggestedContribution: number,
  monthlySavings: number
): number {
  if (monthlySavings <= 0) return 0
  return Math.min(100, Math.round((suggestedContribution / monthlySavings) * 100))
}
