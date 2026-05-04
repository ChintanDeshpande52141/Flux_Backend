import { Request, Response } from 'express';
import { z } from 'zod';
import { getMessages, processUserMessage, getSuggestions } from './chat.service';

const SendMessageSchema = z.object({
  text: z.string().min(1),
  sender: z.enum(['user', 'ai']),
});

export async function handleGetMessages(req: Request, res: Response): Promise<void> {
  try {
    const messages = await getMessages(req.userId);
    res.json({ data: { messages }, error: null });
  } catch (err) {
    console.error('GET /chat/messages error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}

export async function handleSendMessage(req: Request, res: Response): Promise<void> {
  try {
    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }

    const { text, sender } = parsed.data;

    if (sender === 'user') {
      const result = await processUserMessage(req.userId, text);
      res.status(201).json({ data: result, error: null });
    } else {
      res.status(400).json({ data: null, error: 'Use sender: user to send messages' });
    }
  } catch (err) {
    console.error('POST /chat/messages error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}

export async function handleGetSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const suggestions = await getSuggestions(req.userId);
    res.json({ data: { suggestions }, error: null });
  } catch (err) {
    console.error('GET /chat/suggestions error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}
