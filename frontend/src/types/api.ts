export interface User {
  id: number;
  email: string;
  full_name: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string | null;
  currency?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: "checking" | "savings" | "cash" | "credit_card" | "wallet";
  balance: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  name: string;
  type: "checking" | "savings" | "cash" | "credit_card" | "wallet";
  currency?: string;
  balance?: string;
}

export interface AccountUpdate {
  name?: string;
  type?: "checking" | "savings" | "cash" | "credit_card" | "wallet";
  currency?: string;
  is_active?: boolean;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  kind: "income" | "expense";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  kind: "income" | "expense";
}

export interface CategoryUpdate {
  name?: string;
  kind?: "income" | "expense";
}

export interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  category_id: number | null;
  kind: "income" | "expense";
  amount: string;
  note: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionCreate {
  account_id: number;
  category_id?: number | null;
  kind: "income" | "expense";
  amount: string;
  note?: string | null;
  occurred_at: string;
}

export interface TransactionUpdate {
  account_id?: number;
  category_id?: number | null;
  kind?: "income" | "expense";
  amount?: string;
  note?: string | null;
  occurred_at?: string;
}

export interface TransactionList {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  year: number;
  month: number;
  limit_amount: string;
  category_name: string | null;
  spent: string;
  remaining: string;
  percentage: string;
  is_exceeded: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  year: number;
  month: number;
  total_balance: string;
  month_income: string;
  month_expense: string;
  net: string;
}

export interface CategoryBreakdownItem {
  category_id: number | null;
  category_name: string;
  total: string;
  percentage: string;
  transaction_count: number;
}

export interface TrendPoint {
  year: number;
  month: number;
  income: string;
  expense: string;
}

export interface DashboardOverview {
  summary: DashboardSummary;
  top_categories: CategoryBreakdownItem[];
  trend: TrendPoint[];
  recent_transactions: Transaction[];
  generated_at: string;
}

export interface MonthComparison {
  current_year: number;
  current_month: number;
  current_income: string;
  current_expense: string;
  previous_year: number;
  previous_month: number;
  previous_income: string;
  previous_expense: string;
  income_change_pct: string | null;
  expense_change_pct: string | null;
}

export interface CategoryTrendPoint {
  year: number;
  month: number;
  total: string;
  transaction_count: number;
}

export interface CategoryTrend {
  category_id: number;
  category_name: string;
  kind: string;
  points: CategoryTrendPoint[];
  total: string;
}

export interface AccountSpend {
  account_id: number;
  account_name: string;
  total_expense: string;
  total_income: string;
  transaction_count: number;
}

export interface WeekdayHeatmapItem {
  weekday: number;
  weekday_name: string;
  total_expense: string;
  total_income: string;
  transaction_count: number;
}

export interface Receipt {
  id: number;
  user_id: number;
  transaction_id: number | null;
  original_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Document {
  id: number;
  original_name: string;
  content_type: string;
  size_bytes: number;
  page_count: number | null;
  status: "pending" | "ready" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSource {
  document_id: number;
  document_name: string;
  chunk_index: number;
  excerpt: string;
}

export interface ChatRequest {
  message: string;
  document_id?: number | null;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}
