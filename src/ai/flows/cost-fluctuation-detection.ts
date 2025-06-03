// src/ai/flows/cost-fluctuation-detection.ts
'use server';

/**
 * @fileOverview Detects anomalous cost fluctuations outside expected ranges.
 *
 * - detectCostFluctuation - A function that handles the cost fluctuation detection process.
 * - CostFluctuationInput - The input type for the detectCostFluctuation function.
 * - CostFluctuationOutput - The return type for the detectCostFluctuation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CostFluctuationInputSchema = z.object({
  outlet: z.string().describe('The name of the outlet to analyze.'),
  date: z.string().describe('The date to analyze in YYYY-MM-DD format.'),
  foodCostPercentage: z
    .number()
    .describe('The food cost percentage for the outlet on the given date.'),
  beverageCostPercentage: z
    .number()
    .describe('The beverage cost percentage for the outlet on the given date.'),
  historicalFoodCostPercentages: z
    .array(z.number())
    .describe(
      'An array of historical food cost percentages for the outlet over the past month.'
    ),
  historicalBeverageCostPercentages: z
    .array(z.number())
    .describe(
      'An array of historical beverage cost percentages for the outlet over the past month.'
    ),
});
export type CostFluctuationInput = z.infer<typeof CostFluctuationInputSchema>;

const CostFluctuationOutputSchema = z.object({
  isAnomalous: z
    .boolean()
    .describe(
      'Whether the cost fluctuation is anomalous (true) or within the expected range (false).'
    ),
  explanation: z
    .string()
    .describe(
      'Explanation of why the cost fluctuation is anomalous or not, and potential reasons.'
    ),
});
export type CostFluctuationOutput = z.infer<typeof CostFluctuationOutputSchema>;

export async function detectCostFluctuation(
  input: CostFluctuationInput
): Promise<CostFluctuationOutput> {
  return costFluctuationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'costFluctuationPrompt',
  input: {schema: CostFluctuationInputSchema},
  output: {schema: CostFluctuationOutputSchema},
  prompt: `You are an expert in cost analysis, specializing in identifying anomalous cost fluctuations in the food and beverage industry.

You are provided with the current food and beverage cost percentages for a specific outlet on a given date, along with historical cost percentages for the past month.

Your task is to determine if the current cost percentages are anomalous, meaning they fall outside the expected range based on the historical data.

Outlet: {{outlet}}
Date: {{date}}
Food Cost Percentage: {{foodCostPercentage}}%
Beverage Cost Percentage: {{beverageCostPercentage}}%
Historical Food Cost Percentages: {{historicalFoodCostPercentages}}
Historical Beverage Cost Percentages: {{historicalBeverageCostPercentages}}

Consider factors such as seasonality, recent events, and overall trends when making your determination.

Based on your analysis, determine whether the cost fluctuation is anomalous and provide an explanation for your reasoning.

Output a JSON object with the following format:
{
  "isAnomalous": boolean, // true if the cost fluctuation is anomalous, false otherwise
  "explanation": string // Explanation of why the cost fluctuation is anomalous or not, and potential reasons
}
`,
});

const costFluctuationFlow = ai.defineFlow(
  {
    name: 'costFluctuationFlow',
    inputSchema: CostFluctuationInputSchema,
    outputSchema: CostFluctuationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
