import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';

// Set to track online user IDs
export const onlineUsers = new Set();

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

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      ws.userId = userId;
      onlineUsers.add(userId);
      console.log(`User ${userId} is now online`);
      
      // Notify all clients that a user came online
      broadcastOnlineStatus(wss);
    } catch (err) {
      console.log(`Unauthorized connection attempt from ${ip}: Invalid token`);
      ws.close(1008, 'Policy Violation: Invalid Token');
      return;
    }

    console.log(`New WebSocket connection from ${ip} (User: ${userId})`);

    // Optional: ping/pong to detect dead connections
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
      const text = message.toString(); // convert Buffer to string
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Message from ${userId} (${ip}): size=${Buffer.byteLength(message)} bytes, type=${typeof text}`);

      // Broadcast to all other clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'message',
            from: userId,
            text,
            timestamp
          }));
        }
      });
    });

    ws.on('close', () => {
      if (ws.userId) {
        // Check if user has other connections before removing from onlineUsers
        const otherConnections = Array.from(wss.clients).some(client => 
          client !== ws && client.userId === ws.userId && client.readyState === WebSocket.OPEN
        );
        
        if (!otherConnections) {
          onlineUsers.delete(ws.userId);
          console.log(`User ${ws.userId} is now offline`);
          broadcastOnlineStatus(wss);
        }
      }
      console.log(`Connection closed from ${ip}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.send(JSON.stringify({ type: 'welcome', message: 'Welcome to ChatConnect WebSocket Server!' }));
  });

  // Helper to broadcast online status to all clients
  const broadcastOnlineStatus = (wss) => {
    const statusUpdate = JSON.stringify({
      type: 'online_status',
      onlineUsers: Array.from(onlineUsers)
    });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(statusUpdate);
      }
    });
  };

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