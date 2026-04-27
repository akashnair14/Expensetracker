/**
 * Indian Bank Statement Narration Parser
 * Implements a hybrid approach: Regex -> Heuristics -> Normalization -> Categorization
 */

export type TransactionType = 'P2M' | 'P2A' | 'P2P' | 'IMPS' | 'NEFT' | 'RTGS' | 'OTHER';

export interface ParsedNarration {
  type: TransactionType;
  transaction_id: string | null;
  merchant_raw: string;
  merchant_clean: string;
  category: string;
  confidence: number;
}

const NOISE_KEYWORDS = [
  'PAID V', 'REM', 'PAYVIA', 'UPI/UPI', 'VPA', 'SETTLEMENT', 
  'ONLINE', 'MOBILE', 'BANK', 'TRANSFER', 'TRF', 'REFV', 'REF'
];

const BANK_NAMES = [
  'HDFC', 'SBI', 'ICICI', 'AXIS', 'YES BANK', 'KOTAK', 'BARODA', 'BOB',
  'STATE BANK OF INDIA', 'PUNJAB NATIONAL', 'CANARA', 'FEDERAL', 'IDFC',
  'INDUSIND', 'IDBI', 'UNION BANK', 'KOTAK MAHINDRA', 'BANK OF BARODA'
];

const MERCHANT_MAPPINGS: Record<string, string> = {
  'FLIPKART PAYMENTS': 'Flipkart',
  'AMAZON PAY INDIA': 'Amazon',
  'AMZN MKT': 'Amazon',
  'GROWW INVEST TECH': 'Groww',
  'ZERODHA BROKING': 'Zerodha',
  'ZOMATO LIMITED': 'Zomato',
  'SWIGGY BUNDL': 'Swiggy',
  'BLINKIT': 'Blinkit',
  'ZEPTO': 'Zepto',
  'PAYTM': 'Paytm',
  'PHONEPE': 'PhonePe',
  'GOOGLE PAY': 'Google Pay'
};

