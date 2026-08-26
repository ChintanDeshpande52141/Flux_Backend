import { pool } from "../../config/db";
import { updateOnboardingData } from "../onboarding/onboarding.service";
import { getSafeToSpend } from "../analytics/analytics.service";
import { getPrimaryFreeModel } from "../../config/freeModels";
import { lookupCategory } from "../../data/merchantCategories";
import { parseAmountShorthand, round2 } from "../../shared/finance/money";
import { z } from "zod";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";

function buildPrompt(totalIncome: number, savingsGoal: number): string {
  return `
You are Velo, an AI finance parser for Flux. Return ONLY valid JSON.

All amounts are in INR.
Monthly Income: ₹${totalIncome} | Savings Goal: ₹${savingsGoal}

JSON SCHEMAS:

1. Log expense:
{"intent":"log_expense","merchant":"string","category":"Food|Transport|Shopping|Entertainment|Others","amount":number,"paymentType":"UPI|Cash|Credit|Debit","isRecurring":boolean,"reply":"string"}

2. Update savings goal:
{"intent":"update_savings_goal","amount":number,"reply":"string"}

3. Update income:
{"intent":"update_income","amount":number,"reply":"string"}

4. Question/analytics:
{"intent":"question","queryType":"food_spending_month|food_spending_week|food_spending_last_month|transport_spending_month|transport_spending_last_month|total_spending_month|total_spending_week|total_spending_last_month|safe_to_spend|top_categories|other","reply":"string"}

EXAMPLES:

User: spent 250 on swiggy
{"intent":"log_expense","merchant":"Swiggy","category":"Food","amount":250,"paymentType":"UPI","isRecurring":false,"reply":"Added ₹250 for Swiggy."}

User: paid 500 for uber via cash
{"intent":"log_expense","merchant":"Uber","category":"Transport","amount":500,"paymentType":"Cash","isRecurring":false,"reply":"Added ₹500 for Uber."}

User: monthly netflix 299
{"intent":"log_expense","merchant":"Netflix","category":"Entertainment","amount":299,"paymentType":"UPI","isRecurring":true,"reply":"Added recurring ₹299 for Netflix."}

User: how much did I spend on food this month
{"intent":"question","queryType":"food_spending_month","reply":"food_spending_month"}

User: how much did I spend last month
{"intent":"question","queryType":"total_spending_last_month","reply":"total_spending_last_month"}

User: how much did I spend this week
{"intent":"question","queryType":"total_spending_week","reply":"total_spending_week"}

User: what is my safe to spend
{"intent":"question","queryType":"safe_to_spend","reply":"safe_to_spend"}

User: my salary is 60000
{"intent":"update_income","amount":60000,"reply":"Updated monthly income to ₹60,000."}

RULES:
- Return ONLY JSON, no text
- For questions use queryType field
- default paymentType = UPI
- amount must be a number
`;
}

type AIExpenseResult = {
  intent: "log_expense";
  merchant: string;
  category: string;
  amount: number;
  paymentType: string;
  isRecurring: boolean;
  reply: string;
};

type AIUpdateResult = {
  intent: "update_savings_goal" | "update_income";
  amount: number;
  reply: string;
};

type AIQuestionResult = {
  intent: "question" | "clarify";
  queryType?: string;
  reply: string;
};

type AIResult = AIExpenseResult | AIUpdateResult | AIQuestionResult;

type OpenRouterResponse = {
  choices: Array<{
    message: {
      content?: string;
    };
  }>;
};

const VALID_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Others",
] as const;
const VALID_PAYMENT_TYPES = ["UPI", "Cash", "Credit", "Debit"] as const;

const AIExpenseSchema = z.object({
  intent: z.literal("log_expense"),
  merchant: z.string().min(1),
  category: z.string(),
  amount: z.number().positive(),
  paymentType: z.string(),
  isRecurring: z.boolean(),
  reply: z.string(),
});

