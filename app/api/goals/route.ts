import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { computeGoalStats } from '@/lib/goals/calculations'
import { Goal } from '@/types/goals'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch goals
    const { data: goalsData, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'abandoned')
      .order('created_at', { ascending: false })

    if (goalsError) throw goalsError

    // Fetch last 6 contributions for each goal
    const goalsWithStats = await Promise.all((goalsData as Goal[]).map(async (goal) => {
      const { data: contributions, error: contribError } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goal.id)
        .order('contributed_at', { ascending: false })
        .limit(6)

      if (contribError) throw contribError

      return computeGoalStats(goal, contributions || [])
    }))

    const totalSaved = goalsWithStats.reduce((acc, g) => acc + Number(g.saved_amount), 0)
    const totalTarget = goalsWithStats.reduce((acc, g) => acc + Number(g.target_amount), 0)

    return NextResponse.json({ 
      goals: goalsWithStats, 
      totalSaved, 
      totalTarget 
    })
  } catch (error: unknown) {
    console.error('Goals GET error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, target_amount, emoji, deadline, monthly_contribution, priority, color } = body

    if (!name || !target_amount || target_amount <= 0) {
      return NextResponse.json({ error: 'Name and valid target amount are required' }, { status: 400 })
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        name,
        target_amount,
        emoji: emoji || '🎯',
        deadline: deadline || null,
        monthly_contribution: monthly_contribution || null,
        priority: priority || 2,
        color: color || '#00E5A0',
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(goal)
  } catch (error: unknown) {
    console.error('Goals POST error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