export function parseIndianNarration(narration: string): ParsedNarration {
  // STEP 1: PREPROCESSING
  const processed = narration
    .replace(/\s+/g, ' ')
    .replace(/Paid v\//gi, '')
    .replace(/\b(REM|Payvia|UPI\/UPI|VPA|NO REM)\b/gi, '')
    .trim();

  // STEP 2 & 3: STRUCTURE DETECTION & EXTRACTION
  // Look for UPI blocks: UPI/(P2M|P2A|P2P)/(ID)/(MERCHANT)
  const upiRegex = /UPI\/(P2M|P2A|P2P)\/(\d{10,})\/([^\/]+)/gi;
  const upiMatches = Array.from(processed.matchAll(upiRegex));
  
  if (upiMatches.length > 0) {
    // ALWAYS pick the LAST valid block (final receiver)
    const lastMatch = upiMatches[upiMatches.length - 1];
    const type = lastMatch[1] as 'P2M' | 'P2A' | 'P2P';
    const txnId = lastMatch[2];
    const rawMerchant = lastMatch[3].trim();
    
    return finalizeParsing(type, txnId, rawMerchant);
  }

  // Handle IMPS/NEFT
  const impsRegex = /(IMPS|NEFT|RTGS)\/(\d{10,})\/([^\/]+)/i;
  const impsMatch = processed.match(impsRegex);
  if (impsMatch) {
    return finalizeParsing(impsMatch[1].toUpperCase() as TransactionType, impsMatch[2], impsMatch[3]);
  }

  // Fallback for simple strings
  return finalizeParsing('OTHER', null, processed);
}

function finalizeParsing(type: TransactionType, txnId: string | null, raw: string): ParsedNarration {
  let merchant_raw = raw;
  let category = 'Other';
  let confidence = 0.5;

  // Filter out noise from merchant_raw
  NOISE_KEYWORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    merchant_raw = merchant_raw.replace(regex, '');
  });

  // Split and take first meaningful part
  const segments = merchant_raw.split('/').map(s => s.trim()).filter(s => s.length > 0);
  let candidate = segments[0] || raw;

  // Check against ignore list (Bank names etc)
  const isInvalid = (str: string) => {
    const upper = str.toUpperCase();
    return BANK_NAMES.some(bank => upper.includes(bank)) || 
           ['LIMITED', 'LTD', 'UPI', 'YBS', 'IFSC', 'BANK'].some(word => upper === word) ||
           str.length <= 1;
  };

  if (isInvalid(candidate)) {
    // Scan remaining segments
    const betterCandidate = segments.find(s => !isInvalid(s) && s.length > 3);
    if (betterCandidate) {
      candidate = betterCandidate;
      confidence = 0.7;
    }
  } else {
    confidence = 0.8;
  }

  // STEP 4: NORMALIZATION
  let merchant_clean = candidate.toUpperCase();
  
  // Apply specific mappings (Step 4)
  for (const [key, val] of Object.entries(MERCHANT_MAPPINGS)) {
    if (merchant_clean.includes(key)) {
      merchant_clean = val;
      confidence = 0.95;
      break;
    }
  }

  // General cleaning if not mapped
  if (confidence < 0.9) {
    merchant_clean = merchant_clean
      .replace(/\b(PRIVATE LIMITED|PVT LTD|LTD|LIMITED|P LIMITED)\b/gi, '')
      .replace(/\b(PAYMENTS|PAYMENT|SERVICES|DIGITAL|TECHNOLOGIES)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Title Case
    merchant_clean = merchant_clean.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // STEP 5: CATEGORY DETECTION (Strict Rules First)
  if (type === 'P2A' || type === 'P2P') {
    category = 'Transfer';
  } else {
    const m = merchant_clean.toUpperCase();
    const d = raw.toUpperCase();
    
    // Investment (Groww, Zerodha, Upstox, Angel)
    if (/\b(GROWW|ZERODHA|UPSTOX|ANGEL|INVEST|STOCK|MUTUAL|SIP|NISM|NSE|BSE)\b/.test(m) || /\b(GROWW|ZERODHA)\b/.test(d)) {
      category = 'Investment';
    }
    // Shopping (Flipkart, Amazon, Meesho, Myntra)
    else if (/\b(FLIPKART|AMAZON|MEESHO|MYNTRA|SHOP|AJIO|RETAIL|NYKAA)\b/.test(m) || /\b(FLIPKART|AMAZON)\b/.test(d)) {
      category = 'Shopping';
    }
    // Healthcare (Clinic, Hospital, Medical, Pharmacy)
    else if (/\b(CLINIC|HOSPITAL|MEDICAL|PHARMACY|DOCTOR|HEALTH|PATHLAB|DIAGNOSTIC)\b/.test(m) || /\b(CLINIC|HOSPITAL)\b/.test(d)) {
      category = 'Healthcare';
    }
    // Food (Zomato, Swiggy, Restaurant, Cafe)
    else if (/\b(ZOMATO|SWIGGY|RESTAU|CAFE|FOOD|EAT|BAKERY|SWEETS)\b/.test(m) || /\b(ZOMATO|SWIGGY)\b/.test(d)) {
      category = 'Food & Dining';
    }
    // Bills (Electricity, Gas, Recharge, Jio, Airtel)
    else if (/\b(ELECTRICITY|GAS|RECHARGE|JIO|AIRTEL|BILL|BESCOM|MSEB|PSPCL)\b/.test(m)) {
      category = 'Bills & Utilities';
    }
    // Transport
    else if (/\b(UBER|OLA|METRO|FUEL|PETROL|BPCL|HPCL|IOCL|FASTAG|RAILWAY|IRCTC)\b/.test(m)) {
      category = 'Transport';
    }
    else if (type === 'P2M') {
      category = 'Merchant Payment';
    }
  }

  // Final noise cleanup for merchant name
  merchant_clean = merchant_clean
    .replace(/\b(YBS|YBL|OKAXIS|OKHDFC|OKSBI|OKICICI)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    type,
    transaction_id: txnId,
    merchant_raw: candidate,
    merchant_clean,
    category,
    confidence
  };
}
