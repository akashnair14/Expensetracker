/* eslint-disable @typescript-eslint/no-unused-vars */
import { BankParser, ParsedTransaction, ParseResult } from '@/types/parsers'
import { getPdfJs, getPdfConfig } from './pdf-config'

export const axisParser: BankParser = {
  bankName: 'Axis Bank',
  supportedFormats: ['pdf'],
  detectFormat(fileName: string, _: Uint8Array): boolean {
    return fileName.toLowerCase().includes('axis')
  },
  async parse(buffer: ArrayBuffer, _: string): Promise<ParseResult> {
    const pdfjs = await getPdfJs()
    const data = new Uint8Array(buffer)

    try {
      const loadingTask = pdfjs.getDocument(await getPdfConfig(data))
      const pdf = await loadingTask.promise
      const transactions: ParsedTransaction[] = []
      let accountNumber = ''
      let lastBalance: number | undefined = undefined;

      let debitX: number | undefined
      let creditX: number | undefined
      let balanceX: number | undefined

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const items = textContent.items as Array<{ str: string; transform: number[] }>

        // Find headers on each page (sometimes layout shifts slightly)
        for (const item of items) {
          const text = item.str.trim().toLowerCase()
          const x = item.transform[4]
          
          if (text.includes('debit') || text.includes('withdrawal') || text.includes('amt(dr)')) {
            debitX = x
          } else if (text.includes('credit') || text.includes('deposit') || text.includes('amt(cr)')) {
            creditX = x
          } else if (text.includes('balance')) {
            balanceX = x
          }
        }

        // Group items into lines by their Y coordinate (rounded to nearest 2px)
        const linesMap: Record<number, Array<{ str: string; transform: number[]; x: number }>> = {}
        for (const item of items) {
          const y = Math.round(item.transform[5] / 2) * 2
          if (!linesMap[y]) linesMap[y] = []
          linesMap[y].push({ ...item, x: item.transform[4] })
        }

        // Sort lines top-to-bottom
        const sortedYs = Object.keys(linesMap)
          .map(Number)
          .sort((a, b) => b - a)

        for (let i = 0; i < sortedYs.length; i++) {
          const y = sortedYs[i]
          const lineItems = linesMap[y].sort((a, b) => a.x - b.x)
          const lineText = lineItems.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim()

          if (!lineText || lineText.length < 5) continue

          // Account number extraction
          if (pageNum === 1 && !accountNumber) {
            const accMatch = lineText.match(/Account No\s*:\s*(\d+)/i) || 
                            lineText.match(/A\/C No\s*:\s*(\d+)/i) ||
                            lineText.match(/Customer ID\s*:\s*(\d+)/i)
            if (accMatch) accountNumber = accMatch[1].slice(-4)
          }

          // Detect opening balance
          if (lineText.toUpperCase().includes('OPENING BALANCE')) {
             const nums = Array.from(lineText.matchAll(/(?:\s|^)(\d{1,3}(?:,\d{3})*\.\d{2})(?=\s|$)/g))
                .map(m => parseFloat(m[1].replace(/,/g, '')))
             if (nums.length > 0) {
                lastBalance = nums[nums.length - 1]
             }
             continue
          }

          const dateMatch = lineText.match(/^(\d{2}[-/]\d{2}[-/](?:\d{4}|\d{2}))(?=\s|$)/)
          
          if (dateMatch) {
            const rawDate = dateMatch[1]
            const sep = rawDate.includes('-') ? '-' : '/'
            const [dd, mm, yyRaw] = rawDate.split(sep)
            const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw
            const dateIso = `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`

            // Extract amount items
            const amountItems = lineItems.filter(item => {
              const str = item.str.trim().replace(/,/g, '')
              return /^\d+\.\d{2}$/.test(str) && parseFloat(str) > 0
            })

            // Initial description from the same line
            const firstAmountX = amountItems.length > 0 ? amountItems[0].x : 9999
            let description = lineItems
              .filter(item => item.x < firstAmountX && item.x > 80) // Skip date column
              .map(item => item.str)
              .join(' ')
              .trim()

            // Look ahead for multi-line description
            let j = i + 1
            while (j < sortedYs.length) {
              const nextLineItems = linesMap[sortedYs[j]].sort((a, b) => a.x - b.x)
              const nextLineText = nextLineItems.map(item => item.str).join(' ').trim()
              
              // If next line has a date or any amount, it's a new transaction
              const hasDate = nextLineText.match(/^(\d{2}[-/]\d{2}[-/](?:\d{4}|\d{2}))/)
              const hasAmount = nextLineItems.some(item => {
                const s = item.str.trim().replace(/,/g, '')
                return /^\d+\.\d{2}$/.test(s) && parseFloat(s) > 0
              })

              if (hasDate || hasAmount || nextLineText.toUpperCase().includes('TOTAL') || nextLineText.toUpperCase().includes('BALANCE')) break

              // Append to description if it falls within the description column range
              const extraDesc = nextLineItems
                .filter(item => item.x < firstAmountX && item.x > 80)
                .map(item => item.str)
                .join(' ')
                .trim()
              
              if (extraDesc) {
                description += ' ' + extraDesc
              }
              j++
            }

            let amount = 0
            let is_debit = false
            let balance: number | undefined

            if (amountItems.length > 0) {
              if (debitX !== undefined && creditX !== undefined) {
                const tolerance = 25
                const debitItem = amountItems.find(item => Math.abs(item.x - debitX!) < tolerance)
                const creditItem = amountItems.find(item => Math.abs(item.x - creditX!) < tolerance)
                const balanceItem = amountItems.find(item => Math.abs(item.x - (balanceX || 9999)) < tolerance) || amountItems[amountItems.length - 1]

                if (debitItem) {
                  amount = parseFloat(debitItem.str.replace(/,/g, ''))
                  is_debit = true
                } else if (creditItem) {
                  amount = parseFloat(creditItem.str.replace(/,/g, ''))
                  is_debit = false
                }
                if (balanceItem) balance = parseFloat(balanceItem.str.replace(/,/g, ''))
              }

              // Mathematical fallback
              if (amount === 0 && amountItems.length >= 2) {
                amount = parseFloat(amountItems[0].str.replace(/,/g, ''))
                balance = parseFloat(amountItems[amountItems.length - 1].str.replace(/,/g, ''))
                if (lastBalance !== undefined) {
                  if (Math.abs(lastBalance - amount - balance) < 0.1) is_debit = true
                  else if (Math.abs(lastBalance + amount - balance) < 0.1) is_debit = false
                }
              }

              if (balance !== undefined) lastBalance = balance

              if (amount > 0) {
                transactions.push({
                  date: dateIso,
                  amount,
                  description: description.replace(/\s+/g, ' ').trim(),
                  is_debit,
                  balance
                })
              }
            }
          }
        }
      }

      return { transactions, accountNumber, bankName: 'Axis Bank' }

    } catch (error) {
      console.error('[AxisParser] PDF Parse Error:', error)
      if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException') {
        throw new Error('This PDF is password protected. Please upload a decrypted version of your Axis Bank statement.')
      }
      throw new Error(`Failed to parse Axis PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
} satisfies BankParser
