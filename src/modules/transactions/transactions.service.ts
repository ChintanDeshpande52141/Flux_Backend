import { pool } from '../../config/db';
import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  merchant: z.string().min(1),
  category: z.enum(['Food', 'Transport', 'Shopping', 'Entertainment', 'Others']),
  amount: z.number().positive(),
  paymentType: z.enum(['UPI', 'Cash', 'Credit', 'Debit']),
  transactedAt: z.string().datetime(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

function buildPeriodClause(
  period: string,
  start?: string,
  end?: string
): { clause: string; params: string[] } {
  const now = new Date();
  const params: string[] = [];

  if (period === 'Today') {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    params.push(todayStart.toISOString());
    return { clause: `transacted_at >= $PARAM`, params };
  }

  if (period === 'This Week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    params.push(weekStart.toISOString());
    return { clause: `transacted_at >= $PARAM`, params };
  }

  if (period === 'This Month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    params.push(monthStart.toISOString());
    return { clause: `transacted_at >= $PARAM`, params };
  }

  if (period === 'Custom' && start && end) {
    const startDt = new Date(`${start}T00:00:00.000Z`).toISOString();
    const endDt = new Date(`${end}T23:59:59.999Z`).toISOString();
    params.push(startDt, endDt);
    return { clause: `transacted_at BETWEEN $PARAM AND $PARAM2`, params };
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  params.push(monthStart.toISOString());
  return { clause: `transacted_at >= $PARAM`, params };
}

export async function getTransactions(
  userId: string,
  period: string,
  paymentTypes: string,
  categories: string,
  start?: string,
  end?: string
) {
  const values: unknown[] = [userId];
  let idx = 2;
  const conditions: string[] = ['user_id = $1'];

  const { params: periodParams } = buildPeriodClause(period, start, end);

  if (period === 'Custom' && start && end) {
    const startDt = new Date(`${start}T00:00:00.000Z`).toISOString();
    const endDt = new Date(`${end}T23:59:59.999Z`).toISOString();
    conditions.push(`transacted_at BETWEEN $${idx} AND $${idx + 1}`);
    values.push(startDt, endDt);
    idx += 2;
  } else if (periodParams.length > 0) {
    const periodStart = periodParams[0];
    conditions.push(`transacted_at >= $${idx}`);
    values.push(periodStart);
    idx++;
  }

  if (paymentTypes && paymentTypes !== 'All') {
    const types = paymentTypes.split(',').map((t) => t.trim());
    conditions.push(`payment_type = ANY($${idx})`);
    values.push(types);
    idx++;
  }

  if (categories && categories !== 'All') {
    const cats = categories.split(',').map((c) => c.trim());
    conditions.push(`category = ANY($${idx})`);
    values.push(cats);
    idx++;
  }

  const query = `
    SELECT id, merchant, category, amount, payment_type, transacted_at
    FROM transactions
    WHERE ${conditions.join(' AND ')}
    ORDER BY transacted_at DESC
  `;

  const result = await pool.query(query, values);

  return result.rows.map((row) => ({
    id: row.id,
    merchant: row.merchant,
    category: row.category,
    amount: Number(row.amount),
    paymentType: row.payment_type,
    transactedAt: row.transacted_at,
  }));
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const result = await pool.query(
    `INSERT INTO transactions (user_id, merchant, category, amount, payment_type, transacted_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, merchant, category, amount, payment_type, transacted_at`,
    [userId, input.merchant, input.category, input.amount, input.paymentType, input.transactedAt]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    merchant: row.merchant,
    category: row.category,
    amount: Number(row.amount),
    paymentType: row.payment_type,
    transactedAt: row.transacted_at,
  };
}
