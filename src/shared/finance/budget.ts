import { round2 } from "./money";

export interface CalculateBudgetInput {
  totalIncome: number;
  savingsGoal: number;
  totalMonthlyBills: number;
  asOfDate: Date;
}

export interface CalculateBudgetResult {
  monthBudget: number;
  weekBudget: number;
  dailyLimit: number;
  yearBudget: number;
}

function daysInMonth(asOfDate: Date): number {
  return new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 0).getDate();
}

export function calculateBudget(input: CalculateBudgetInput): CalculateBudgetResult {
  const { totalIncome, savingsGoal, totalMonthlyBills, asOfDate } = input;

  const monthBudget = round2(Math.max(0, totalIncome - savingsGoal - totalMonthlyBills));
  const dailyLimit = round2(monthBudget / daysInMonth(asOfDate));
  const weekBudget = round2(dailyLimit * 7);
  const yearBudget = round2(monthBudget * 12);

  return { monthBudget, weekBudget, dailyLimit, yearBudget };
}
