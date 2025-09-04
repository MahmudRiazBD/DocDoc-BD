
'use server';

/**
 * @fileOverview AI tool to auto-generate certificate data based on specific rules.
 *
 * - generateCertificateData - A function that generates certificate data.
 * - CertificateDataInput - The input type for the generateCertificateData function.
 * - CertificateDataOutput - The return type for the generateCertificateData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const BD_TIME_ZONE = 'Asia/Dhaka';

const CertificateDataInputSchema = z.object({
  age: z.number().describe('Age of the certificate applicant.'),
  date: z
    .string()
    .describe('The current date for generating the certificate in ISO format.'),
});
export type CertificateDataInput = z.infer<typeof CertificateDataInputSchema>;

const CertificateDataOutputSchema = z.object({
  class: z.string().describe('The class of the applicant, determined by age.'),
  roll: z.number().describe('A random roll number for the applicant.'),
  certificateDate: z
    .string()
    .describe('The date of the certificate (15 days prior to the input date).'),
  sessionYear: z
    .string()
    .describe('The session year for the certificate, derived from the certificate date.'),
});
export type CertificateDataOutput = z.infer<typeof CertificateDataOutputSchema>;

// This exported function is what the application will call.
export async function generateCertificateData(
  input: CertificateDataInput
): Promise<CertificateDataOutput> {
  // The certificate date is deterministic, so we calculate it here instead of in the prompt.
  const certificateDate = subDays(new Date(input.date), 15);
  
  // Call the Genkit flow with the required inputs.
  const result = await generateCertificateDataFlow({ age: input.age });
  
  // Return the combined result.
  return {
    ...result,
    certificateDate: formatInTimeZone(certificateDate, BD_TIME_ZONE, 'yyyy-MM-dd'),
    sessionYear: result.sessionYear,
  };
}

// Define the schema for the AI prompt's input, which is simpler now.
const PromptInputSchema = z.object({
  age: z.number().describe('Age of the certificate applicant.'),
});

// Define the schema for what we expect the AI to output.
const PromptOutputSchema = z.object({
  class: z.string().describe('The class of the applicant, determined by age.'),
  roll: z.number().describe('A random roll number for the applicant.'),
  sessionYear: z
    .string()
    .describe("The session year, calculated based on the applicant's age and class relative to the current year."),
});


const prompt = ai.definePrompt({
  name: 'certificateDataPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: PromptOutputSchema},
  prompt: `You are an AI assistant specialized in generating academic certificate data for students based on a set of specific rules.

Given the applicant's age, generate the following information:

- **class**: Determine the student's class based on their age using the following rules.
  - Age 6-9: Class 1 (If age is in this range, they should be in Class 1)
  - Age 10: Class 2
  - Age 11: Class 3
  - Age 12: Class 4
  - Age 13: Class 5
  - Age 14: Class 6
  - Age 15: Class 7
  - Age 16: Class 8
  - Age 17 or older: Class 9
  - **IMPORTANT RULE:** The maximum possible class is Class 9. If the applicant's age is 17 or older, you MUST set the class to 'Class 9'. For any other age not listed, make a reasonable estimation but do not exceed Class 9.

- **roll**: Generate a random integer roll number between 11 and 99.

- **sessionYear**: Derive the session year based on the applicant's age, class, and the current year. The session year should be a single year (e.g., 'YYYY').
  - The current year is ${new Date().getFullYear()}.
  - For example, if a 17-year-old student is getting a certificate in 2024 for Class 9, the session year should be 2024.
  - If a 19-year-old student is getting a certificate in 2024 for Class 9, they would have been in Class 9 two years ago (19-17=2). So, the session year should be 2022 (2024-2).
  - If an 8-year-old student is getting a certificate in 2024 for Class 1, they would have been in Class 1 two years ago (8-6=2). So the session year should be 2022 (2024-2). The base age for Class 1 is 6.

Applicant Age: {{{age}}}

Ensure the output is accurate and strictly follows the rules. Output the data in JSON format.
`,
});

// Define the Genkit flow that executes the prompt.
const generateCertificateDataFlow = ai.defineFlow(
  {
    name: 'generateCertificateDataFlow',
    inputSchema: PromptInputSchema,
    outputSchema: PromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    
