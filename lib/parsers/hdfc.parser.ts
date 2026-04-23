import * as XLSX from 'xlsx'
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BankParser, ParsedTransaction } from '@/types/parsers'
import { getPdfJs, getPdfConfig } from './pdf-config'

export const hdfcParser: BankParser = {
  bankName: 'HDFC Bank',
  supportedFormats: ['pdf', 'csv', 'xlsx'],
  detectFormat(fileName: string, _: Uint8Array): boolean {
    return fileName.toLowerCase().includes('hdfc')
  },
  async parse(buffer: ArrayBuffer, fileName: string): Promise<ParsedTransaction[]> {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return (this as any).parsePdf(buffer) // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    return (this as any).parseExcel(buffer) // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  async parsePdf(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
    const pdfjs = await getPdfJs()
    const data = new Uint8Array(buffer)
    try {
      const loadingTask = pdfjs.getDocument(await getPdfConfig(data))
      
      const pdf = await loadingTask.promise
      const transactions: ParsedTransaction[] = []
      
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
        
        for (const y of sortedY) {
          const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4])
          const lineText = lineItems.map(item => item.str).join(' ').trim()
          
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

          // HDFC PDF Date format: DD/MM/YY
          const dateMatch = lineText.match(/^(\d{2}\/\d{2}\/\d{2})\s+/)
          if (dateMatch) {
            const dateStr = dateMatch[1]
            const [dd, mm, yyShort] = dateStr.split('/')
            const dateIso = `20${yyShort}-${mm}-${dd}`
            
            let amount = 0
            let is_debit = false
            let balance = 0
            let description = ''
            
            lineItems.forEach(item => {
              const x = item.transform[4]
              const val = parseFloat(item.str.replace(/,/g, ''))
              
              if (isNaN(val)) {
                // Narration column
                if (narrationX && x >= narrationX && x < Math.min(withdrawalX || 999, depositX || 999)) {
                  description += ' ' + item.str
                } else if (!narrationX && x > 80 && x < 350) {
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
      return transactions
    } catch (error) {
      console.error('HDFC PDF Parse Error:', error)
      if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException') {
        throw new Error('This PDF is password protected. Please upload a decrypted version of your HDFC Bank statement.')
      }
      throw new Error(`Failed to parse HDFC PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async parseExcel(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false })
    
    const transactions: ParsedTransaction[] = []
    let dataStarted = false
    
    for (const row of data) {
      if (!row || row.length === 0) continue
      
      const firstCol = String(row[0] || '').trim()
      
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
    
    return transactions
  }
} as BankParser
