// Currency formatting
const currencySymbols = { THB: '฿', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

function formatCurrency(amount, currency) {
  const symbol = currencySymbols[currency] || currency + ' ';
  return symbol + amount.toFixed(2);
}

// Add item
async function addItem(e) {
  e.preventDefault();
  const name = document.getElementById('item-name').value;
  const price = document.getElementById('item-price').value;
  const quantity = document.getElementById('item-qty').value || 1;

  try {
    const res = await fetch(`/api/bills/${BILL_ID}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, quantity })
    });
    
    if (res.ok) {
      location.reload();
    } else {
      alert('Failed to add item');
    }
  } catch (err) {
    alert('Error adding item');
  }
}

// Delete item
async function deleteItem(itemId) {
  if (!confirm('Delete this item?')) return;
  
  try {
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      location.reload();
    }
  } catch (err) {
    alert('Error deleting item');
  }
}

// Add participant
async function addParticipant(e) {
  e.preventDefault();
  const name = document.getElementById('participant-name').value;

  try {
    const res = await fetch(`/api/bills/${BILL_ID}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (res.ok) {
      location.reload();
    } else {
      alert('Failed to add participant');
    }
  } catch (err) {
    alert('Error adding participant');
  }
}

// Delete participant
async function deleteParticipant(participantId) {
  if (!confirm('Remove this participant?')) return;
  
  try {
    const res = await fetch(`/api/participants/${participantId}`, { method: 'DELETE' });
    if (res.ok) {
      location.reload();
    }
  } catch (err) {
    alert('Error removing participant');
  }
}

// Toggle assignment
async function toggleAssignment(itemId, participantId, btn) {
  const isAssigned = btn.classList.contains('assigned');
  const method = isAssigned ? 'DELETE' : 'POST';
  
  try {
    const res = await fetch(`/api/items/${itemId}/assign/${participantId}`, { method });
    if (res.ok) {
      btn.classList.toggle('assigned');
      loadSummary();
    }
  } catch (err) {
    alert('Error updating assignment');
  }
}

// Update settings
let settingsTimeout;
async function updateSettings() {
  clearTimeout(settingsTimeout);
  settingsTimeout = setTimeout(async () => {
    const taxPercent = document.getElementById('tax-percent').value;
    const tipPercent = document.getElementById('tip-percent').value;

    try {
      const res = await fetch(`/api/bills/${BILL_ID}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tax_percent: taxPercent, tip_percent: tipPercent })
      });
      
      if (res.ok) {
        loadSummary();
      }
    } catch (err) {
      console.error('Error updating settings');
    }
  }, 500);
}

// Load summary
async function loadSummary() {
  const container = document.getElementById('summary-content');
  if (!container) return;

  try {
    const res = await fetch(`/api/bills/${BILL_ID}/summary`);
    const data = await res.json();

    if (data.shares.length === 0) {
      container.innerHTML = '<p class="empty-state">Add participants and assign items to see the breakdown.</p>';
      return;
    }

    let html = data.shares.map(share => `
      <div class="summary-person">
        <div class="summary-person-name">${share.name}</div>
        <div class="summary-person-total">${formatCurrency(share.total, CURRENCY)}</div>
        <div class="summary-breakdown">
          Items: ${formatCurrency(share.itemsTotal, CURRENCY)}
          ${share.tax > 0 ? `<br>Tax: ${formatCurrency(share.tax, CURRENCY)}` : ''}
          ${share.tip > 0 ? `<br>Tip: ${formatCurrency(share.tip, CURRENCY)}` : ''}
        </div>
      </div>
    `).join('');

    html += `
      <div class="summary-totals">
        <div class="summary-total-item">
          <label>Subtotal</label>
          <span>${formatCurrency(data.subtotal, CURRENCY)}</span>
        </div>
        ${data.tax > 0 ? `
          <div class="summary-total-item">
            <label>Tax</label>
            <span>${formatCurrency(data.tax, CURRENCY)}</span>
          </div>
        ` : ''}
        ${data.tip > 0 ? `
          <div class="summary-total-item">
            <label>Tip</label>
            <span>${formatCurrency(data.tip, CURRENCY)}</span>
          </div>
        ` : ''}
        <div class="summary-total-item">
          <label>Total</label>
          <span>${formatCurrency(data.total, CURRENCY)}</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p class="error">Failed to load summary</p>';
  }
}
