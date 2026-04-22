import * as XLSX from 'xlsx'
import { BankParser, ParsedTransaction } from '@/types/parsers'

export const hdfcParser: BankParser = {
  bankName: 'HDFC Bank',
  supportedFormats: ['csv', 'xlsx'],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  detectFormat(fileName: string, _firstBytes: Uint8Array): boolean {
    return fileName.toLowerCase().includes('hdfc')
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parse(buffer: ArrayBuffer, _fileName: string): Promise<ParsedTransaction[]> {
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
}
