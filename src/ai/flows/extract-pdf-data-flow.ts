'use server';

/**
 * @fileOverview AI flow to extract structured data from a PDF file.
 * It first tries to parse the data using regex and falls back to an AI model if parsing fails.
 *
 * - extractPdfData - The main function to call for extracting data.
 * - PdfInput - The input type for the flow.
 * - ExtractedPdfData - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define input and output schemas
const PdfInputSchema = z.object({
  pdfDataUri: z.string().describe("A PDF file as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."),
});
export type PdfInput = z.infer<typeof PdfInputSchema>;

const ExtractedPdfDataSchema = z.object({
  application_no: z.string().optional().describe('আবেদন পত্র নম্বর'),
  applicant_name_en: z.string().optional().describe('Name in English (Capital Letters)'),
  applicant_name_bn: z.string().optional().describe('নাম বাংলায় (স্পষ্ট অক্ষরে)'),
  dob: z.string().optional().describe('জন্ম তারিখ (dd/mm/yyyy)'),
  father_name_en: z.string().optional().describe("Father's name in English (Capital Letters)"),
  father_name_bn: z.string().optional().describe('পিতার নাম বাংলায় (স্পষ্ট অক্ষরে)'),
  mother_name_bn: z.string().optional().describe('মাতার নাম বাংলায় (স্পষ্ট অক্ষরে)'),
});
export type ExtractedPdfData = z.infer<typeof ExtractedPdfDataSchema>;


// Rate limiting (simple in-memory implementation)
const requestTimestamps: number[] = [];
const RATE_LIMIT_COUNT = 10; // Max 10 AI calls
const RATE_LIMIT_WINDOW = 60 * 1000; // per minute

const checkRateLimit = () => {  
  const now = Date.now();
  // Remove timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_COUNT) {
    throw new Error("AI মডেলের 호출 সীমা অতিক্রম করেছে। অনুগ্রহ করে এক মিনিট পরে আবার চেষ্টা করুন।");
  }
  requestTimestamps.push(now);
};


// Local parser using Regex
const localParse = (text: string): Partial<ExtractedPdfData> => {
    const extract = (regex: RegExp) => (regex.exec(text)?.[1] || '').trim() || undefined;

    const data: Partial<ExtractedPdfData> = {
        application_no: extract(/আবেদন পত্র নম্বরঃ\s*([^\n\r]+)/),
        applicant_name_bn: extract(/নাম বাংলায় \(স্পষ্ট অক্ষরে\):\s*([^\n\r]+)/),
        applicant_name_en: extract(/Name in English \(Capital Letters\):\s*([^\n\r]+)/),
        dob: extract(/জন্ম তারিখ:\s*([^\n\r]+)/),
        father_name_bn: extract(/পিতার নাম বাংলায় \(স্পষ্ট অক্ষরে\):\s*([^\n\r]+)/),
        father_name_en: extract(/Father's name in English \(Capital Letters\):\s*([^\n\r]+)/),
        mother_name_bn: extract(/মাতার নাম বাংলায় \(স্পষ্ট অক্ষরে\):\s*([^\n\r]+)/),
    };
    
    // Return data only if at least one field was found
    return Object.values(data).some(v => v !== undefined) ? data : {};
};


// Genkit prompt for AI fallback
const extractionPrompt = ai.definePrompt({
    name: 'pdfExtractionPrompt',
    input: { schema: z.object({ text: z.string() }) },
    output: { schema: ExtractedPdfDataSchema },
    prompt: `You are an expert data extraction tool. Extract the following fields from the text provided, which is from a PDF document. The field names to look for are in Bengali and English. Provide the data in a structured JSON format.

Fields to extract:
- আবেদন পত্র নম্বরঃ
- নাম বাংলায় (স্পষ্ট অক্ষরে)
- Name in English (Capital Letters)
- জন্ম তারিখ
- পিতার নাম বাংলায় (স্পষ্ট অক্ষরে)
- Father's name in English (Capital Letters)
- মাতার নাম বাংলায় (স্পষ্ট অক্ষরে)

Text to analyze:
{{{text}}}
`,
});


// Main exported function
export async function extractPdfData(input: PdfInput): Promise<ExtractedPdfData> {
  const base64Data = input.pdfDataUri.split(';base64,').pop();
  if (!base64Data) {
    throw new Error('Invalid PDF data URI.');
  }
  const pdfBuffer = Buffer.from(base64Data, 'base64');
  
  // Use eval('require') to avoid webpack bundling issues with pdf-parse
  const pdf = eval('require')('pdf-parse');

  // Extract text from the first page only
  const data = await pdf(pdfBuffer, { max: 1 });
  const text = data.text;

  // 1. Try local parsing first
  const localResult = localParse(text);
  
  const requiredFields: (keyof ExtractedPdfData)[] = ['applicant_name_bn', 'dob'];
  const hasAllRequired = requiredFields.every(field => localResult[field]);

  if (hasAllRequired) {
    return localResult as ExtractedPdfData;
  }

  // 2. If local parsing fails, fall back to AI
  console.log("Local parsing failed, falling back to AI model.");
  checkRateLimit(); // Check rate limit before calling AI

  const { output } = await extractionPrompt({ text });
  
  if (!output) {
      throw new Error("AI মডেল ডেটা এক্সট্র্যাক্ট করতে ব্যর্থ হয়েছে।");
  }

  return output;
}
