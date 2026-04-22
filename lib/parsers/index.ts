import { BankParser, ParsedTransaction } from '@/types/parsers'
import { hdfcParser } from './hdfc.parser'
import { sbiParser } from './sbi.parser'
import { iciciParser } from './icici.parser'

export const parsers: BankParser[] = [hdfcParser, sbiParser, iciciParser]

export async function parseStatement(
  file: File,
  bankName?: string
): Promise<ParsedTransaction[]> {
  const buffer = await file.arrayBuffer()
  const firstBytes = new Uint8Array(buffer.slice(0, 100))
  
  const parser = bankName 
    ? parsers.find(p => p.bankName === bankName)
    : parsers.find(p => p.detectFormat(file.name, firstBytes))
    
  if (!parser) throw new Error(`Unsupported bank format: ${file.name}`)
  
  const transactions = await parser.parse(buffer, file.name)
  if (transactions.length === 0) throw new Error('No transactions found in file')
  return transactions
}
