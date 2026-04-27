import * as XLSX from 'xlsx'
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BankParser, ParsedTransaction, ParseResult } from '@/types/parsers'
import { getPdfJs, getPdfConfig } from './pdf-config'

async function parsePdf(buffer: ArrayBuffer): Promise<ParseResult> {
  const pdfjs = await getPdfJs()
  const data = new Uint8Array(buffer)
  try {
    const loadingTask = pdfjs.getDocument(await getPdfConfig(data))
    
    const pdf = await loadingTask.promise
    const transactions: ParsedTransaction[] = []
    let accountNumber = ''
    
    let withdrawalX = 0
    let depositX = 0
    let balanceX = 0
    let remarksX = 0

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const items = textContent.items as Array<{ str: string; transform: number[] }>
      const linesMap: Record<number, Array<{ str: string; transform: number[] }>> = {}
      
      items.forEach(item => {
        const y = Math.round(item.transform[5])
        if (!linesMap[y]) linesMap[y] = []
        linesMap[y].push(item)
      })
      
      const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a)
      
      for (const y of sortedY) {
        const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4])
        const lineText = lineItems.map(item => item.str).join(' ').trim()
        
        // Try to extract account number from the first page
        if (i === 1 && !accountNumber) {
          const accMatch = lineText.match(/Account No\s*:\s*(\d+)/i) || 
                          lineText.match(/Account Number\s*:\s*(\d+)/i)
          if (accMatch) {
            accountNumber = accMatch[1].slice(-4) // Keep last 4 for privacy/matching
          }
        }

        // Detect headers
        if (lineText.toLowerCase().includes('transaction date') && lineText.toLowerCase().includes('remarks')) {
          lineItems.forEach(item => {
            const str = item.str.toLowerCase()
            const x = item.transform[4]
            if (str.includes('withdrawal')) withdrawalX = x
            if (str.includes('deposit')) depositX = x
            if (str.includes('balance')) balanceX = x
            if (str.includes('remarks')) remarksX = x
          })
          continue
        }

        // ICICI PDF Date format: DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
        const dateMatch = lineText.match(/^(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})/)
        if (dateMatch) {
          const dateStr = dateMatch[1]
          const [dd, mm, yyyy] = dateStr.split(/[\.\-\/]/)
          const dateIso = `${yyyy}-${mm}-${dd}`
          
          let amount = 0
          let is_debit = false
          let balance = 0
          let description = ''
          
          lineItems.forEach(item => {
            const x = item.transform[4]
            const val = parseFloat(item.str.replace(/,/g, ''))
            
            if (isNaN(val)) {
              // Remarks column
              if (remarksX && Math.abs(x - remarksX) < 100) {
                description += ' ' + item.str
              } else if (!remarksX && x > 150 && x < Math.min(withdrawalX || 550, depositX || 550)) {
                 description += ' ' + item.str
              }
            } else {
              // Withdrawal, Deposit or Balance
              if (withdrawalX && Math.abs(x - withdrawalX) < 30) {
                amount = val
                is_debit = true
              } else if (depositX && Math.abs(x - depositX) < 30) {
                amount = val
                is_debit = false
              } else if (balanceX && Math.abs(x - balanceX) < 30) {
                balance = val
              } else if (!withdrawalX) {
                // Fallback heuristics if header detection failed
                if (x > 600 && x < 750) {
                  amount = val
                  is_debit = true
                } else if (x >= 750 && x < 850) {
                  amount = val
                  is_debit = false
                } else if (x >= 850) {
                  balance = val
                }
              }
            }
          })
          
          if (amount > 0) {
            transactions.push({
              date: dateIso,
              amount: Math.abs(amount),
              description: description.trim() || lineText.substring(10).trim(),
              is_debit,
              balance: balance || undefined
            })
          }
        }
      }
    }
    return { transactions, accountNumber, bankName: 'ICICI Bank' }
  } catch (error) {
    console.error('ICICI PDF Parse Error:', error)
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please upload a decrypted version of your ICICI Bank statement.')
    }
    throw new Error(`Failed to parse ICICI PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false })
  
  const transactions: ParsedTransaction[] = []
  let accountNumber = ''
  let dataStarted = false
  
  for (const row of data) {
    if (!row || row.length === 0) continue
    
    const firstCol = String(row[0] || '').trim()
    
    if (!accountNumber) {
      const rowText = row.join(' ')
      const accMatch = rowText.match(/Account No\s*:\s*(\d+)/i) || rowText.match(/Account Number\s*:\s*(\d+)/i)
      if (accMatch) accountNumber = accMatch[1].slice(-4)
    }

    if (!dataStarted) {
      if (firstCol.toLowerCase().includes('transaction date') || firstCol.toLowerCase() === 'date') {
        dataStarted = true
      }
      continue
    }
    
    if (!firstCol || firstCol.toLowerCase().includes('opening') || firstCol.toLowerCase().includes('closing') || firstCol.toLowerCase().includes('balance')) {
      continue
    }

    // Handle multiple separators
    const dateParts = firstCol.split(/[./-]/)
    if (dateParts.length !== 3) continue
    const [dd, mm, yyRaw] = dateParts
    let yy = yyRaw
    if (yy.length === 2) yy = '20' + yy
    const dateIso = `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    
    const description = String(row[2] || '').trim()
    const amountStr = String(row[3] || '').replace(/,/g, '').trim()
    const balanceStr = String(row[4] || '').replace(/,/g, '').trim()
    
    if (!amountStr || amountStr === '0') continue
    
    const rawAmount = parseFloat(amountStr)
    if (isNaN(rawAmount)) continue
    
    const balance = balanceStr ? parseFloat(balanceStr) : undefined
    
    transactions.push({
      date: dateIso,
      amount: Math.abs(rawAmount),
      description,
      is_debit: rawAmount < 0,
      balance: isNaN(balance as number) ? undefined : balance
    })
  }
  
  return { transactions, accountNumber, bankName: 'ICICI Bank' }
}

export const iciciParser: BankParser = {
  bankName: 'ICICI Bank',
  supportedFormats: ['pdf', 'csv', 'xlsx'],
  detectFormat(fileName: string, _: Uint8Array): boolean {
    const lower = fileName.toLowerCase()
    return lower.includes('icici') || lower.includes('op_cl')
  },
  async parse(buffer: ArrayBuffer, fileName: string): Promise<ParseResult> {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return parsePdf(buffer)
    }
    return parseExcel(buffer)
  }
}
