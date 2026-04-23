export interface Goal {
  id: string
  user_id: string
  name: string
  emoji: string
  target_amount: number
  saved_amount: number
  monthly_contribution: number | null
  deadline: string | null          // ISO date
  priority: 1 | 2 | 3
  status: 'active' | 'completed' | 'paused' | 'abandoned'
  color: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface GoalContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  note: string | null
  contributed_at: string
}

export interface GoalWithStats extends Goal {
  progressPercent: number           // 0-100
  remainingAmount: number
  monthsToGoal: number | null       // based on monthly_contribution
  projectedCompletionDate: string | null
  isOnTrack: boolean                // vs deadline if set
  contributionHistory: GoalContribution[]
}
