
'use server';

/**
 * @fileOverview AI flow to extract structured data from a PDF file.
 * It uses an AI model to parse the data.
 *
 * - extractPdfData - The main function to call for extracting data.
 * - PdfInput - The input type for the flow.
 * - ExtractedPdfData - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';


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


// Genkit prompt for AI fallback
const extractionPrompt = ai.definePrompt({
    name: 'pdfExtractionPrompt',
    input: { schema: z.object({ text: z.string() }) },
    output: { schema: ExtractedPdfDataSchema },
    prompt: `You are an expert data extraction tool. From the provided text extracted from a PDF document, please extract the values for the following fields. The field names to look for are in Bengali and English. Provide the data in a structured JSON format.

Fields to extract:
- "আবেদন পত্র নম্বরঃ"
- "নাম বাংলায় (স্পষ্ট অক্ষরে)"
- "Name in English (Capital Letters)"
- "জন্ম তারিখ"
- "পিতার নাম বাংলায় (স্পষ্ট অক্ষরে)"
- "Father's name in English (Capital Letters)"
- "মাতার নাম বাংলায় (স্পষ্ট অক্ষরে)"

Important Rules:
1.  Extract the value that immediately follows the label, even if it is on a different line.
2.  Clean the extracted value, removing any extra newlines or trailing spaces.
3.  The value for a field is typically contained within a visual table cell in the PDF, so stop extracting for a field when the logical content of that cell ends.

Text to analyze:
{{{text}}}
`,
});


// Main exported function
export async function extractPdfData(input: PdfInput): Promise<ExtractedPdfData> {
  // Dynamically import pdf-parse ONLY on the server-side when this function is called.
  const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
  
  const base64Data = input.pdfDataUri.split(';base64,').pop();
  if (!base64Data) {
    throw new Error('Invalid PDF data URI.');
  }
  const pdfBuffer = Buffer.from(base64Data, 'base64');
  
  const data = await pdf(pdfBuffer, { max: 1 });
  const text = data.text;

  checkRateLimit();

  const { output } = await extractionPrompt({ text });
  
  if (!output) {
      throw new Error("AI মডেল ডেটা এক্সট্র্যাক্ট করতে ব্যর্থ হয়েছে।");
  }

  return output;
}
