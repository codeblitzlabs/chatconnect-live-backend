import express from 'express';
const router = express.Router();
import { registerUser, loginUser, getUsers } from '../controllers/userController.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', getUsers);

export default router;