const AIUpdateSchema = z.object({
  intent: z.enum(["update_savings_goal", "update_income"]),
  amount: z.number().positive(),
  reply: z.string(),
});

const AIQuestionSchema = z.object({
  intent: z.enum(["question", "clarify"]),
  queryType: z.string().optional(),
  reply: z.string(),
});

const AIResultSchema = z.union([
  AIExpenseSchema,
  AIUpdateSchema,
  AIQuestionSchema,
]);

// Regex-first parser — skips AI for simple expense patterns
const QUICK_EXPENSE_REGEX =
  /^(?:\+\s*)?(\d+(?:\.\d+)?k?)\s+(.+?)(?:\s+(?:via|through|by)\s+(upi|cash|credit|debit))?$/i;

function tryQuickParse(text: string): AIResult | null {
  const match = text.match(QUICK_EXPENSE_REGEX);
  if (!match) return null;
  const merchant = match[2].trim();
  const amount = parseAmountShorthand(match[1]);
  if (amount === null) {
    return {
      intent: "clarify",
      reply: `I couldn't understand the amount "${match[1]}". Could you re-enter it, e.g. "250" or "5k"?`,
    };
  }
  const rawPayment = match[3]?.toLowerCase() ?? "upi";
  const paymentTypeMap: Record<string, string> = {
    upi: "UPI",
    cash: "Cash",
    credit: "Credit",
    debit: "Debit",
  };
  const paymentType = paymentTypeMap[rawPayment] ?? "UPI";
  const category = mapCategory(merchant);
  return {
    intent: "log_expense",
    merchant,
    category,
    amount,
    paymentType,
    isRecurring: false,
    reply: `Added ₹${amount.toLocaleString("en-IN")} for ${merchant}.`,
  };
}

function mapCategory(merchant: string, userCategory?: string): string {
  // O(1) dictionary lookup first
  const fromDict = lookupCategory(merchant);
  if (fromDict) return fromDict;

  // Fallback: category hint from AI
  const cat = userCategory?.toLowerCase() ?? "";
  if (cat === "food") return "Food";
  if (cat === "transport") return "Transport";
  if (cat === "shopping") return "Shopping";
  if (cat === "entertainment") return "Entertainment";

  return "Others";
}

export async function getMessages(userId: string) {
  const result = await pool.query(
    `
    SELECT id, text, sender, created_at
    FROM messages
    WHERE user_id = $1
    ORDER BY created_at ASC
    LIMIT 50
    `,
    [userId],
  );

  return result.rows.map((r) => ({
    id: r.id,
    text: r.text,
    sender: r.sender,
    timestamp: r.created_at,
  }));
}

export async function saveMessage(
  userId: string,
  text: string,
  sender: "user" | "ai",
) {
  const result = await pool.query(
    `
    INSERT INTO messages (user_id, text, sender)
    VALUES ($1, $2, $3)
    RETURNING id, text, sender, created_at
    `,
    [userId, text, sender],
  );

  const r = result.rows[0];

  return {
    id: r.id,
    text: r.text,
    sender: r.sender,
    timestamp: r.created_at,
  };
}

