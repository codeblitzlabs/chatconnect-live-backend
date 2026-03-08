import express from 'express';
const router = express.Router();
import { registerUser, loginUser, getUsers } from '../controllers/userController.js';
import { protect } from '../controllers/authMiddleware.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', protect, getUsers);

export default router;
