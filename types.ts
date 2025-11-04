
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  nextDueDate: string;
  endDate?: string;
}

export interface Budget {
    id: string;
    categoryId: string;
    limit: number;
    period: 'monthly';
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    targetDate?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Investment {
  id: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  isFetchingPrice?: boolean;
}

export enum GeminiModel {
  FLASH_LITE = 'gemini-flash-lite-latest',
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-2.5-pro'
}

export interface ChatMessage {
  role: 'user' | 'model' | 'tool';
  parts: { text: string }[];
  groundingChunks?: any[];
  tool_calls?: any[];
  tool_responses?: any[];
}

export type ChatMode = 'quick' | 'search' | 'thinking' | 'actions';

export type ChatHistories = {
  [key in ChatMode]?: ChatMessage[];
};

export interface User {
    email: string;
    password: string;
}