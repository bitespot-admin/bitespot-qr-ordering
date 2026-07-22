// Shared by any admin page that wants live updates.
let adminSocket = null;

// Preload notification sounds
const waiterSound = new Audio('/admin/js/sounds/waiter.wav');
const orderSound = new Audio('/admin/js/sounds/new-order.mp3');

waiterSound.preload = 'auto';
orderSound.preload = 'auto';

waiterSound.volume = 1.0;
orderSound.volume = 1.0;

function playSound(audio) {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (_) {}
}

function connectAdminRealtime({
  onNewOrder,
  onOrderStatus,
  onWaiterCall,
} = {}) {

  adminSocket = io();

  adminSocket.on('order:new', (data) => {
    playSound(orderSound);

    if (onNewOrder) {
      onNewOrder(data);
    }
  });

  adminSocket.on('order:status', (data) => {
    if (onOrderStatus) {
      onOrderStatus(data);
    }
  });

  adminSocket.on('waiter:call', (data) => {
    playSound(waiterSound);

    if (onWaiterCall) {
      onWaiterCall(data);
    }
  });

  return adminSocket;
}

document.addEventListener(
  'click',
  () => {
    waiterSound.play().then(() => {
      waiterSound.pause();
      waiterSound.currentTime = 0;
    }).catch(() => {});

    orderSound.play().then(() => {
      orderSound.pause();
      orderSound.currentTime = 0;
    }).catch(() => {});
  },
  { once: true }
);
