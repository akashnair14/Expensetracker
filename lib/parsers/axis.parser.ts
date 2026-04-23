/* eslint-disable @typescript-eslint/no-unused-vars */
import { BankParser, ParsedTransaction } from '@/types/parsers'
import { getPdfJs, getPdfConfig } from './pdf-config'

export const axisParser: BankParser = {
  bankName: 'Axis Bank',
  supportedFormats: ['pdf'],
  detectFormat(fileName: string, _: Uint8Array): boolean {
    return fileName.toLowerCase().includes('axis')
  },
  async parse(buffer: ArrayBuffer, _: string): Promise<ParsedTransaction[]> {
    const pdfjs = await getPdfJs()
    const data = new Uint8Array(buffer)

    try {
      const loadingTask = pdfjs.getDocument(await getPdfConfig(data))
      const pdf = await loadingTask.promise
      const transactions: ParsedTransaction[] = []



      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const items = textContent.items as Array<{ str: string; transform: number[] }>

        // Group items into lines by their Y coordinate (rounded to nearest 2px)
        const linesMap: Record<number, Array<{ str: string; transform: number[] }>> = {}
        for (const item of items) {
          const y = Math.round(item.transform[5] / 2) * 2
          if (!linesMap[y]) linesMap[y] = []
          linesMap[y].push(item)
        }

        // Sort lines top-to-bottom (PDF Y is bottom-up, so highest Y = top of page)
        const sortedYs = Object.keys(linesMap)
          .map(Number)
          .sort((a, b) => b - a)

        for (const y of sortedYs) {
          const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4])
          const lineText = lineItems.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim()

          // Skip empty lines and headers
          if (!lineText || lineText.length < 5) continue

          // Axis Bank date formats: DD-MM-YYYY or DD/MM/YYYY
          const dateMatch = lineText.match(/^(\d{2}[-/]\d{2}[-/]\d{4})/)
          if (!dateMatch) continue

          const rawDate = dateMatch[1]
          const sep = rawDate.includes('-') ? '-' : '/'
          const [dd, mm, yyyy] = rawDate.split(sep)
          const dateIso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`



          // Extract all numbers from the line (skip the date itself)
          const restOfLine = lineText.slice(dateMatch[0].length).trim()
          
          // Find all currency amounts (numbers with optional commas and decimals)
          const amounts = Array.from(restOfLine.matchAll(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g))
            .map(m => parseFloat(m[1].replace(/,/g, '')))
            .filter(n => !isNaN(n) && n > 0)

          if (amounts.length === 0) continue

          // Extract description: text between date and first number
          const firstNumIdx = restOfLine.search(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?/)
          const description = firstNumIdx > 0
            ? restOfLine.slice(0, firstNumIdx).trim()
            : restOfLine.replace(/[\d,\.]+/g, ' ').trim()

          // Axis format: Description | Debit | Credit | Balance
          // If 3+ numbers: [debit or credit, balance] or [debit, credit, balance]
          let amount = 0
          let is_debit = false
          let balance: number | undefined

          if (amounts.length >= 3) {
            // [chq/ref?, debit, credit, balance] - take last 3
            const last3 = amounts.slice(-3)
            const debitAmt = last3[0]
            const creditAmt = last3[1]
            balance = last3[2]
            if (debitAmt > 0 && creditAmt === 0) {
              amount = debitAmt; is_debit = true
            } else if (creditAmt > 0 && debitAmt === 0) {
              amount = creditAmt; is_debit = false
            } else {
              // Fallback: use first nonzero as debit
              amount = debitAmt || creditAmt
              is_debit = !!debitAmt
            }
          } else if (amounts.length === 2) {
            // [txn_amount, balance]
            amount = amounts[0]
            balance = amounts[1]
            // Determine debit/credit from context keywords
            const lower = restOfLine.toLowerCase()
            is_debit = !lower.includes('credit') && !lower.includes('cr ')
          } else {
            // Single amount
            amount = amounts[0]
            const lower = restOfLine.toLowerCase()
            is_debit = !lower.includes('cr') && !lower.includes('credit')
          }

          if (amount > 0) {
            const finalDescription = description || `Transaction on ${dateIso}`

            transactions.push({
              date: dateIso,
              amount: Math.abs(amount),
              description: finalDescription,
              is_debit,
              balance
            })
          }
        }
      }


      return transactions

    } catch (error) {
      console.error('[AxisParser] PDF Parse Error:', error)
      if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException') {
        throw new Error('This PDF is password protected. Please upload a decrypted version of your Axis Bank statement.')
      }
      throw new Error(`Failed to parse Axis PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
