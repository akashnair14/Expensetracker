import { BankParser, ParseResult } from '@/types/parsers'
import { hdfcParser } from './hdfc.parser'
import { sbiParser } from './sbi.parser'
import { iciciParser } from './icici.parser'
import { axisParser } from './axis.parser'

export const parsers: BankParser[] = [hdfcParser, sbiParser, iciciParser, axisParser]

export async function parseStatement(
  file: File,
  bankName?: string
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const firstBytes = new Uint8Array(buffer.slice(0, 100))
  
  const parser = bankName && bankName !== 'Other'
    ? parsers.find(p => p.bankName === bankName)
    : parsers.find(p => p.detectFormat(file.name, firstBytes))
    
  if (!parser) throw new Error(`Unsupported bank format: ${file.name}. Please select the bank manually or contact support.`)
  
  const result = await parser.parse(buffer, file.name)
  if (result.transactions.length === 0) throw new Error('No transactions found in file')
  return result
}
