import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from '@/modules/payments/ocr.service';

// ─── Regex patterns mirrored from OcrService (private) ───────────────────────
// These duplicate the patterns defined in OcrService so we can unit-test the
// regex logic independently without exposing private members.

const amountPatterns = [
  /AED\s?([\d,]+\.?\d{0,2})/i,
  /([\d,]+\.?\d{0,2})\s?د\.إ/,
  /([\d,]+\.?\d{0,2})\s?AED/i,
];

const datePatterns = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
];

// ─── Helper: try all patterns and return first match group ────────────────────
function matchAmount(text: string): string | null {
  for (const pattern of amountPatterns) {
    const m = text.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function matchDate(text: string): RegExpMatchArray | null {
  for (const pattern of datePatterns) {
    const m = text.match(pattern);
    if (m) return m;
  }
  return null;
}

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OcrService],
    }).compile();

    service = module.get<OcrService>(OcrService);
  });

  // ─── extractFromReceipt (current stub implementation) ─────────────────────

  describe('extractFromReceipt', () => {
    it('returns null extracted_amount (current stub implementation)', async () => {
      const result = await service.extractFromReceipt('https://example.com/receipt.jpg');
      expect(result.extracted_amount).toBeNull();
    });

    it('returns null extracted_date (current stub implementation)', async () => {
      const result = await service.extractFromReceipt('https://example.com/receipt.jpg');
      expect(result.extracted_date).toBeNull();
    });

    it('returns confidence of 0 (current stub implementation)', async () => {
      const result = await service.extractFromReceipt('https://example.com/receipt.jpg');
      expect(result.confidence).toBe(0);
    });

    it('returns flagged=true (current stub implementation)', async () => {
      const result = await service.extractFromReceipt('https://example.com/receipt.jpg');
      expect(result.flagged).toBe(true);
    });

    it('returns raw_text as empty string (current stub implementation)', async () => {
      const result = await service.extractFromReceipt('https://example.com/receipt.jpg');
      expect(result.raw_text).toBe('');
    });
  });

  // ─── Amount regex patterns ─────────────────────────────────────────────────

  describe('amount regex patterns', () => {
    it('matches "AED 5,000.00" and extracts the numeric value', () => {
      const text = 'Total: AED 5,000.00';
      const match = matchAmount(text);
      expect(match).toBe('5,000.00');
    });

    it('matches "AED5000" without a space', () => {
      const text = 'Amount: AED5000';
      const match = matchAmount(text);
      expect(match).toBe('5000');
    });

    it('matches "5,000.00 د.إ" (Arabic currency suffix)', () => {
      const text = 'المبلغ: 5,000.00 د.إ';
      const match = matchAmount(text);
      expect(match).toBe('5,000.00');
    });

    it('matches "1500.50 AED" (amount before AED)', () => {
      const text = 'Paid: 1500.50 AED';
      const match = matchAmount(text);
      expect(match).toBe('1500.50');
    });

    it('returns null when no amount pattern is present', () => {
      const text = 'Receipt #12345 — no amount listed';
      const match = matchAmount(text);
      expect(match).toBeNull();
    });
  });

  // ─── Date regex patterns ───────────────────────────────────────────────────

  describe('date regex patterns', () => {
    it('matches "15/03/2026" (DD/MM/YYYY format)', () => {
      const text = 'Date: 15/03/2026';
      const match = matchDate(text);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('15');
      expect(match![2]).toBe('03');
      expect(match![3]).toBe('2026');
    });

    it('matches "15-03-2026" (DD-MM-YYYY format)', () => {
      const text = 'Issued: 15-03-2026';
      const match = matchDate(text);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('15');
      expect(match![2]).toBe('03');
      expect(match![3]).toBe('2026');
    });

    it('matches "1/3/26" (short DD/M/YY format)', () => {
      const text = '1/3/26';
      const match = matchDate(text);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('1');
      expect(match![2]).toBe('3');
      expect(match![3]).toBe('26');
    });

    it('returns null when no date pattern is present', () => {
      const text = 'No date in this receipt text';
      const match = matchDate(text);
      expect(match).toBeNull();
    });
  });
});
