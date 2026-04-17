import { Injectable, Logger } from '@nestjs/common';

export interface OcrResult {
  extracted_amount: number | null;
  extracted_date: string | null;
  confidence: number;
  flagged: boolean;
  raw_text: string;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractFromReceipt(fileUrl: string): Promise<OcrResult> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY not set — falling back to manual entry');
      return {
        extracted_amount: null,
        extracted_date: null,
        confidence: 0,
        flagged: true,
        raw_text: 'AI scanning requires GROQ_API_KEY',
      };
    }

    try {
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey });

      const response = await groq.chat.completions.create({
        model: 'llama-3.2-90b-vision-preview',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are analyzing a UAE bank transfer receipt or payment slip. Extract the payment amount and date.

Return ONLY a JSON object with these exact keys:
{
  "amount": 5000.00,
  "date": "2026-04-15",
  "currency": "AED",
  "confidence": 0.92,
  "bank_name": "ENBD",
  "reference_number": "TRF123456"
}

Rules:
- amount: the transfer/payment amount as a number (no currency symbol)
- date: in YYYY-MM-DD format
- confidence: 0-1 how confident you are in the extraction
- bank_name: the bank name if visible (null if not)
- reference_number: transaction reference if visible (null if not)
- Return ONLY the JSON, no other text`,
              },
              {
                type: 'image_url',
                image_url: { url: fileUrl },
              },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content ?? '{}';
      this.logger.log(`OCR raw response: ${content}`);

      // Parse JSON from response
      let parsed: any = {};
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        this.logger.warn('Failed to parse OCR JSON response');
      }

      const amount = parsed.amount ? Number(parsed.amount) : null;
      const date = parsed.date || null;
      const confidence = parsed.confidence ? Number(parsed.confidence) : 0.5;
      const flagged = confidence < 0.7;

      const rawParts = [];
      if (parsed.bank_name) rawParts.push(`Bank: ${parsed.bank_name}`);
      if (parsed.reference_number) rawParts.push(`Ref: ${parsed.reference_number}`);
      if (parsed.currency) rawParts.push(`Currency: ${parsed.currency}`);

      return {
        extracted_amount: amount,
        extracted_date: date,
        confidence,
        flagged,
        raw_text: rawParts.length > 0 ? rawParts.join(' | ') : content,
      };
    } catch (error: any) {
      this.logger.error(`OCR scan failed: ${error.message}`);
      return {
        extracted_amount: null,
        extracted_date: null,
        confidence: 0,
        flagged: true,
        raw_text: `Scan failed: ${error.message}`,
      };
    }
  }
}
