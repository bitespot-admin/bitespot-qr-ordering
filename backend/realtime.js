const jwt = require('jsonwebtoken');
const cookie = require('cookie');

let ioInstance = null;

// Wires up connection handling. Called once from server.js after the
// Socket.IO server is created.
function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Admin dashboards carry the same HttpOnly JWT cookie used for the
    // REST API. We verify it here (never trust a client-supplied
    // restaurantId) so a socket only ever joins the room for the
    // restaurant its cookie actually belongs to.
    try {
      const rawCookie = socket.handshake.headers.cookie || '';
      const parsed = cookie.parse(rawCookie);
      if (parsed.token) {
        const decoded = jwt.verify(parsed.token, process.env.JWT_SECRET);
        socket.join(`restaurant:${decoded.restaurantId}`);
      }
    } catch (err) {
      // Not an authenticated admin socket — that's fine, customer
      // sockets never carry this cookie and don't need this room.
    }

    // Customers join a room scoped to their own order so the live
    // status tracker updates instantly without polling. The order id
    // + table slug pairing is already validated by the REST endpoint;
    // here we just accept whichever order id the client asks to track.
    socket.on('track-order', ({ orderId }) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
  });
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized. Call initSocket(io) from server.js first.');
  }
  return ioInstance;
}

module.exports = { initSocket, getIO };
