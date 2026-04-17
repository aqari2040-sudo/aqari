import { Injectable } from '@nestjs/common';

@Injectable()
export class ContractScannerService {
  async scanContract(imageUrl: string, lang?: string): Promise<{
    extracted: {
      tenant_name?: string;
      tenant_name_ar?: string;
      unit_number?: string;
      start_date?: string;
      end_date?: string;
      rent_amount?: number;
      payment_frequency?: string;
      grace_period_days?: number;
    };
    confidence: number;
    raw_text: string;
  }> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        extracted: {},
        confidence: 0,
        raw_text: 'AI scanning requires GROQ_API_KEY',
      };
    }

    try {
      // Use Groq with llama-3.2-90b-vision-preview for image understanding
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey });

      const response = await groq.chat.completions.create({
        model: 'llama-3.2-90b-vision-preview',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are analyzing a UAE real estate rental contract. Extract the following fields from this contract image. Return ONLY a JSON object with these exact keys (use null for fields you cannot find):

{
  "tenant_name": "tenant's full name in English",
  "tenant_name_ar": "tenant's full name in Arabic",
  "unit_number": "unit or property reference number",
  "start_date": "contract start date in YYYY-MM-DD format",
  "end_date": "contract end date in YYYY-MM-DD format",
  "rent_amount": 5000,
  "payment_frequency": "monthly or quarterly or yearly",
  "grace_period_days": 7,
  "confidence": 0.85
}

Return ONLY the JSON, no other text.`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content ?? '{}';

      // Parse JSON from response
      let parsed: any = {};
      try {
        // Extract JSON from response (might have markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsed = {};
      }

      const confidence = parsed.confidence || 0.5;
      delete parsed.confidence;

      return {
        extracted: {
          tenant_name: parsed.tenant_name || undefined,
          tenant_name_ar: parsed.tenant_name_ar || undefined,
          unit_number: parsed.unit_number || undefined,
          start_date: parsed.start_date || undefined,
          end_date: parsed.end_date || undefined,
          rent_amount: parsed.rent_amount ? Number(parsed.rent_amount) : undefined,
          payment_frequency: parsed.payment_frequency || undefined,
          grace_period_days: parsed.grace_period_days ? Number(parsed.grace_period_days) : undefined,
        },
        confidence,
        raw_text: content,
      };
    } catch (error: any) {
      return {
        extracted: {},
        confidence: 0,
        raw_text: `Scan failed: ${error.message}`,
      };
    }
  }
}
