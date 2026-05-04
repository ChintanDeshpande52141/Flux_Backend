import { pool } from '../../config/db';
import { z } from 'zod';

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1),
  subtitle: z.string().optional(),
  amount: z.number().positive(),
  billingCycle: z.enum(['monthly', 'yearly']),
  nextBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1),
  badge: z.enum(['Auto', 'Fixed', 'Elite', 'Manual']).nullable().optional(),
  logoInitial: z.string().max(1).optional(),
  logoColor: z.string().optional(),
});

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial();

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;

function toMonthly(amount: number, cycle: string): number {
  return cycle === 'yearly' ? amount / 12 : amount;
}

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    amount: Number(row.amount),
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    category: row.category,
    badge: row.badge,
    logoInitial: row.logo_initial,
    logoColor: row.logo_color,
  };
}

export async function getSubscriptions(userId: string) {
  const result = await pool.query(
    `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  const rows = result.rows;

  const totalMonthly = rows.reduce(
    (sum: number, r: Record<string, unknown>) => sum + toMonthly(Number(r.amount), r.billing_cycle as string),
    0
  );

  const dailyImpact = totalMonthly / 30;

  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);

  const upcomingCount = rows.filter((r: Record<string, unknown>) => {
    const d = new Date(r.next_billing_date as string);
    return d >= now && d <= sevenDaysLater;
  }).length;

  const categoryMap: Record<string, ReturnType<typeof mapRow>[]> = {};
  for (const row of rows) {
    const cat = (row.category as string).toUpperCase();
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(mapRow(row as Record<string, unknown>));
  }

  const categories = Object.entries(categoryMap).map(([label, items]) => ({ label, items }));

  return {
    totalMonthly: Math.round(totalMonthly * 100) / 100,
    dailyImpact: Math.round(dailyImpact * 100) / 100,
    upcomingCount,
    categories,
  };
}

export async function createSubscription(userId: string, input: CreateSubscriptionInput) {
  const result = await pool.query(
    `INSERT INTO subscriptions
      (user_id, name, subtitle, amount, billing_cycle, next_billing_date, category, badge, logo_initial, logo_color)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      userId,
      input.name,
      input.subtitle ?? null,
      input.amount,
      input.billingCycle,
      input.nextBillingDate,
      input.category,
      input.badge ?? null,
      input.logoInitial ?? null,
      input.logoColor ?? null,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function updateSubscription(
  userId: string,
  id: string,
  input: UpdateSubscriptionInput
) {
  const check = await pool.query(
    'SELECT id FROM subscriptions WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (check.rowCount === 0) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    subtitle: 'subtitle',
    amount: 'amount',
    billingCycle: 'billing_cycle',
    nextBillingDate: 'next_billing_date',
    category: 'category',
    badge: 'badge',
    logoInitial: 'logo_initial',
    logoColor: 'logo_color',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input) {
      fields.push(`${col} = $${idx}`);
      values.push((input as Record<string, unknown>)[key]);
      idx++;
    }
  }

  if (fields.length === 0) return null;

  values.push(id, userId);
  const result = await pool.query(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
    values
  );
  return mapRow(result.rows[0]);
}

export async function deleteSubscription(userId: string, id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
