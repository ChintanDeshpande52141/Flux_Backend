import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  handleGetSubscriptions,
  handleCreateSubscription,
  handleUpdateSubscription,
  handleDeleteSubscription,
} from './subscriptions.controller';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(authenticate);

subscriptionsRouter.get('/', handleGetSubscriptions);
subscriptionsRouter.post('/', handleCreateSubscription);
subscriptionsRouter.patch('/:id', handleUpdateSubscription);
subscriptionsRouter.delete('/:id', handleDeleteSubscription);
