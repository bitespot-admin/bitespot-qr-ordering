// Cart lives in sessionStorage, scoped to this browser tab/session only —
// there is no customer account, so nothing needs to persist beyond the visit.
const Cart = {
  _key: 'qr_cart',

  read() {
    try {
      return JSON.parse(sessionStorage.getItem(this._key)) || {};
    } catch {
      return {};
    }
  },

  write(cart) {
    sessionStorage.setItem(this._key, JSON.stringify(cart));
  },

  getQuantity(menuItemId) {
    return this.read()[menuItemId]?.quantity || 0;
  },

  setQuantity(menuItem, quantity) {
    const cart = this.read();
    if (quantity <= 0) {
      delete cart[menuItem.id];
    } else {
      cart[menuItem.id] = {
        id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price),
        image: menuItem.image || menuItem.image_url,
        quantity
      };
    }
    this.write(cart);
  },

  lines() {
    return Object.values(this.read());
  },

  totalItems() {
    return this.lines().reduce((sum, l) => sum + l.quantity, 0);
  },

  subtotal() {
    return this.lines().reduce((sum, l) => sum + l.quantity * l.price, 0);
  },

  clear() {
    sessionStorage.removeItem(this._key);
  },

  getInstructions() {
    return sessionStorage.getItem('qr_cart_instructions') || '';
  },

  setInstructions(text) {
    sessionStorage.setItem('qr_cart_instructions', text);
  }
};
