import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { parseStatement } from '@/lib/parsers'
import { assertCanUpload, SubscriptionLimitError } from '@/lib/subscription/gate'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Subscription gate — check upload limit
    try {
      await assertCanUpload(user.id, supabase)
    } catch (err) {
      if (err instanceof SubscriptionLimitError) {
        return NextResponse.json(
          { error: err.message, code: err.code, subscription: err.subscription },
          { status: 403 }
        )
      }
      throw err
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bankName = formData.get('bank_name') as string
    const accountId = formData.get('account_id') as string

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const timestamp = Date.now()
    const jobId = crypto.randomUUID()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')
    const filePath = `${user.id}/${timestamp}_${safeFilename}`

    const { error: uploadError } = await supabase.storage
      .from('statements')
      .upload(filePath, file)
      
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload original statement: ${uploadError.message}`)
    }

    const rawTransactions = await parseStatement(file, bankName)
    console.log(`[Upload] Parsed ${rawTransactions.length} transactions from ${file.name} (${bankName})`)
    
    if (rawTransactions.length === 0) {
      return NextResponse.json({ error: 'No transactions found in this PDF. The statement format may not match the expected layout.' }, { status: 422 })
    }

    const merchantsSet = new Set<string>()
    const transactions = rawTransactions.map(t => {
      const cleaned = t.description
        .replace(/[\d\W_]+/g, ' ')
        .trim()
        .split(' ')
        .slice(0, 3)
        .join(' ')
        .toUpperCase()
      
      const merchant = cleaned.length > 2 ? cleaned : 'UNKNOWN'
      if (merchant !== 'UNKNOWN') merchantsSet.add(merchant)

      return {
        id: crypto.randomUUID(),
        ...t,
        merchant,
        user_id: user.id,
        account_id: accountId
      }
    })
    
    const uniqueMerchants = Array.from(merchantsSet)
    const uncachedMerchants: string[] = []

    if (uniqueMerchants.length > 0) {
      const { data: cached } = await supabase
        .from('merchant_categories')
        .select('merchant_hash, category')
        .in('merchant_hash', uniqueMerchants)
        
      const cachedSet = new Set(cached?.map(c => c.merchant_hash) || [])
      uncachedMerchants.push(...uniqueMerchants.filter(m => !cachedSet.has(m)))
    }

    const tempPath = `${user.id}/temp/${jobId}.json`
    const { error: tempError } = await supabase.storage
      .from('statements')
      .upload(tempPath, JSON.stringify(transactions), {
        contentType: 'application/json'
      })

    if (tempError) {
      console.error('Temp storage upload error:', tempError)
      throw new Error(`Failed to save temporary data: ${tempError.message}`)
    }

    await supabase.from('upload_usage').insert({
      user_id: user.id,
      file_name: file.name,
      transaction_count: transactions.length
    })

    return NextResponse.json({ 
      jobId, 
      transactionCount: transactions.length, 
      uncachedMerchants 
    })
    
  } catch (error) {
    console.error('CRITICAL UPLOAD ERROR:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process file',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
