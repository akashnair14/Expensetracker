import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { parseStatement } from '@/lib/parsers'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bankName = formData.get('bank_name') as string

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
    }

    const transactions = await parseStatement(file, bankName)
    
    const merchantsSet = new Set<string>()
    transactions.forEach(t => {
      const cleaned = t.description
        .replace(/[\d\W_]+/g, ' ')
        .trim()
        .split(' ')
        .slice(0, 3)
        .join(' ')
        .toUpperCase()
      if (cleaned.length > 2) merchantsSet.add(cleaned)
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
    await supabase.storage
      .from('statements')
      .upload(tempPath, JSON.stringify(transactions), {
        contentType: 'application/json'
      })

    return NextResponse.json({ 
      jobId, 
      transactionCount: transactions.length, 
      uncachedMerchants 
    })
    
  } catch (error: unknown) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process file' }, { status: 400 })
  }
}
