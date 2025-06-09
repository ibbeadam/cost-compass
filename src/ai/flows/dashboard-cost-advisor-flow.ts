
// src/ai/flows/dashboard-cost-advisor-flow.ts
'use server';
/**
 * @fileOverview Provides AI-driven cost advisory based on dashboard financial data.
 *
 * - analyzeDashboardData - A function that handles the cost analysis and advice generation.
 * - DashboardAdvisorInput - The input type for the analyzeDashboardData function.
 * - DashboardAdvisorOutput - The return type for the analyzeDashboardData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DashboardAdvisorInputSchema = z.object({
  numberOfDays: z.number().describe('The number of days in the selected period.'),
  totalFoodRevenue: z.number().describe('Total food revenue for the period.'),
  budgetFoodCostPct: z.number().describe('Budgeted food cost percentage for the period.'),
  actualFoodCostPct: z.number().describe('Actual average food cost percentage for the period.'),
  totalBeverageRevenue: z.number().describe('Total beverage revenue for the period.'),
  budgetBeverageCostPct: z.number().describe('Budgeted beverage cost percentage for the period.'),
  actualBeverageCostPct: z.number().describe('Actual average beverage cost percentage for the period.'),
});
export type DashboardAdvisorInput = z.infer<typeof DashboardAdvisorInputSchema>;

const DashboardAdvisorOutputSchema = z.object({
  dailySpendingGuidelineFood: z.string().describe('Guideline for daily spending on food to meet budget.'),
  dailySpendingGuidelineBeverage: z.string().describe('Guideline for daily spending on beverage to meet budget.'),
  foodCostAnalysis: z.string().describe('Analysis of food cost performance against budget, including monetary impact.'),
  beverageCostAnalysis: z.string().describe('Analysis of beverage cost performance against budget, including monetary impact.'),
  keyInsights: z.array(z.string()).describe('A list of 2-3 key insights from the financial data.'),
  recommendations: z.array(z.string()).describe('A list of 3-4 actionable recommendations for cost control.'),
});
export type DashboardAdvisorOutput = z.infer<typeof DashboardAdvisorOutputSchema>;

export async function analyzeDashboardData(
  input: DashboardAdvisorInput
): Promise<DashboardAdvisorOutput> {
  return dashboardCostAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dashboardCostAdvisorPrompt',
  input: {schema: DashboardAdvisorInputSchema},
  output: {schema: DashboardAdvisorOutputSchema},
  prompt: `You are a financial advisor for a hotel. Analyze the following financial data for a given period:
- Number of days in period: {{numberOfDays}}
- Total Food Revenue: \${{totalFoodRevenue}}
- Actual Average Food Cost Percentage: {{actualFoodCostPct}}%
- Budget Food Cost Percentage: {{budgetFoodCostPct}}%
- Total Beverage Revenue: \${{totalBeverageRevenue}}
- Actual Average Beverage Cost Percentage: {{actualBeverageCostPct}}%
- Budget Beverage Cost Percentage: {{budgetBeverageCostPct}}%

Based on this:
1.  Calculate the target daily food spending: (Total Food Revenue * Budget Food Cost Percentage / 100) / Number of Days.
    Format the result as a string: "Target daily food spending: $X.XX".
    Assign this to 'dailySpendingGuidelineFood'.

2.  Calculate the target daily beverage spending: (Total Beverage Revenue * Budget Beverage Cost Percentage / 100) / Number of Days.
    Format the result as a string: "Target daily beverage spending: $Y.YY".
    Assign this to 'dailySpendingGuidelineBeverage'.

3.  For 'foodCostAnalysis':
    Compare Actual Food Cost Percentage to Budget Food Cost Percentage.
    State if it's over or under budget and by how many percentage points (actual - budget).
    Calculate the monetary impact: Total Food Revenue * (Actual Food Cost Percentage - Budget Food Cost Percentage) / 100.
    Example: "Food cost (A%) is B% over/under budget (C%). Potential overspend/saving: $Z.ZZ."

4.  For 'beverageCostAnalysis':
    Perform a similar analysis for beverage costs.
    Example: "Beverage cost (D%) is E% over/under budget (F%). Potential overspend/saving: $W.WW."

5.  For 'keyInsights':
    Provide 2-3 bullet points summarizing the most important findings. These should be concise observations.
    Example: "- Significant overspending observed in food costs for the period.", "- Beverage costs are well-managed and under budget."

6.  For 'recommendations':
    Provide 3-4 actionable bullet points to help control costs and align with the budget.
    Focus on practical advice such as supplier negotiation, waste reduction, menu engineering, portion control, or staff training.

Ensure all monetary values in your analysis strings are formatted to two decimal places (e.g., $123.45).
The output must be a JSON object adhering to the DashboardAdvisorOutputSchema.
`,
});

const dashboardCostAdvisorFlow = ai.defineFlow(
  {
    name: 'dashboardCostAdvisorFlow',
    inputSchema: DashboardAdvisorInputSchema,
    outputSchema: DashboardAdvisorOutputSchema,
  },
  async input => {
    // Minor pre-calculation for clarity if needed, or let the LLM handle it based on prompt.
    // For robustness, if the LLM struggles with direct calculation in the prompt,
    // you could calculate daily targets here and pass them as part of the input.
    // However, the current prompt asks the LLM to do the calculation.

    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate an analysis.");
    }
    return output;
  }
);
