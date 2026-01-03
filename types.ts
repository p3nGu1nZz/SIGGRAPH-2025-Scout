export interface Paper {
  id: string;
  title: string;
  authors: string;
  summary: string;
  url: string;
  tags: string[];
  createdAt: number; // Timestamp for sorting
  fullAnalysis?: string; // Content for the markdown report
  citation?: string; // The formal citation string
  doi?: string; // Digital Object Identifier
  verification?: {
    isVerified: boolean;
    sourceUrl?: string;
    foundTitle?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  DETAIL = 'DETAIL',
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  query: string;
}