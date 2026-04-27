import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // 1. Get the upload record to find the storage path
    const { data: upload, error: fetchError } = await supabase
      .from('upload_usage')
      .select('storage_path, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (upload.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 2. Delete transactions associated with this upload
    // We do this explicitly to handle cases where ON DELETE CASCADE might not be set correctly
    const { error: txDeleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('upload_id', id)

    if (txDeleteError) {
      console.error('Failed to delete transactions:', txDeleteError)
      // We continue to try and delete the document itself
    }

    // 3. Delete from Storage
    if (upload.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('statements')
        .remove([upload.storage_path])
      
      if (storageError) {
        console.error('Failed to delete from storage:', storageError)
      }
    }

    // 4. Delete the upload record
    const { error: deleteError } = await supabase
      .from('upload_usage')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    // 5. Aggressive cleanup of orphaned transactions
    const { data: uploads } = await supabase
      .from('upload_usage')
      .select('id')
      .eq('user_id', user.id)
      
    const validUploadIds = uploads?.map(u => u.id) || []
    
    if (validUploadIds.length === 0) {
      await supabase.from('transactions').delete().eq('user_id', user.id)
    } else {
      await supabase.from('transactions').delete().eq('user_id', user.id).not('upload_id', 'in', `(${validUploadIds.join(',')})`)
      await supabase.from('transactions').delete().eq('user_id', user.id).is('upload_id', null)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
