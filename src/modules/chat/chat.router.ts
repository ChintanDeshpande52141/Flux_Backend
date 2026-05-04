import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { handleGetMessages, handleSendMessage, handleGetSuggestions } from './chat.controller';

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.get('/messages', handleGetMessages);
chatRouter.post('/messages', handleSendMessage);
chatRouter.get('/suggestions', handleGetSuggestions);
