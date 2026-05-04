import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { handleGetTransactions, handleCreateTransaction } from './transactions.controller';

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);

transactionsRouter.get('/', handleGetTransactions);
transactionsRouter.post('/', handleCreateTransaction);
