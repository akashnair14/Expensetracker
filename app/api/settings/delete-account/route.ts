import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/db/server'

// This action is irreversible. No soft delete.
export async function POST(request: Request) {
  try {
    const supabaseServer = createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { confirmText } = await request.json()
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return NextResponse.json({ error: 'Confirmation text does not match' }, { status: 400 })
    }

    const userId = user.id

    // Use admin client for deletion
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete associated data in order
    // Note: Most should cascade if schema is correct, but being explicit as requested
    await supabaseAdmin.from('goal_contributions').delete().eq('user_id', userId)
    await supabaseAdmin.from('goals').delete().eq('user_id', userId)
    await supabaseAdmin.from('transactions').delete().eq('user_id', userId)
    await supabaseAdmin.from('accounts').delete().eq('user_id', userId)
    await supabaseAdmin.from('budgets').delete().eq('user_id', userId)
    await supabaseAdmin.from('reports').delete().eq('user_id', userId)
    await supabaseAdmin.from('subscriptions').delete().eq('user_id', userId)
    await supabaseAdmin.from('upload_usage').delete().eq('user_id', userId)
    await supabaseAdmin.from('custom_categories').delete().eq('user_id', userId)
    await supabaseAdmin.from('notification_preferences').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // Delete files from storage
    const { data: files } = await supabaseAdmin.storage.from('statements').list(`${userId}/`)
    if (files && files.length > 0) {
      await supabaseAdmin.storage.from('statements').remove(files.map(f => `${userId}/${f.name}`))
    }

    // Delete the user from Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) throw authError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete account error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