export async function processUserMessage(
  userId: string,
  text: string,
  parsedData?: {
    intent: "log_expense";
    merchant: string;
    category: string;
    amount: number;
    paymentType: string;
    isRecurring: boolean;
    reply: string;
  },
) {
  const userRow = await pool.query(
    `
    SELECT total_income, savings_goal
    FROM users
    WHERE id = $1
    `,
    [userId],
  );

  const totalIncome = Number(userRow.rows[0]?.total_income ?? 0);

  const savingsGoal = Number(userRow.rows[0]?.savings_goal ?? 0);

  const cleanedText = text
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/^\+/g, "")
    .trim();

  const userMsg = await saveMessage(userId, text, "user");

  // Use parsedData if provided, try regex-first, then fall back to AI
  let parsed: AIResult | null | typeof parsedData = null;
  if (parsedData) {
    parsed = parsedData;
  } else {
    parsed =
      tryQuickParse(cleanedText) ??
      (await parseWithAI(cleanedText, totalIncome, savingsGoal));
  }

  if (!parsed) {
    const aiMsg = await saveMessage(
      userId,
      "I couldn't process that. Please try again.",
      "ai",
    );

    return {
      userMessage: userMsg,
      aiMessage: aiMsg,
      logged: null,
      updated: null,
    };
  }

  let logged: Record<string, unknown> | null = null;

  let updated: {
    field: string;
    value: number;
  } | null = null;

  if (parsed.intent === "log_expense") {
    const exp = parsed;
    const now = new Date().toISOString();

    // Skip DB insertion if parsedData was provided (transaction already created via /expenses)
    if (parsedData) {
      // Just create the AI response message
      const aiMsg = await saveMessage(userId, exp.reply, "ai");

      return {
        userMessage: userMsg,
        aiMessage: aiMsg,
        logged: {
          type: "transaction",
          id: "local-" + Date.now(), // Temporary ID since we don't have the real one
          merchant: exp.merchant,
          category: exp.category,
          amount: exp.amount,
          paymentType: exp.paymentType,
          transactedAt: now,
        },
        updated: null,
      };
    }

    if (exp.isRecurring) {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      const nextDate = nextBillingDate.toISOString().slice(0, 10);

      // Deduplication: check if subscription already exists
      const existing = await pool.query(
        `SELECT id FROM subscriptions WHERE user_id=$1 AND LOWER(name)=LOWER($2) LIMIT 1`,
        [userId, exp.merchant],
      );

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        let subRow;
        if (existing.rowCount && existing.rowCount > 0) {
          const updated = await client.query(
            `UPDATE subscriptions SET amount=$1, next_billing_date=$2 WHERE id=$3 RETURNING id, name, amount`,
            [exp.amount, nextDate, existing.rows[0].id],
          );
          subRow = updated.rows[0];
        } else {
          const inserted = await client.query(
            `INSERT INTO subscriptions (user_id,name,subtitle,amount,billing_cycle,next_billing_date,category,badge,logo_initial,logo_color)
             VALUES ($1,$2,$3,$4,'monthly',$5,$6,'Auto',$7,'#6366F1') RETURNING id, name, amount`,
            [
              userId,
              exp.merchant,
              exp.category,
              exp.amount,
              nextDate,
              exp.category,
              exp.merchant.charAt(0).toUpperCase(),
            ],
          );
          subRow = inserted.rows[0];
        }
        const aiMsg = await client.query(
          `INSERT INTO messages (user_id, text, sender) VALUES ($1,$2,'ai') RETURNING id, text, sender, created_at`,
          [userId, exp.reply],
        );
        await client.query("COMMIT");
        logged = { type: "subscription", ...subRow };
        return {
          userMessage: userMsg,
          aiMessage: {
            id: aiMsg.rows[0].id,
            text: aiMsg.rows[0].text,
            sender: aiMsg.rows[0].sender,
            timestamp: aiMsg.rows[0].created_at,
          },
          logged,
          updated: null,
        };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } else {
      const category = (VALID_CATEGORIES as readonly string[]).includes(
        exp.category,
      )
        ? exp.category
        : "Others";
      const paymentType = (VALID_PAYMENT_TYPES as readonly string[]).includes(
        exp.paymentType,
      )
        ? exp.paymentType
        : "UPI";

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const txRes = await client.query(
          `INSERT INTO transactions (user_id,merchant,category,amount,payment_type,transacted_at)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,merchant,category,amount,payment_type,transacted_at`,
          [userId, exp.merchant, category, round2(exp.amount), paymentType, now],
        );
        const aiMsg = await client.query(
          `INSERT INTO messages (user_id, text, sender) VALUES ($1,$2,'ai') RETURNING id, text, sender, created_at`,
          [userId, exp.reply],
        );
        await client.query("COMMIT");
        const row = txRes.rows[0];
        logged = {
          type: "transaction",
          id: row.id,
          merchant: row.merchant,
          category: row.category,
          amount: Number(row.amount),
          paymentType: row.payment_type,
          transactedAt: row.transacted_at,
        };
        return {
          userMessage: userMsg,
          aiMessage: {
            id: aiMsg.rows[0].id,
            text: aiMsg.rows[0].text,
            sender: aiMsg.rows[0].sender,
            timestamp: aiMsg.rows[0].created_at,
          },
          logged,
          updated: null,
        };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
  } else if (parsed.intent === "update_savings_goal") {
    await updateOnboardingData(userId, {
      savings_goal: parsed.amount,
    });

    updated = {
      field: "savings_goal",
      value: parsed.amount,
    };
  } else if (parsed.intent === "update_income") {
    await updateOnboardingData(userId, {
      total_income: parsed.amount,
    });

    updated = {
      field: "total_income",
      value: parsed.amount,
    };
  } else if (parsed.intent === "question") {
    const qt = (parsed as AIQuestionResult).queryType ?? "other";
    try {
      switch (qt) {
        case "food_spending_month": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND category='Food' AND transacted_at>=date_trunc('month',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `You spent ₹${Number(r.rows[0].total).toLocaleString("en-IN")} on food this month.`;
          break;
        }
        case "food_spending_week": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND category='Food' AND transacted_at>=date_trunc('week',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `You spent ₹${Number(r.rows[0].total).toLocaleString("en-IN")} on food this week.`;
          break;
        }
        case "transport_spending_month": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND category='Transport' AND transacted_at>=date_trunc('month',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `You spent ₹${Number(r.rows[0].total).toLocaleString("en-IN")} on transport this month.`;
          break;
        }
        case "food_spending_last_month": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND category='Food' AND transacted_at>=date_trunc('month',CURRENT_DATE - INTERVAL '1 month') AND transacted_at<date_trunc('month',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `You spent ₹${Number(r.rows[0].total).toLocaleString("en-IN")} on food last month.`;
          break;
        }
        case "transport_spending_last_month": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND category='Transport' AND transacted_at>=date_trunc('month',CURRENT_DATE - INTERVAL '1 month') AND transacted_at<date_trunc('month',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `You spent ₹${Number(r.rows[0].total).toLocaleString("en-IN")} on transport last month.`;
          break;
        }
        case "total_spending_month": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND transacted_at>=date_trunc('month',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `Your total spending this month is ₹${Number(r.rows[0].total).toLocaleString("en-IN")}.`;
          break;
        }
        case "total_spending_week": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND transacted_at>=date_trunc('week',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `Your total spending this week is ₹${Number(r.rows[0].total).toLocaleString("en-IN")}.`;
          break;
        }
        case "total_spending_last_month": {
          const r = await pool.query(
            `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND transacted_at>=date_trunc('month',CURRENT_DATE - INTERVAL '1 month') AND transacted_at<date_trunc('month',CURRENT_DATE)`,
            [userId],
          );
          parsed.reply = `Your total spending last month was ₹${Number(r.rows[0].total).toLocaleString("en-IN")}.`;
          break;
        }
        case "safe_to_spend": {
          const { amount, dailyLimit } = await getSafeToSpend(
            userId,
            "monthly",
          );
          parsed.reply = `Your safe-to-spend is ₹${amount.toLocaleString("en-IN")} this month (₹${dailyLimit.toLocaleString("en-IN")}/day).`;
          break;
        }
        case "top_categories": {
          const r = await pool.query(
            `SELECT category, COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND transacted_at>=date_trunc('month',CURRENT_DATE) GROUP BY category ORDER BY total DESC LIMIT 3`,
            [userId],
          );
          if (r.rows.length === 0) {
            parsed.reply = "No spending data found for this month.";
          } else {
            const breakdown = r.rows
              .map(
                (row) =>
                  `${row.category}: ₹${Number(row.total).toLocaleString("en-IN")}`,
              )
              .join(", ");
            parsed.reply = `Your top spending categories this month: ${breakdown}.`;
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error("[processUserMessage] analytics query failed", err);
      parsed.reply = "I couldn't fetch your spending data. Please try again.";
    }
  }

  // Also invalidate chat messages so frontend gets fresh data
  const aiMsg = await saveMessage(userId, parsed.reply, "ai");

  return {
    userMessage: userMsg,
    aiMessage: aiMsg,
    logged,
    updated,
  };
}

export async function parseWithAI(
  userMessage: string,
  totalIncome: number,
  savingsGoal: number,
): Promise<AIResult | null> {
  if (!OPENROUTER_API_KEY) {
    return null;
  }

  const maxRetries = 2;
  const timeoutMs = 10000; // 10 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Flux",
          },
          body: JSON.stringify({
            model: getPrimaryFreeModel(),
            temperature: 0.1,
            messages: [
              {
                role: "system",
                content: buildPrompt(totalIncome, savingsGoal),
              },
              {
                role: "user",
                content: userMessage,
              },
            ],
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt === maxRetries) {
          return null;
        }
        continue;
      }

      const data = (await response.json()) as OpenRouterResponse;
      const raw = data?.choices?.[0]?.message?.content;

      if (!raw) {
        if (attempt === maxRetries) {
          return null;
        }
        continue;
      }

      const cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/^[^{]*/g, "")
        .trim();

      let parsed: AIResult;
      try {
        const rawParsed = JSON.parse(cleaned);
        const validated = AIResultSchema.safeParse(rawParsed);
        if (!validated.success) {
          if (attempt === maxRetries) return null;
          continue;
        }
        parsed = validated.data as AIResult;
      } catch (parseErr) {
        if (attempt === maxRetries) {
          return null;
        }
        continue;
      }

      if (!parsed.intent) {
        if (attempt === maxRetries) {
          return null;
        }
        continue;
      }

      if (parsed.intent === "log_expense") {
        parsed.category = mapCategory(parsed.merchant, parsed.category);
        if (!["UPI", "Cash", "Credit", "Debit"].includes(parsed.paymentType)) {
          parsed.paymentType = "UPI";
        }
        if (typeof parsed.amount !== "number" || parsed.amount <= 0) {
          return {
            intent: "question",
            reply:
              "I couldn't understand the expense amount. Please try again.",
          };
        }
      }

      return parsed;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (attempt === maxRetries) {
          return null;
        }
        continue;
      }
      if (attempt === maxRetries) {
        return null;
      }
    }
  }

  return null;
}

export async function getSuggestions(userId: string) {
  const result = await pool.query(
    `
    SELECT merchant, category, SUM(amount) as total_amount, COUNT(*) as freq, MAX(payment_type) as payment_type
    FROM transactions
    WHERE user_id = $1
    GROUP BY merchant, category
    ORDER BY freq DESC
    LIMIT 4
    `,
    [userId],
  );

  if (!result.rowCount) {
    return [
      {
        id: "1",
        text: "Spent 200 on Swiggy via UPI",
        category: "entry",
      },
      {
        id: "2",
        text: "Spent 500 on petrol via cash",
        category: "entry",
      },
      {
        id: "3",
        text: "What is my safe to spend?",
        category: "budget",
      },
      {
        id: "4",
        text: "Show my top spending categories",
        category: "analytics",
      },
    ];
  }

  return result.rows.map((r, i) => ({
    id: String(i + 1),
    text: `+ ${r.merchant} ₹${Number(r.amount).toLocaleString("en-IN")}`,
    category: (r.category as string)?.toLowerCase() ?? "entry",
    merchant: r.merchant as string,
    amount: Number(r.amount),
    paymentType: r.payment_type as string,
  }));
}
