import { pool } from "../../config/db";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#00BAE5",
  Transport: "#6366F1",
  Shopping: "#F59E0B",
  Entertainment: "#10B981",
  Others: "#9CA3AF",
};

const CATEGORY_LABELS: Record<string, string> = {
  Food: "Food & Dining",
  Transport: "Transportation",
  Shopping: "Shopping",
  Entertainment: "Entertainment",
  Others: "Others",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() - offset + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

export async function getSafeToSpend(
  userId: string,
  period: "weekly" | "monthly" | "yearly" = "monthly",
) {
  // Always derive live from users + subscriptions to stay in sync with any changes
  const [userResult, subsResult] = await Promise.all([
    pool.query("SELECT total_income, savings_goal FROM users WHERE id = $1", [
      userId,
    ]),
    pool.query(
      `SELECT COALESCE(SUM(
         CASE WHEN billing_cycle = 'yearly' THEN amount / 12.0 ELSE amount END
       ), 0) AS total_monthly
       FROM subscriptions WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const totalIncome = Number(userResult.rows[0]?.total_income ?? 0);
  const savingsGoal = Number(userResult.rows[0]?.savings_goal ?? 0);
  const totalMonthlyBills = Number(subsResult.rows[0]?.total_monthly ?? 0);

  const monthBudget = Math.max(
    0,
    totalIncome - savingsGoal - totalMonthlyBills,
  );
  const weekBudget = Math.round(monthBudget / 4);
  let dailyLimit = Math.round((monthBudget / 30) * 100) / 100;

  let budget: number;
  let start: Date;
  let periodLabel: string;

  if (period === "weekly") {
    const { start: wStart } = getCurrentWeekRange();
    budget = weekBudget;
    start = wStart;
    periodLabel = "this week";
  } else if (period === "yearly") {
    const now = new Date();
    start = new Date(now);
    start.setFullYear(now.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);
    budget = Math.round(dailyLimit * 365);
    periodLabel = "last 12 months";
  } else {
    const { start: mStart } = getMonthRange();
    budget = monthBudget;
    start = mStart;
    periodLabel = "this month";
  }

  const spendResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE user_id = $1 AND transacted_at >= $2`,
    [userId, start.toISOString()],
  );

  const spent = Number(spendResult.rows[0].total);
  const amount = budget - spent;

  // Calculate daily limit dynamically if not set
  if (dailyLimit === 0 && period === "monthly") {
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const daysRemaining = daysInMonth - now.getDate() + 1;
    dailyLimit = daysRemaining > 0 ? Math.round(amount / daysRemaining) : 0;
  }

  return {
    amount: Math.round(amount * 100) / 100,
    currency: "INR",
    period: periodLabel,
    dailyLimit,
  };
}

export async function getSpendingVelocity(userId: string) {
  const { start: thisStart } = getMonthRange();
  const { start: lastStart, end: lastEnd } = getMonthRange(1);

  const budgetResult = await pool.query(
    "SELECT month_budget FROM user_budgets WHERE user_id = $1",
    [userId],
  );
  const monthBudget = Number(budgetResult.rows[0]?.month_budget ?? 0);

  const thisResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE user_id = $1 AND transacted_at >= $2`,
    [userId, thisStart.toISOString()],
  );

  const lastResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE user_id = $1 AND transacted_at BETWEEN $2 AND $3`,
    [userId, lastStart.toISOString(), lastEnd.toISOString()],
  );

  const thisSpent = Number(thisResult.rows[0].total);
  const lastSpent = Number(lastResult.rows[0].total);

  const rate =
    monthBudget > 0 ? Math.round((thisSpent / monthBudget) * 100) : 0;
  const lastRate =
    monthBudget > 0 ? Math.round((lastSpent / monthBudget) * 100) : 0;
  const trend = rate >= lastRate ? "up" : "down";
  const percentChange =
    lastRate > 0
      ? Math.abs(Math.round(((rate - lastRate) / lastRate) * 100))
      : 0;

  let tip = "You're on track. Keep it up!";
  if (rate > 80)
    tip = "High spending velocity! Consider cutting discretionary expenses.";
  else if (rate > 60)
    tip = "Your velocity is moderate. Try reducing dining out.";
  else if (rate < 30)
    tip = "Great job! You're well within your budget this month.";

  return { rate, target: 80, trend, percentChange, tip };
}

export async function getCreditHealth(userId: string) {
  const result = await pool.query(
    `SELECT score, status, change FROM credit_health
     WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
    [userId],
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  return { score: row.score, status: row.status, change: row.change };
}

export async function getSpendingPulse(
  userId: string,
  period: "weekly" | "monthly" | "yearly" = "weekly",
) {
  if (period === "monthly") {
    const { start, end } = getMonthRange();
    const daysInMonth = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
    ).getDate();

    const result = await pool.query(
      `SELECT DATE(transacted_at) AS day, COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND transacted_at BETWEEN $2 AND $3
       GROUP BY day`,
      [userId, start.toISOString(), end.toISOString()],
    );

    const dayMap: Record<string, number> = {};
    for (const row of result.rows) {
      const d = new Date(row.day);
      const iso = d.toISOString().slice(0, 10);
      dayMap[iso] = Number(row.total);
    }

    const entries: { label: string; value: number }[] = [];
    for (let i = 0; i < daysInMonth; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), i + 1);
      const iso = d.toISOString().slice(0, 10);
      entries.push({ label: String(i + 1), value: dayMap[iso] ?? 0 });
    }

    const total = entries.reduce((s, e) => s + e.value, 0);
    return { entries, total };
  } else if (period === "yearly") {
    const entries: { label: string; value: number }[] = [];
    let total = 0;

    for (let i = 11; i >= 0; i--) {
      const { start: mStart, end: mEnd } = getMonthRange(i);
      const result = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE user_id = $1 AND transacted_at BETWEEN $2 AND $3`,
        [userId, mStart.toISOString(), mEnd.toISOString()],
      );
      const label = mStart.toLocaleString("default", { month: "short" });
      const value = Math.round(Number(result.rows[0].total));
      entries.push({ label, value });
      total += value;
    }

    return { entries, total };
  } else {
    const { start, end } = getCurrentWeekRange();

    const result = await pool.query(
      `SELECT DATE(transacted_at) AS day, COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1 AND transacted_at BETWEEN $2 AND $3
       GROUP BY day`,
      [userId, start.toISOString(), end.toISOString()],
    );

    const dayMap: Record<string, number> = {};
    for (const row of result.rows) {
      const d = new Date(row.day);
      const iso = d.toISOString().slice(0, 10);
      dayMap[iso] = Number(row.total);
    }

    const entries: { label: string; value: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      entries.push({ label: DAY_LABELS[i], value: dayMap[iso] ?? 0 });
    }

    const total = entries.reduce((s, e) => s + e.value, 0);
    return { entries, total };
  }
}

