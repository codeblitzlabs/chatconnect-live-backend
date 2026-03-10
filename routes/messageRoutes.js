import express from 'express';
const router = express.Router();
import { getMessages, markAsRead } from '../controllers/messageController.js';
import { protect } from '../controllers/authMiddleware.js';

router.get('/:userId', protect, getMessages);
router.put('/read/:senderId', protect, markAsRead);

export default router;
