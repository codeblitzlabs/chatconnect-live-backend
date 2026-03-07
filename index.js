import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import initWebSocket from './socket/wsServer.js';

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

initWebSocket(server);

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use('/api/users', userRoutes);

app.get('/test', (req, res) => {
  res.json({ message: 'Express server is running!' });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
