import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { computeGoalStats } from '@/lib/goals/calculations'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { amount, note } = body
    const goalId = params.id

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    // 1. Fetch goal and check ownership
    const { data: goal, error: fetchError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // 2. Insert contribution
    const { data: contribution, error: contribError } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: goalId,
        user_id: user.id,
        amount,
        note: note || null
      })
      .select()
      .single()

    if (contribError) throw contribError

    // 3. Update goal saved_amount
    const newSavedAmount = Number(goal.saved_amount) + Number(amount)
    const isCompleted = newSavedAmount >= Number(goal.target_amount)
    
    const updates: any = {
      saved_amount: newSavedAmount,
      updated_at: new Date().toISOString()
    }

    if (isCompleted && goal.status === 'active') {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
    }

    const { data: updatedGoal, error: updateError } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single()

    if (updateError) throw updateError

    // 4. Fetch latest history for stats
    const { data: history } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('contributed_at', { ascending: false })
      .limit(6)

    return NextResponse.json({
      contribution,
      updatedGoal: computeGoalStats(updatedGoal, history || []),
      justCompleted: isCompleted && goal.status === 'active'
    })
  } catch (error: any) {
    console.error('Goal contribution error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
