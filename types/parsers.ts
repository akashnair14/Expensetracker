export interface ParsedTransaction {
  date: string          // ISO date "YYYY-MM-DD"
  amount: number        // always positive
  description: string   // raw description from statement
  is_debit: boolean     // true = money leaving account
  balance?: number      // running balance if available
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  accountNumber?: string
  accountHolder?: string
  bankName?: string
}

export interface BankParser {
  bankName: string
  supportedFormats: ('pdf' | 'csv' | 'xlsx')[]
  parse(buffer: ArrayBuffer, fileName: string): Promise<ParseResult>
  detectFormat(fileName: string, firstBytes: Uint8Array): boolean
}
