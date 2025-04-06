function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

let cart;
try {
    const rawCart = getCookie('voucherCart') || '[]';
    cart = JSON.parse(rawCart);
} catch (error) {
    console.error('Error parsing voucher cart:', error.message);
    cart = [];
}

const cartSummary = document.getElementById('voucher-cart-summary');
if (cartSummary) {
    if (cart.length > 0) {
        let totalUSDT = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        cartSummary.innerHTML = `
            <h3>Your Vouchers:</h3>
            <ul style="list-style: none; padding: 0;">
                ${cart.map(item => `<li>${item.title} - ${item.price} USDT</li>`).join('')}
            </ul>
            <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
        `;
    } else {
        cartSummary.innerHTML = '<p>Your voucher cart is empty. Please add vouchers before checking out.</p>';
        document.querySelector('.checkout-btn').disabled = true;
    }
}

const checkoutForm = document.getElementById('voucher-checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = checkoutForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        const formData = new FormData(checkoutForm);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/voucher-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (response.ok) {
                document.cookie = 'voucherCart=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                window.location.href = result.redirect;
            } else {
                alert(result.error || 'An error occurred during checkout');
                submitButton.disabled = false;
                submitButton.textContent = 'Place Order';
            }
        } catch (error) {
            console.error('Error processing voucher checkout:', error);
            alert('Error processing checkout: ' + error.message);
            submitButton.disabled = false;
            submitButton.textContent = 'Place Order';
        }
    });
}

// Функция для копирования адреса
function copyAddress() {
    const address = 'TSLutTokZzNEnz1fb8NBDWrgE2GEYF2xet';
    navigator.clipboard.writeText(address).then(() => {
        alert('Address copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy address:', err);
        alert('Failed to copy address. Please copy it manually.');
    });
}