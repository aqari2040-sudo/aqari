export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, string[]>;
}

export interface DuplicateDetectionResponse {
  duplicate_detected: boolean;
  existing_requests: {
    id: string;
    category_name: string;
    unit_number: string;
    created_at: string;
    status: string;
    description: string;
  }[];
  requires_override: boolean;
  message: string;
}

export interface BudgetCheckResponse {
  budget_exceeded: boolean;
  suspicious_cost: boolean;
  budget: number;
  spent: number;
  new_total: number;
  unit_average: number | null;
}

export interface OcrResult {
  ocr_extracted_amount: number | null;
  ocr_extracted_date: string | null;
  ocr_confidence: number;
  ocr_flagged: boolean;
  raw_text: string;
}
