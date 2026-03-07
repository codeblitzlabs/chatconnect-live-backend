import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:5001');

ws.on('open', () => {
  console.log('Connected to server');
  ws.send('Hello from test client');
});

ws.on('message', (data) => {
  console.log(`Received from server: ${data}`);
  ws.close();
});

ws.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
  process.exit(1);
});

// Set a timeout to exit if it takes too long
setTimeout(() => {
  console.error('Test timed out');
  process.exit(1);
}, 5000);
