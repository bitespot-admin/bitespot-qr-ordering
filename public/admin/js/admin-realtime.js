// Shared by any admin page that wants live updates. Requires the
// socket.io client script (served automatically at /socket.io/socket.io.js
// by the backend — no separate npm package needed on the frontend) to be
// included before this file.
let adminSocket = null;

function connectAdminRealtime({ onNewOrder, onOrderStatus, onWaiterCall } = {}) {
  // `io()` with no URL connects back to the same origin that served the
  // page, and automatically sends the page's cookies — including the
  // HttpOnly JWT — so the backend can join it to the right restaurant room.
  adminSocket = io();

  if (onNewOrder) adminSocket.on('order:new', onNewOrder);
  if (onOrderStatus) adminSocket.on('order:status', onOrderStatus);

  adminSocket.on('waiter:call', (data) => {
    playAlertChime();
    if (onWaiterCall) onWaiterCall(data);
  });

  return adminSocket;
}

// Synthesizes a short two-tone chime with the Web Audio API — no audio
// file to bundle, works everywhere, and needs no user interaction beyond
// the page already being open (browsers only block *autoplaying media*
// without a prior gesture; a page the admin is actively using is fine).
function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch (err) {
    // Web Audio unsupported/blocked — fail silently, the visual toast still shows.
  }
}
