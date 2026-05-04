import { pool } from "../../config/db";

export interface OnboardingData {
  income_sources: { name: string; amount: number }[];
  credit_cards: { name: string; limit: number; spendCap: number }[];
  total_income: number;
  savings_goal: number;
  onboarded_at: string | null;
}

export async function getOnboardingData(
  userId: string,
  userEmail: string,
): Promise<OnboardingData | null> {
  // First, ensure user exists in users table
  try {
    await pool.query(
      `INSERT INTO users (id, email) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [userId, userEmail],
    );
  } catch (error) {
    console.error("[onboarding] Failed to ensure user exists:", error);
  }

  const result = await pool.query(
    `SELECT income_sources, credit_cards, total_income, savings_goal, onboarded_at
     FROM users WHERE id = $1`,
    [userId],
  );

  console.log("[onboarding] Query result rowCount:", result.rowCount);

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    income_sources: row.income_sources || [],
    credit_cards: row.credit_cards || [],
    total_income: Number(row.total_income || 0),
    savings_goal: Number(row.savings_goal || 0),
    onboarded_at: row.onboarded_at || null,
  };
}

export async function saveOnboardingData(
  userId: string,
  userEmail: string,
  data: Omit<OnboardingData, "onboarded_at">,
): Promise<void> {
  // Ensure user exists in users table
  await pool.query(
    `INSERT INTO users (id, email) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [userId, userEmail],
  );

  await pool.query(
    `UPDATE users
     SET income_sources = $1,
         credit_cards = $2,
         total_income = $3,
         savings_goal = $4,
         onboarded_at = NOW()
     WHERE id = $5`,
    [
      JSON.stringify(data.income_sources),
      JSON.stringify(data.credit_cards),
      data.total_income,
      data.savings_goal,
      userId,
    ],
  );
}

export async function updateOnboardingData(
  userId: string,
  data: Partial<Omit<OnboardingData, "onboarded_at">>,
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.income_sources !== undefined) {
    updates.push(`income_sources = $${paramIndex}`);
    values.push(JSON.stringify(data.income_sources));
    paramIndex++;
  }

  if (data.credit_cards !== undefined) {
    updates.push(`credit_cards = $${paramIndex}`);
    values.push(JSON.stringify(data.credit_cards));
    paramIndex++;
  }

  if (data.total_income !== undefined) {
    updates.push(`total_income = $${paramIndex}`);
    values.push(data.total_income);
    paramIndex++;
  }

  if (data.savings_goal !== undefined) {
    updates.push(`savings_goal = $${paramIndex}`);
    values.push(data.savings_goal);
    paramIndex++;
  }

  if (updates.length === 0) return;

  values.push(userId);
  await pool.query(
    `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    values,
  );
}
