export interface ParsedTransaction {
  date: string          // ISO date "YYYY-MM-DD"
  amount: number        // always positive
  description: string   // raw description from statement
  is_debit: boolean     // true = money leaving account
  balance?: number      // running balance if available
}

export interface BankParser {
  bankName: string
  supportedFormats: ('pdf' | 'csv' | 'xlsx')[]
  parse(buffer: ArrayBuffer, fileName: string): Promise<ParsedTransaction[]>
  detectFormat(fileName: string, firstBytes: Uint8Array): boolean
}
