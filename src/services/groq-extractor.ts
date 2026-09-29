/**
 * Groq Structured Clinical Extraction Service
 * SERVER-SIDE ONLY.
 * 
 * Extracts structured clinical parameters (dose compliance, timing delay,
 * adverse events/symptoms, concomitant medications, distress scores) from raw
 * patient natural language check-in reports using Groq LLM + Zod validation.
 */

import { getGroqClient, GROQ_DEFAULT_MODEL } from '@/lib/groq';
import {
  CheckInExtractionSchema,
  CheckInExtraction,
} from '@/lib/schemas/checkin-extraction';

export interface ExtractionResult {
  data: CheckInExtraction;
  mode: 'live' | 'heuristic_fallback';
  rawResponse?: string;
}

function calculateDelayMinutes(timeStr?: string, targetTime: string = '08:00'): number {
  if (!timeStr) return 0;
  // Match HH:MM or H:MM AM/PM
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + minutes;
  const targetMinutes = 8 * 60; // 08:00 AM target
  return Math.max(0, totalMinutes - targetMinutes);
}

/**
 * Heuristic fallback parser for offline dev/tests or when Groq is unavailable.
 */
export function heuristicExtractCheckIn(rawText: string): CheckInExtraction {
  const textLower = rawText.toLowerCase();

  // 1. Dose taken
  const skipKeywords = ['skipped', "didn't take", 'did not take', 'missed', 'refused', 'forgot'];
  const doseTaken = !skipKeywords.some((kw) => textLower.includes(kw));

  // 2. Time extraction & delay
  let doseTimestamp: string | null = null;
  const timeMatch = rawText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{1,2}\s*(?:AM|PM))/i);
  if (timeMatch && doseTaken) {
    doseTimestamp = timeMatch[0];
  }
  const doseDelayMinutes = doseTaken ? calculateDelayMinutes(doseTimestamp ?? undefined) : 0;

  // 3. Symptoms extraction
  const symptoms: CheckInExtraction['symptoms'] = [];
  if (textLower.includes('vomit') || textLower.includes('threw up')) {
    const isSevere = textLower.includes('severe') || textLower.includes('moderate');
    symptoms.push({
      name: 'vomiting',
      severity: isSevere ? 'moderate' : 'mild',
      resolved: false,
    });
  }
  if (textLower.includes('nausea') || textLower.includes('nauseous')) {
    const isModerate = textLower.includes('moderate');
    symptoms.push({
      name: 'nausea',
      severity: isModerate ? 'moderate' : 'mild',
      resolved: false,
    });
  }
  if (textLower.includes('fever')) {
    const isSevere = textLower.includes('severe') || textLower.includes('high') || textLower.includes('39');
    symptoms.push({
      name: 'fever',
      severity: isSevere ? 'severe' : 'moderate',
      resolved: false,
    });
  }
  if (textLower.includes('headache')) {
    symptoms.push({
      name: 'headache',
      severity: 'mild',
      resolved: false,
    });
  }
  if (textLower.includes('dizzy') || textLower.includes('dizziness')) {
    symptoms.push({
      name: 'dizziness',
      severity: 'moderate',
      resolved: false,
    });
  }

  // 4. Concomitant meds extraction
  const concomitantMedications: CheckInExtraction['concomitantMedications'] = [];
  const medKeywords = ['ibuprofen', 'aspirin', 'naproxen', 'tylenol', 'paracetamol', 'antiemetic'];
  for (const med of medKeywords) {
    if (textLower.includes(med)) {
      concomitantMedications.push({
        name: med,
        reason: 'symptom relief',
      });
    }
  }

  // 5. Distress score heuristic
  let distressScore = 0;
  if (!doseTaken) distressScore += 4;
  distressScore += symptoms.length * 2;
  if (symptoms.some((s) => s.severity === 'severe' || s.severity === 'life_threatening')) {
    distressScore += 3;
  }
  distressScore = Math.min(10, Math.max(0, distressScore));

  return {
    doseTaken,
    doseTimestamp,
    doseDelayMinutes,
    symptoms,
    concomitantMedications,
    distressScore,
    additionalNotes: `Heuristic extracted from: "${rawText.slice(0, 80)}"`,
  };
}

/**
 * Extract structured clinical parameters from a patient check-in message.
 */
export async function extractCheckInData(
  rawText: string,
  options?: { targetTimeOfDay?: string }
): Promise<ExtractionResult> {
  const isGroqConfigured = Boolean(process.env.GROQ_API_KEY);

  if (!isGroqConfigured) {
    return {
      data: heuristicExtractCheckIn(rawText),
      mode: 'heuristic_fallback',
    };
  }

  try {
    const groq = getGroqClient();

    const systemPrompt = `You are a clinical trial NLP extractor specializing in patient check-in reports.
Extract the patient report into a valid JSON object strictly matching this schema:
{
  "doseTaken": boolean (true if patient took trial medication, false if skipped/missed/refused),
  "doseTimestamp": string or null (e.g. "08:15 AM" or ISO timestamp),
  "doseDelayMinutes": number (estimated minutes delay relative to target ${options?.targetTimeOfDay ?? '08:00 AM'}),
  "symptoms": [
    {
      "name": string (e.g. "nausea", "vomiting", "fever", "headache"),
      "severity": "mild" | "moderate" | "severe" | "life_threatening",
      "onsetTimestamp": string (optional),
      "durationHours": number (optional),
      "resolved": boolean
    }
  ],
  "concomitantMedications": [
    {
      "name": string (e.g. "ibuprofen", "aspirin", "tylenol"),
      "dose": string (optional, e.g. "400mg"),
      "frequency": string (optional),
      "reason": string (optional)
    }
  ],
  "distressScore": number (0 to 10 subjective patient distress level),
  "additionalNotes": string (optional clinical summary)
}

IMPORTANT: Reply ONLY with valid JSON. No markdown codeblocks, no extra explanations.`;

    const completion = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const parsedJson = JSON.parse(content);
    const validatedData = CheckInExtractionSchema.parse(parsedJson);

    return {
      data: validatedData,
      mode: 'live',
      rawResponse: content,
    };
  } catch (error) {
    console.warn('[groq-extractor] Live extraction error, falling back to heuristic:', error instanceof Error ? error.message : error);
    return {
      data: heuristicExtractCheckIn(rawText),
      mode: 'heuristic_fallback',
    };
  }
}
