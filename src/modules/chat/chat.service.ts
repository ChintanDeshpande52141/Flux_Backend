import { pool } from '../../config/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

const SYSTEM_PROMPT = `You are a financial assistant for Flux, a personal finance app for Indian users. All amounts are in INR.

When the user describes an expense or purchase, extract and respond with ONLY this exact JSON (no markdown, no explanation):
{
  "intent": "log_expense",
  "merchant": "<store/app name>",
  "category": "<one of: Food, Transport, Shopping, Entertainment, Others>",
  "amount": <number>,
  "paymentType": "<one of: UPI, Cash, Credit, Debit>",
  "isRecurring": <true or false>,
  "reply": "<friendly confirmation, e.g. Got it! Logged ₹500 at Burger King → Food via UPI>"
}

If the user asks a question about their finances (not an expense entry), respond with ONLY this JSON:
{
  "intent": "question",
  "reply": "<your helpful answer>"
}

Rules:
- Default paymentType to UPI if unclear (common in India)
- isRecurring = true only for clearly recurring bills like Netflix, Spotify, rent, electricity
- Category mapping: food/restaurant/delivery → Food; cab/auto/petrol/metro → Transport; clothes/amazon/flipkart → Shopping; movies/netflix/spotify → Entertainment; everything else → Others
- Always respond in JSON only. Never include markdown code blocks.`;

type GeminiExpenseResult = {
  intent: 'log_expense';
  merchant: string;
  category: string;
  amount: number;
  paymentType: string;
  isRecurring: boolean;
  reply: string;
};

type GeminiQuestionResult = {
  intent: 'question';
  reply: string;
};

type GeminiResult = GeminiExpenseResult | GeminiQuestionResult;

async function parseWithGemini(userMessage: string): Promise<GeminiResult | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser: ${userMessage}`);
    const text = result.response.text().trim();

    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned) as GeminiResult;
  } catch (err) {
    console.error('Gemini parse error:', err);
    return null;
  }
}

export async function getMessages(userId: string) {
  const result = await pool.query(
    `SELECT id, text, sender, created_at FROM messages
     WHERE user_id = $1 ORDER BY created_at ASC LIMIT 50`,
    [userId]
  );

  return result.rows.map((r) => ({
    id: r.id,
    text: r.text,
    sender: r.sender,
    timestamp: r.created_at,
  }));
}

export async function saveMessage(userId: string, text: string, sender: 'user' | 'ai') {
  const result = await pool.query(
    `INSERT INTO messages (user_id, text, sender) VALUES ($1, $2, $3) RETURNING id, text, sender, created_at`,
    [userId, text, sender]
  );
  const r = result.rows[0];
  return { id: r.id, text: r.text, sender: r.sender, timestamp: r.created_at };
}

export async function processUserMessage(userId: string, text: string) {
  const userMsg = await saveMessage(userId, text, 'user');

  const parsed = await parseWithGemini(text);

  if (!parsed) {
    const aiMsg = await saveMessage(userId, "I couldn't process that. Please try again.", 'ai');
    return { userMessage: userMsg, aiMessage: aiMsg, logged: null };
  }

  let logged: Record<string, unknown> | null = null;

  if (parsed.intent === 'log_expense') {
    const exp = parsed as GeminiExpenseResult;
    const now = new Date().toISOString();

    if (exp.isRecurring) {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      const nextDate = nextBillingDate.toISOString().slice(0, 10);

      const res = await pool.query(
        `INSERT INTO subscriptions
          (user_id, name, subtitle, amount, billing_cycle, next_billing_date, category, badge, logo_initial, logo_color)
         VALUES ($1, $2, $3, $4, 'monthly', $5, $6, 'Auto', $7, '#6366F1')
         RETURNING id, name, amount`,
        [
          userId,
          exp.merchant,
          exp.category,
          exp.amount,
          nextDate,
          exp.category,
          exp.merchant.charAt(0).toUpperCase(),
        ]
      );
      logged = { type: 'subscription', ...res.rows[0] };
    } else {
      const validCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Others'];
      const validPaymentTypes = ['UPI', 'Cash', 'Credit', 'Debit'];
      const category = validCategories.includes(exp.category) ? exp.category : 'Others';
      const paymentType = validPaymentTypes.includes(exp.paymentType) ? exp.paymentType : 'UPI';

      const res = await pool.query(
        `INSERT INTO transactions (user_id, merchant, category, amount, payment_type, transacted_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, merchant, category, amount, payment_type, transacted_at`,
        [userId, exp.merchant, category, exp.amount, paymentType, now]
      );
      const row = res.rows[0];
      logged = {
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

  const aiMsg = await saveMessage(userId, parsed.reply, 'ai');
  return { userMessage: userMsg, aiMessage: aiMsg, logged };
}

export async function getSuggestions(userId: string) {
  const result = await pool.query(
    `SELECT id, text, category FROM ai_suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  if (result.rowCount === 0) {
    return [
      { id: '1', text: 'How much did I spend this week?', category: 'spending' },
      { id: '2', text: 'What is my safe to spend amount?', category: 'budget' },
      { id: '3', text: 'Show my top spending categories', category: 'analytics' },
      { id: '4', text: 'Spent ₹200 on Swiggy via UPI', category: 'entry' },
    ];
  }

  return result.rows.map((r) => ({ id: r.id, text: r.text, category: r.category }));
}
