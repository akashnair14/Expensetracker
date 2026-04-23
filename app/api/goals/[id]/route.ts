import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { computeGoalStats } from '@/lib/goals/calculations'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const goalId = params.id

    // Check ownership
    const { data: existingGoal, error: fetchError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const updates: any = {
      name: body.name,
      target_amount: body.target_amount,
      deadline: body.deadline,
      monthly_contribution: body.monthly_contribution,
      priority: body.priority,
      status: body.status,
      color: body.color,
      emoji: body.emoji,
      updated_at: new Date().toISOString()
    }

    // Auto-complete logic
    if (existingGoal.saved_amount >= body.target_amount && existingGoal.status === 'active' && body.status !== 'completed') {
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

    // Fetch contributions for stats
    const { data: contributions } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('contributed_at', { ascending: false })
      .limit(6)

    return NextResponse.json(computeGoalStats(updatedGoal, contributions || []))
  } catch (error: any) {
    console.error('Goal PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('goals')
      .update({ status: 'abandoned', updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Goal DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
