import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Get all valid upload IDs for this user
    const { data: uploads, error: fetchError } = await supabase
      .from('upload_usage')
      .select('id')
      .eq('user_id', user.id)

    if (fetchError) throw fetchError

    const validUploadIds = uploads?.map(u => u.id) || []

    // 2. Aggressive Cleanup
    if (validUploadIds.length === 0) {
      // If NO documents exist, delete ALL transactions for this user
      const { error: clearAllError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
      
      if (clearAllError) throw clearAllError
    } else {
      // If some documents exist, delete transactions that:
      // a) Have an upload_id NOT in our valid list
      // b) Have a NULL upload_id (since they are untracked)
      
      // Delete transactions with invalid upload_ids
      const { error: invalidIdError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .not('upload_id', 'in', `(${validUploadIds.join(',')})`)

      if (invalidIdError) {
         console.error('Error deleting invalid upload_ids:', invalidIdError)
      }

      // Delete transactions with NULL upload_id
      const { error: nullIdError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .is('upload_id', null)

      if (nullIdError) {
         console.error('Error deleting null upload_ids:', nullIdError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database synchronized successfully.',
      remainingDocuments: validUploadIds.length
    })
  } catch (error) {
    console.error('Aggressive sync error:', error)
    return NextResponse.json({ error: 'Failed to synchronize data' }, { status: 500 })
  }
}
