import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { confirmText } = await request.json()
    if (confirmText !== 'CLEAR') {
      return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 })
    }

    // Delete transactions
    const { count, error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)

    if (txError) throw txError

    // Reset upload usage
    const { error: usageError } = await supabase
      .from('upload_usage')
      .delete()
      .eq('user_id', user.id)

    if (usageError) throw usageError

    return NextResponse.json({ deleted: count })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
