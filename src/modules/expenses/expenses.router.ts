import { Router } from 'express';
import { handleCreateExpense, handleGetExpenses } from './expenses.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All expense routes require authentication
router.use(authenticate);

// POST /api/v1/expenses - Create a new expense
router.post('/', handleCreateExpense);

// GET /api/v1/expenses - Get user's expenses with optional filtering
router.get('/', handleGetExpenses);

export default router;
