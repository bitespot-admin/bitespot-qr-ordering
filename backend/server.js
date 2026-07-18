const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { testConnection } = require('./config/db');
const { initSocket } = require('./realtime');
const { bootstrapSuperAdmin } = require('./bootstrap');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Socket.IO needs to attach to the raw HTTP server, not the Express app
// directly, so real-time updates and the REST API share one process/port.
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || true, credentials: true }
});
initSocket(io);

testConnection()
  .then(bootstrapSuperAdmin)
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 QR Table Ordering server running on port ${PORT}`);
      console.log(`🔌 Real-time updates active via Socket.IO`);
    });
  });
