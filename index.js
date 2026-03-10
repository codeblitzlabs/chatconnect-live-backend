import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import initWebSocket from './socket/wsServer.js';

dotenv.config();

connectDB();

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
const server = http.createServer(app);

initWebSocket(server);

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/test', (req, res) => {
  res.json({ message: 'Express server is running!' });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
