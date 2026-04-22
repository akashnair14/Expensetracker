export interface Transaction {
  id: string;
  account_id: string;
  user_id: string;
  date: string;
  amount: number;
  description: string;
  merchant?: string;
  category: string;
  is_debit: boolean;
  is_flagged: boolean;
  notes?: string;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  bank_name: string;
  account_label: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string;
}

export interface Report {
  id: string;
  user_id: string;
  month: string;
  content: string;
  summary_json: any;
  created_at: string;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  topCategories: CategorySummary[];
}
