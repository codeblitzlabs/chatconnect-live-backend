import { WebSocketServer, WebSocket } from 'ws';

const initWebSocket = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`New WebSocket connection from ${ip}`);

    // Optional: ping/pong to detect dead connections
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
      const text = message.toString(); // convert Buffer to string
      console.log(`Received: ${text}`);

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