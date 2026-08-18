import { pool } from '../../config/db';
import { round2 } from '../../shared/finance/money';

export interface CreateExpenseData {
  amount: number;
  description: string;
  category: 'Food' | 'Transport' | 'Shopping' | 'Entertainment' | 'Others';
  paymentType: 'UPI' | 'Cash' | 'Credit' | 'Debit';
  isRecurring: boolean;
}

export async function createExpense(
  userId: string,
  expense: CreateExpenseData
) {
  const now = new Date().toISOString();

  if (expense.isRecurring) {
    // Create subscription for recurring expenses
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    const nextDate = nextBillingDate.toISOString().slice(0, 10);

    const result = await pool.query(
      `
      INSERT INTO subscriptions
      (
        user_id,
        name,
        subtitle,
        amount,
        billing_cycle,
        next_billing_date,
        category,
        badge,
        logo_initial,
        logo_color
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        'monthly',
        $5,
        $6,
        'Auto',
        $7,
        '#6366F1'
      )
      RETURNING id, name, amount
      `,
      [
        userId,
        expense.description,
        expense.category,
        expense.amount,
        nextDate,
        expense.category,
        expense.description.charAt(0).toUpperCase(),
      ]
    );

    return {
      type: 'subscription',
      ...result.rows[0],
    };
  } else {
    // Create one-time transaction
    const result = await pool.query(
      `
      INSERT INTO transactions
      (
        user_id,
        merchant,
        category,
        amount,
        payment_type,
        transacted_at
      )
      VALUES
      ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        merchant,
        category,
        amount,
        payment_type,
        transacted_at
      `,
      [
        userId,
        expense.description,
        expense.category,
        round2(expense.amount),
        expense.paymentType,
        now,
      ]
    );

    const row = result.rows[0];
    return {
      type: 'transaction',
      id: row.id,
      merchant: row.merchant,
      category: row.category,
      amount: Number(row.amount),
      paymentType: row.payment_type,
      transactedAt: row.transacted_at,
    };
  }
}

export async function getExpenses(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  category?: string
) {
  let query = `
    SELECT 
      id,
      merchant,
      category,
      amount,
      payment_type,
      transacted_at,
      'transaction' as type
    FROM transactions
    WHERE user_id = $1
  `;
  
  const params: any[] = [userId];
  let paramIndex = 2;

  if (category) {
    query += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  query += `
    ORDER BY transacted_at DESC
    LIMIT $${paramIndex}
  `;
  params.push(limit);
  paramIndex++;

  if (offset > 0) {
    query += ` OFFSET $${paramIndex}`;
    params.push(offset);
  }

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    merchant: row.merchant,
    category: row.category,
    amount: Number(row.amount),
    paymentType: row.payment_type,
    transactedAt: row.transacted_at,
    type: row.type,
  }));
}
