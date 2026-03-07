import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';

const initWebSocket = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;

    // Validate auth token
    const parameters = url.parse(req.url, true).query;
    const token = parameters.token || req.headers['sec-websocket-protocol'];

    if (!token) {
      console.log(`Unauthorized connection attempt from ${ip}: No token provided`);
      ws.close(1008, 'Policy Violation: Authentication Required');
      return;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log(`Unauthorized connection attempt from ${ip}: Invalid token`);
      ws.close(1008, 'Policy Violation: Invalid Token');
      return;
    }

    console.log(`New WebSocket connection from ${ip}`);

    // Optional: ping/pong to detect dead connections
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
      const text = message.toString(); // convert Buffer to string
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Message from ${ip}: size=${Buffer.byteLength(message)} bytes, type=${typeof text}`);

      // Broadcast to all other clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(text);
        }
      });
    });

    ws.on('close', () => {
      console.log(`Connection closed from ${ip}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.send('Welcome to ChatConnect WebSocket Server!');
  });

  // Heartbeat interval — removes dead connections every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval)); // cleanup on server close

  return wss;
};

export default initWebSocket;