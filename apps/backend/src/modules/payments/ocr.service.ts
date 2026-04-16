import { Injectable } from '@nestjs/common';

export interface OcrResult {
  extracted_amount: number | null;
  extracted_date: string | null;
  confidence: number;
  flagged: boolean;
  raw_text: string;
}

@Injectable()
export class OcrService {
  async extractFromReceipt(fileUrl: string): Promise<OcrResult> {
    // TODO: Integrate with Google Cloud Vision API
    // For now, return null values indicating manual entry required
    return {
      extracted_amount: null,
      extracted_date: null,
      confidence: 0,
      flagged: true,
      raw_text: '',
    };
  }

  // Amount extraction regex patterns for future use
  private readonly amountPatterns = [
    /AED\s?([\d,]+\.?\d{0,2})/i,
    /([\d,]+\.?\d{0,2})\s?د\.إ/,
    /([\d,]+\.?\d{0,2})\s?AED/i,
  ];

  // Date extraction regex patterns
  private readonly datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
  ];
}
