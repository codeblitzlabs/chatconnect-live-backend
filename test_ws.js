import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const token = jwt.sign({ id: 'test_user' }, JWT_SECRET);

console.log(`Connecting to ws://localhost:${PORT} with token`);

const ws = new WebSocket(`ws://localhost:${PORT}?token=${token}`);
const ws2 = new WebSocket(`ws://localhost:${PORT}?token=${token}`);

let ws1ReceivedWelcome = false;
let ws2ReceivedBroadcast = false;

ws.on('open', () => {
  console.log('Client 1 connected');
});

ws2.on('open', () => {
  console.log('Client 2 connected');
});

ws.on('message', (data) => {
  const message = data.toString();
  console.log(`Client 1 received: ${message}`);
  if (message === 'Welcome to ChatConnect WebSocket Server!') {
    ws1ReceivedWelcome = true;
    // Send a message to be broadcasted
    ws.send('Hello from test client');
  }
});

ws2.on('message', (data) => {
  const message = data.toString();
  console.log(`Client 2 received: ${message}`);
  if (message === 'Hello from test client') {
    ws2ReceivedBroadcast = true;
    console.log('Broadcast verified successfully!');
    ws.close();
    ws2.close();
  }
});

ws.on('close', () => {
  console.log('Client 1 closed');
});

ws2.on('close', () => {
  console.log('Client 2 closed');
  if (ws1ReceivedWelcome && ws2ReceivedBroadcast) {
    console.log('Test PASSED');
    process.exit(0);
  } else {
    console.error('Test FAILED');
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('WebSocket 1 Error:', err);
  process.exit(1);
});

ws2.on('error', (err) => {
  console.error('WebSocket 2 Error:', err);
  process.exit(1);
});

// Set a timeout to exit if it takes too long
setTimeout(() => {
  console.error('Test timed out');
  process.exit(1);
}, 5000);
