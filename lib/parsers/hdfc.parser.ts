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
    let narrationX = 0

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
      
      for (let j = 0; j < sortedY.length; j++) {
        const y = sortedY[j]
        const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4])
        const lineText = lineItems.map(item => item.str).join(' ').trim()
        
        // Account number extraction
        if (i === 1 && !accountNumber) {
          const accMatch = lineText.match(/Account No\s*:\s*(\d+)/i) || 
                          lineText.match(/A\/c No\s*:\s*(\d+)/i) ||
                          lineText.match(/A\/C\s*No\s*:\s*(\d+)/i)
          if (accMatch) accountNumber = accMatch[1].slice(-4)
        }

        // Detect headers
        if (lineText.toLowerCase().includes('date') && lineText.toLowerCase().includes('narration')) {
          lineItems.forEach(item => {
            const str = item.str.toLowerCase()
            const x = item.transform[4]
            if (str.includes('withdrawal')) withdrawalX = x
            if (str.includes('deposit')) depositX = x
            if (str.includes('balance')) balanceX = x
            if (str.includes('narration')) narrationX = x
          })
          continue
        }

        // HDFC PDF Date format: DD/MM/YY or DD/MM/YYYY
        const dateMatch = lineText.match(/^(\d{2}\/\d{2}\/(?:\d{4}|\d{2}))\s+/)
        if (dateMatch) {
          const dateStr = dateMatch[1]
          const [dd, mm, yyRaw] = dateStr.split('/')
          const yyShort = yyRaw.length === 4 ? yyRaw.slice(-2) : yyRaw
          const dateIso = `20${yyShort}-${mm}-${dd}`
          
          let amount = 0
          let is_debit = false
          let balance = 0
          let description = ''
          
          // Helper to check if a line part is within narration column
          const isNarration = (x: number) => {
             if (narrationX) return x >= narrationX - 5 && x < Math.min(withdrawalX || 999, depositX || 999) - 10
             return x > 60 && x < Math.min(withdrawalX || 450, depositX || 450) - 10
          }

          lineItems.forEach(item => {
            const x = item.transform[4]
            const val = parseFloat(item.str.replace(/,/g, ''))
            
            if (isNaN(val)) {
              if (isNarration(x)) {
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
              }
            }
          })
          
          // LOOK AHEAD for multi-line description
          let k = j + 1
          while (k < sortedY.length) {
            const nextLineItems = linesMap[sortedY[k]].sort((a, b) => a.transform[4] - b.transform[4])
            const nextLineText = nextLineItems.map(item => item.str).join(' ').trim()
            
            // If next line has a date, it's a new transaction
            if (nextLineText.match(/^\d{2}\/\d{2}\/(?:\d{4}|\d{2})/)) break
            
            // If next line has amount/balance in their columns, it's likely not just description
            const hasValues = nextLineItems.some(item => {
               const x = item.transform[4]
               const val = parseFloat(item.str.replace(/,/g, ''))
               return !isNaN(val) && (
                  (withdrawalX && Math.abs(x - withdrawalX) < 30) ||
                  (depositX && Math.abs(x - depositX) < 30) ||
                  (balanceX && Math.abs(x - balanceX) < 30)
               )
            })
            if (hasValues) break

            const extraDesc = nextLineItems
              .filter(item => isNarration(item.transform[4]))
              .map(item => item.str)
              .join(' ')
              .trim()
            
            if (extraDesc) {
              description += ' ' + extraDesc
            } else {
              // If no narration content found and it's not a new transaction, 
              // it might be a sub-header or page footer. Stop looking.
              if (nextLineText.length > 0) break 
            }
            k++
          }
          // Update the outer loop index to skip the lines we just consumed
          j = k - 1

          if (amount > 0) {
            transactions.push({
              date: dateIso,
              amount: Math.abs(amount),
              description: description.trim() || lineText.substring(9).trim(),
              is_debit,
              balance: balance || undefined
            })
          }
        }
      }
    }
    return { transactions, accountNumber, bankName: 'HDFC Bank' }
  } catch (error) {
    console.error('HDFC PDF Parse Error:', error)
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please upload a decrypted version of your HDFC Bank statement.')
    }
    throw new Error(`Failed to parse HDFC PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      const accMatch = rowText.match(/Account No\s*:\s*(\d+)/i) || rowText.match(/A\/C No\s*:\s*(\d+)/i)
      if (accMatch) accountNumber = accMatch[1].slice(-4)
    }

    if (!dataStarted) {
      if (firstCol.toLowerCase().includes('date')) {
        dataStarted = true
      }
      continue
    }
    
    if (!firstCol || firstCol.toLowerCase().includes('closing') || firstCol.toLowerCase().includes('opening') || firstCol.includes('*')) {
      continue
    }

    const dateParts = firstCol.split('/')
    if (dateParts.length !== 3) continue
    
    const [dd, mm, yyRaw] = dateParts
    let yy = yyRaw
    if (yy.length === 2) yy = '20' + yy
    const dateIso = `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    
    const description = String(row[1] || '').trim()
    const debitStr = String(row[3] || '').replace(/,/g, '').trim()
    const creditStr = String(row[4] || '').replace(/,/g, '').trim()
    const balanceStr = String(row[6] || '').replace(/,/g, '').trim()
    
    let amount = 0
    let is_debit = false
    
    if (debitStr && debitStr !== '0' && debitStr !== '0.00' && debitStr !== '') {
      amount = parseFloat(debitStr)
      is_debit = true
    } else if (creditStr && creditStr !== '0' && creditStr !== '0.00' && creditStr !== '') {
      amount = parseFloat(creditStr)
      is_debit = false
    } else {
      continue
    }
    
    if (isNaN(amount)) continue
    
    const balance = balanceStr ? parseFloat(balanceStr) : undefined
    
    transactions.push({
      date: dateIso,
      amount: Math.abs(amount),
      description,
      is_debit,
      balance: isNaN(balance as number) ? undefined : balance
    })
  }
  
  return { transactions, accountNumber, bankName: 'HDFC Bank' }
}

export const hdfcParser: BankParser = {
  bankName: 'HDFC Bank',
  supportedFormats: ['pdf', 'csv', 'xlsx'],
  detectFormat(fileName: string, _: Uint8Array): boolean {
    return fileName.toLowerCase().includes('hdfc')
  },
  async parse(buffer: ArrayBuffer, fileName: string): Promise<ParseResult> {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return parsePdf(buffer)
    }
    return parseExcel(buffer)
  }
}
