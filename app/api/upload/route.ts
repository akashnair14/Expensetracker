import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { parseStatement } from '@/lib/parsers'
import { assertCanUpload, SubscriptionLimitError } from '@/lib/subscription/gate'
import { MerchantContext } from '@/lib/ai/categorize'
import { ParsedTransaction } from '@/types/parsers'

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
    let accountId = formData.get('account_id') as string

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
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

    const parseResult = await parseStatement(file, bankName)
    const { transactions: rawTransactions, accountNumber } = parseResult
    
    if (rawTransactions.length === 0) {
      return NextResponse.json({ error: 'No transactions found in this file. The format may not match the expected layout.' }, { status: 422 })
    }

    // --- AUTO-ACCOUNT DISCOVERY ---
    // If we have an account number from the statement, try to find or create the account
    if (accountNumber) {
      // Find existing account by last 4 digits
      const { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_number_last4', accountNumber)
        .maybeSingle()

      if (existingAccount) {
        accountId = existingAccount.id
      } else {
        // Create new account automatically
        const { data: newAccount, error: createError } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            bank_name: parseResult.bankName || (bankName && bankName !== 'Other' ? bankName : 'Imported Account'),
            account_number_last4: accountNumber
          })
          .select('id')
          .single()

        if (createError) {
          console.error('Failed to auto-create account:', createError)
          // Fallback to provided accountId if creation fails
        } else {
          accountId = newAccount.id
        }
      }
    }

    if (!accountId || accountId === 'new') {
       return NextResponse.json({ 
         error: 'Could not determine which bank account this statement belongs to. Please select or create an account first.',
         needsAccount: true
       }, { status: 400 })
    }

    const merchantsToCategorize: MerchantContext[] = []
    const transactions = rawTransactions.map((t: ParsedTransaction) => {
      let merchant = 'UNKNOWN'
      const desc = t.description.toUpperCase()
      
      // Improved merchant extraction
      if (desc.includes('UPI') || desc.includes('IMPS') || desc.includes('NEFT') || desc.includes('RTGS')) {
        const parts = desc.split(/[\/\-\s]+/).filter(p => p.length > 2 && !/^\d+$/.test(p))
        const filtered = parts.filter(p => !['UPI', 'P2M', 'P2P', 'IMPS', 'NEFT', 'RTGS', 'CR', 'DR', 'TRANSFER', 'ONLINE', 'MOBILE', 'BANK', 'PAID', 'REFV', 'REF', 'TRF', 'SETTLEMENT'].includes(p))
        merchant = filtered.slice(0, 4).join(' ') || parts.slice(0, 3).join(' ') || 'UNKNOWN'
      } else {
        const cleaned = t.description
          .replace(/[^\w\s\-\/]/g, ' ')
          .replace(/\d{8,}/g, ' ') // Only remove very long IDs
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 2)
          .slice(0, 4)
          .join(' ')
          .toUpperCase()
        merchant = cleaned || 'UNKNOWN'
      }
      
      // Add to categorization queue
      merchantsToCategorize.push({
        merchant,
        description: t.description,
        amount: Number(t.amount)
      })

      return {
        id: crypto.randomUUID(),
        ...t,
        merchant,
        user_id: user.id,
        account_id: accountId
      }
    })
    
    // Deduplicate the list to send to AI
    const uniqueContexts = Array.from(new Map(merchantsToCategorize.map((m: MerchantContext) => [m.merchant, m])).values())
    const uncachedMerchants: MerchantContext[] = []

    if (uniqueContexts.length > 0) {
      const { data: cached } = await supabase
        .from('merchant_categories')
        .select('merchant_hash, category')
        .in('merchant_hash', uniqueContexts.map(m => m.merchant.substring(0, 50)))
        
      const cachedSet = new Set(cached?.map(c => c.merchant_hash) || [])
      uncachedMerchants.push(...uniqueContexts.filter(m => !cachedSet.has(m.merchant.substring(0, 50))))
    }

    const tempPath = `${user.id}/temp/${jobId}.json`
    const { error: tempError } = await supabase.storage
      .from('statements')
      .upload(tempPath, JSON.stringify(transactions), {
        contentType: 'application/json'
      })

    if (tempError) {
      console.error('Temp storage upload error:', tempError as { message: string })
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
