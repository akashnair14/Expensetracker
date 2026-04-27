import * as XLSX from 'xlsx'
import { BankParser, ParsedTransaction, ParseResult } from '@/types/parsers'

export const sbiParser: BankParser = {
  bankName: 'SBI',
  supportedFormats: ['csv', 'xlsx'],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  detectFormat(fileName: string, _firstBytes: Uint8Array): boolean {
    return fileName.toLowerCase().includes('sbi')
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parse(buffer: ArrayBuffer, _fileName: string): Promise<ParseResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false })
    
    const transactions: ParsedTransaction[] = []
    let accountNumber = ''
    let dataStarted = false
    
    const months: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    
    for (const row of data) {
      if (!row || row.length === 0) continue
      
      const firstCol = String(row[0] || '').trim()

      if (!accountNumber) {
        const rowText = row.join(' ')
        const accMatch = rowText.match(/Account Number\s*:\s*(\d+)/i) || 
                        rowText.match(/Account No\s*:\s*(\d+)/i)
        if (accMatch) accountNumber = accMatch[1].slice(-4)
      }
      
      if (!dataStarted) {
        if (firstCol.toLowerCase().includes('txn date')) {
          dataStarted = true
        }
        continue
      }
      
      if (!firstCol || firstCol.toLowerCase().includes('balance') || firstCol.includes('*')) {
        continue
      }

      const dateMatch = firstCol.match(/(\d{1,2})[\s-]+([a-zA-Z]{3})[\s-]+(\d{2,4})/)
      if (!dateMatch) continue
      
      const [, dd, mmm, yyRaw] = dateMatch
      let yy = yyRaw
      if (yy.length === 2) yy = '20' + yy
      const mm = months[mmm] || '01'
      const dateIso = `${yy}-${mm}-${dd.padStart(2, '0')}`
      
      const description = String(row[2] || '').trim()
      const debitStr = String(row[4] || '').replace(/,/g, '').trim()
      const creditStr = String(row[5] || '').replace(/,/g, '').trim()
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
    
    return { transactions, accountNumber, bankName: 'SBI' }
  }
} satisfies BankParser
