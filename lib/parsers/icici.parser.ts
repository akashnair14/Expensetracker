import * as XLSX from 'xlsx'
import { BankParser, ParsedTransaction } from '@/types/parsers'

export const iciciParser: BankParser = {
  bankName: 'ICICI Bank',
  supportedFormats: ['csv', 'xlsx'],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  detectFormat(fileName: string, _firstBytes: Uint8Array): boolean {
    return fileName.toLowerCase().includes('icici')
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
        if (firstCol.toLowerCase().includes('transaction date') || firstCol.toLowerCase() === 'date') {
          dataStarted = true
        }
        continue
      }
      
      if (!firstCol || firstCol.toLowerCase().includes('opening') || firstCol.toLowerCase().includes('closing') || firstCol.toLowerCase().includes('balance')) {
        continue
      }

      const dateParts = firstCol.split('/')
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
    
    return transactions
  }
}
