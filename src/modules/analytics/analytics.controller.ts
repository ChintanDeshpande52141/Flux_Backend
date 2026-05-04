import { Request, Response } from 'express';
import {
  getSafeToSpend,
  getSpendingVelocity,
  getCreditHealth,
  getSpendingPulse,
  getSpendingAnalysis,
} from './analytics.service';

export async function handleSafeToSpend(req: Request, res: Response): Promise<void> {
  try {
    const data = await getSafeToSpend(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    console.error('GET /analytics/safe-to-spend error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}

export async function handleSpendingVelocity(req: Request, res: Response): Promise<void> {
  try {
    const data = await getSpendingVelocity(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    console.error('GET /analytics/spending-velocity error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}

export async function handleCreditHealth(req: Request, res: Response): Promise<void> {
  try {
    const data = await getCreditHealth(req.userId);
    if (!data) {
      res.status(404).json({ data: null, error: 'No credit health record found' });
      return;
    }
    res.json({ data, error: null });
  } catch (err) {
    console.error('GET /analytics/credit-health error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}

export async function handleSpendingPulse(req: Request, res: Response): Promise<void> {
  try {
    const data = await getSpendingPulse(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    console.error('GET /analytics/spending-pulse error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}

export async function handleSpendingAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const data = await getSpendingAnalysis(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    console.error('GET /analytics/spending-analysis error:', err);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
}
