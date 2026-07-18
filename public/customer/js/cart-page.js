const PLACEHOLDER_IMG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#f7f7f8"/></svg>'
  );

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render() {
  const lines = Cart.lines();
  const body = document.getElementById('cartBody');

  if (lines.length === 0) {
    const restaurantSlug = sessionStorage.getItem('qr_restaurant_slug');
    const tableSlug = sessionStorage.getItem('qr_table_slug');
    const menuHref = restaurantSlug && tableSlug ? `/menu/${restaurantSlug}/${tableSlug}` : '/customer/menu.html';
    body.innerHTML = `
      <div class="empty-state">
        Your order is empty.<br/><br/>
        <button class="btn-order" onclick="location.href='${menuHref}'">Browse Menu</button>
      </div>`;
    return;
  }

  const subtotal = Cart.subtotal();

  body.innerHTML = `
    <div class="cart-list" id="cartList">
      ${lines
        .map(
          (line) => `
        <div class="cart-line" data-line-id="${line.id}">
          <img src="${line.image || PLACEHOLDER_IMG}" alt="${escapeHtml(line.name)}" />
          <div class="info">
            <h4>${escapeHtml(line.name)}</h4>
            <p class="unit-price">${formatNaira(line.price)}</p>
            <div class="stepper" style="margin-top:8px">
              <button data-action="dec">−</button>
              <span data-qty>${line.quantity}</span>
              <button data-action="inc">+</button>
            </div>
          </div>
          <div class="right">
            <span class="line-total">${formatNaira(line.price * line.quantity)}</span>
          </div>
        </div>`
        )
        .join('')}
    </div>

    <div class="instructions-box">
      <label>Special instructions (optional)</label>
      <textarea id="instructions" placeholder="E.g. no onions, extra spicy...">${escapeHtml(Cart.getInstructions())}</textarea>
    </div>

    <div class="summary-box">
      <div class="summary-row"><span>Subtotal</span><span>${formatNaira(subtotal)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatNaira(subtotal)}</span></div>
    </div>

    <div class="checkout-footer">
      <button class="btn-primary-full" id="placeOrderBtn">Place Order</button>
    </div>
  `;

  wireLineControls();
  document.getElementById('instructions').addEventListener('input', (e) => Cart.setInstructions(e.target.value));
  document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
}

function wireLineControls() {
  Cart.lines().forEach((line) => {
    const el = document.querySelector(`[data-line-id="${line.id}"]`);
    if (!el) return;
    el.querySelector('[data-action="dec"]').addEventListener('click', () => {
      const newQty = line.quantity - 1;
      Cart.setQuantity(line, newQty);
      render();
    });
    el.querySelector('[data-action="inc"]').addEventListener('click', () => {
      Cart.setQuantity(line, line.quantity + 1);
      render();
    });
  });
}

async function placeOrder() {
  const btn = document.getElementById('placeOrderBtn');
  const restaurantSlug = sessionStorage.getItem('qr_restaurant_slug');
  const tableSlug = sessionStorage.getItem('qr_table_slug');

  if (!restaurantSlug || !tableSlug) {
    alert('Please re-scan the QR code on your table to start a new order.');
    return;
  }

  const items = Cart.lines().map((l) => ({ menuItemId: l.id, quantity: l.quantity }));

  btn.disabled = true;
  btn.textContent = 'Placing order...';
  try {
    const order = await Api.placeOrder({
      restaurantSlug,
      tableSlug,
      items,
      specialInstructions: Cart.getInstructions()
    });
    sessionStorage.setItem('qr_last_order_id', order.orderId);
    sessionStorage.setItem('qr_last_order_number', order.orderNumber);
    Cart.clear();
    location.href = '/customer/success.html';
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

document.getElementById('clearCartBtn').addEventListener('click', () => {
  if (confirm('Clear your entire order?')) {
    Cart.clear();
    render();
  }
});

render();
