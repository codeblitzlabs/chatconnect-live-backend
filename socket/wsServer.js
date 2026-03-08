import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';
import Message from '../models/Message.js';

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

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { receiverId, text, type } = data;
        const timestamp = new Date().toISOString();

        console.log(`[${timestamp}] Message from ${userId} to ${receiverId || 'all'}: ${text}`);

        if (type === 'direct_message' && receiverId) {
          // One-to-one chat logic
          const newMessage = await Message.create({
            sender: userId,
            receiver: receiverId,
            text
          });

          const messageToSend = JSON.stringify({
            type: 'direct_message',
            _id: newMessage._id,
            from: userId,
            to: receiverId,
            text,
            timestamp: newMessage.createdAt
          });

          // Send to recipient if online
          let recipientFound = false;
          wss.clients.forEach((client) => {
            if (client.userId === receiverId && client.readyState === WebSocket.OPEN) {
              client.send(messageToSend);
              recipientFound = true;
            }
          });

          // Also send back to sender for confirmation/sync if needed
          // (Frontend usually handles this, but it's good to confirm delivery)
          ws.send(messageToSend);

        } else {
          // Default broadcast logic (optional, keep for backward compatibility or general announcements)
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
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
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