import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const TEST_USER_ID = '65e8a5b2e4b0a1a2b3c4d5e6'; // Example MongoDB ObjectID string

async function runTest() {
  const token = jwt.sign({ id: TEST_USER_ID }, JWT_SECRET);
  console.log(`Connecting to ws://localhost:${PORT} with token for user ${TEST_USER_ID}`);

  const ws = new WebSocket(`ws://localhost:${PORT}?token=${token}`);

  ws.on('open', async () => {
    console.log('WebSocket connection opened');
    
    // Wait a bit for the server to process the connection
    setTimeout(async () => {
      console.log('Checking /api/users endpoint...');
      
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/users',
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const users = JSON.parse(data);
            console.log('Users received from API:', JSON.stringify(users, null, 2));
            
            const testUser = users.find(u => u._id === TEST_USER_ID);
            if (testUser && testUser.isOnline === true) {
              console.log('SUCCESS: User is marked as online!');
            } else if (testUser) {
              console.log('FAILURE: User found but NOT marked as online.');
            } else {
              console.log('NOTE: Test user ID not found in database, but check if ANY user is online if you have other data.');
              const onlineCount = (Array.isArray(users) ? users : []).filter(u => u.isOnline).length;
              console.log(`Number of online users: ${onlineCount}`);
            }
          } catch (e) {
            console.error('Error parsing response:', e.message);
          }
          ws.close();
        });
      });

      req.on('error', (error) => {
        console.error('Error fetching users:', error.message);
        ws.close();
        process.exit(1);
      });

      req.end();
    }, 1000);
  });

  ws.on('message', (data) => {
    console.log('Received message:', data.toString());
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
    process.exit(1);
  });
}

runTest();