export async function getSpendingAnalysis(userId: string) {
  const { start: weekStart, end: weekEnd } = getCurrentWeekRange();
  const { start: monthStart } = getMonthRange();

  const budgetResult = await pool.query(
    "SELECT week_budget, month_budget FROM user_budgets WHERE user_id = $1",
    [userId],
  );
  const weekBudget = Number(budgetResult.rows[0]?.week_budget ?? 0);

  const weekSpendResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE user_id = $1 AND transacted_at BETWEEN $2 AND $3`,
    [userId, weekStart.toISOString(), weekEnd.toISOString()],
  );
  const weekAmount = Number(weekSpendResult.rows[0].total);
  const isUnder = weekAmount < weekBudget;
  const percentUnder =
    weekBudget > 0
      ? Math.round(Math.abs((weekBudget - weekAmount) / weekBudget) * 100)
      : 0;

  const dailyResult = await pool.query(
    `SELECT DATE(transacted_at) AS day, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND transacted_at BETWEEN $2 AND $3
     GROUP BY day`,
    [userId, weekStart.toISOString(), weekEnd.toISOString()],
  );

  const dailyMap: Record<string, number> = {};
  for (const row of dailyResult.rows) {
    const d = new Date(row.day);
    const iso = d.toISOString().slice(0, 10);
    dailyMap[iso] = Number(row.total);
  }

  const dailyBreakdown: { label: string; value: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    dailyBreakdown.push({ label: DAY_LABELS[i], value: dailyMap[iso] ?? 0 });
  }

  const catResult = await pool.query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1 AND transacted_at >= $2
     GROUP BY category`,
    [userId, monthStart.toISOString()],
  );

  const catTotal = catResult.rows.reduce(
    (s: number, r: { total: string }) => s + Number(r.total),
    0,
  );
  const categoryBreakdown = catResult.rows.map(
    (r: { category: string; total: string }) => ({
      label: CATEGORY_LABELS[r.category] ?? r.category,
      percent:
        catTotal > 0 ? Math.round((Number(r.total) / catTotal) * 100) : 0,
      amount: Math.round(Number(r.total)),
      color: CATEGORY_COLORS[r.category] ?? "#9CA3AF",
    }),
  );

  const monthlyRows: { label: string; value: number }[] = [];
  // Only show current month data, not historical data
  const { start: mStart, end: mEnd } = getMonthRange(0);
  const mResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
     WHERE user_id = $1 AND transacted_at BETWEEN $2 AND $3`,
    [userId, mStart.toISOString(), mEnd.toISOString()],
  );
  const label = mStart.toLocaleString("default", { month: "short" });
  monthlyRows.push({
    label,
    value: Math.round(Number(mResult.rows[0].total)),
  });

  const avgMonthlySpending = monthlyRows.length > 0 ? monthlyRows[0].value : 0;

  const insights: { id: string; title: string; body: string; type: string }[] =
    [];

  // Only generate insights with meaningful data (minimum 3 transactions)
  const totalTransactions = catResult.rowCount || 0;
  if (totalTransactions >= 3) {
    const weekendSpend = dailyBreakdown
      .filter((_, i) => i === 5 || i === 6)
      .reduce((s, e) => s + e.value, 0);
    const weekdayCount = dailyBreakdown.filter((_, i) => i < 5).length;
    const weekdayAvg =
      weekdayCount > 0
        ? dailyBreakdown
            .filter((_, i) => i < 5)
            .reduce((s, e) => s + e.value, 0) / weekdayCount
        : 0;

    if (weekdayAvg > 0 && weekendSpend / 2 > weekdayAvg * 1.3) {
      insights.push({
        id: "1",
        title: "Weekend Spike",
        body: "Your spending increases significantly on weekends.",
        type: "warning",
      });
    }

    const topCat = [...categoryBreakdown].sort(
      (a, b) => b.amount - a.amount,
    )[0];
    if (topCat && topCat.percent > 35 && totalTransactions >= 5) {
      insights.push({
        id: "2",
        title: `High ${topCat.label} Spending`,
        body: `${topCat.label} accounts for ${topCat.percent}% of your monthly spend.`,
        type: "info",
      });
    }
  }

  return {
    thisWeek: { amount: weekAmount, budget: weekBudget, percentUnder, isUnder },
    dailyBreakdown,
    categoryBreakdown,
    monthlyTrend: monthlyRows,
    avgMonthlySpending,
    insights,
  };
}

export async function getTotals(userId: string) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = $1`,
    [userId],
  );
  return { totalTracked: Number(result.rows[0].total) };
}
