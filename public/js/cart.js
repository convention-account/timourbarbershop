document.addEventListener('DOMContentLoaded', () => {
    const isCheckoutPage = window.location.pathname === '/checkout';
    const isVoucherCheckoutPage = window.location.pathname === '/voucher-checkout';

    if (isCheckoutPage || isVoucherCheckoutPage) {
        console.log(`On ${isCheckoutPage ? 'checkout' : 'voucher checkout'} page, skipping full cart initialization.`);
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const cart = getCookie(isCheckoutPage ? 'cart' : 'voucherCart');
            cartCount.textContent = cart.length;
        }
        return;
    }

    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.querySelector('.cart-modal');
    const closeCart = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCount = document.querySelector('.cart-count');
    const totalPriceElement = document.querySelector('.total-price');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const body = document.body;

    function setCookie(name, value, days) {
        if (!Array.isArray(value)) {
            console.error(`${name} must be an array:`, value);
            value = [];
        }
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        const cookieValue = encodeURIComponent(JSON.stringify(value)) + (days ? `; expires=${expires.toUTCString()}` : '');
        document.cookie = `${name}=${cookieValue}; path=/`;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                try {
                    return JSON.parse(decodeURIComponent(cookie.substring(nameEQ.length)));
                } catch (error) {
                    console.error(`Error parsing ${name} cookie:`, error.message);
                    return [];
                }
            }
        }
        return [];
    }

    let cart = getCookie('cart');
    let voucherCart = getCookie('voucherCart');
    const isServicesPage = window.location.pathname === '/services';

    if (!cartIcon || !cartModal || !closeCart || !cartItemsContainer || !cartCount || !totalPriceElement || !checkoutBtn) {
        console.warn('Cart elements not found on this page. Skipping cart initialization.');
        if (cartIcon && cartCount) {
            cartCount.textContent = (isServicesPage ? voucherCart : cart).length;
        }
        return;
    }

    cartIcon.addEventListener('click', () => {
        cartModal.classList.add('active');
        body.classList.add('cart-open');
        updateCart();
    });

    closeCart.addEventListener('click', () => {
        cartModal.classList.remove('active');
        body.classList.remove('cart-open');
    });

    function updateCart() {
        const currentCart = isServicesPage ? voucherCart : cart;
        cartItemsContainer.innerHTML = '';
        let totalUSDT = 0;

        if (currentCart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        } else {
            currentCart.forEach((item, index) => {
                totalUSDT += parseFloat(item.price);
                const cartItem = document.createElement('div');
                cartItem.classList.add('cart-item');
                cartItem.innerHTML = `
                    <span class="cart-item-title">${item.title}</span>
                    <span class="cart-item-price">${item.price} USDT</span>
                    <button class="remove-item" data-index="${index}">Delete</button>
                `;
                cartItemsContainer.appendChild(cartItem);
            });
        }

        cartCount.textContent = currentCart.length;
        totalPriceElement.textContent = `${totalUSDT.toFixed(2)} USDT`;
        checkoutBtn.href = isServicesPage ? '/voucher-checkout' : '/checkout';

        setCookie(isServicesPage ? 'voucherCart' : 'cart', currentCart, 7);

        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (isServicesPage) {
                    voucherCart.splice(index, 1);
                    setCookie('voucherCart', voucherCart, 7);
                } else {
                    cart.splice(index, 1);
                    setCookie('cart', cart, 7);
                }
                updateCart();
            });
        });
    }

    checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentCart = isServicesPage ? voucherCart : cart;
        if (currentCart.length === 0) {
            showAlert('Your cart is empty!');
            return;
        }
        window.location.href = isServicesPage ? '/voucher-checkout' : '/checkout';
    });

    function showAlert(message) {
        const customAlert = document.getElementById('custom-alert');
        const customAlertMessage = document.getElementById('custom-alert-message');
        const customAlertClose = document.querySelector('.custom-alert-close');

        if (customAlert && customAlertMessage && customAlertClose) {
            customAlertMessage.textContent = message;
            customAlert.style.display = 'flex';
            customAlertClose.addEventListener('click', () => {
                customAlert.style.display = 'none';
            }, { once: true });
        }
    }

    // Add to cart logic for vouchers
    document.querySelectorAll('.service-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const title = button.closest('.service-content').querySelector('h2').textContent;
            const priceText = button.closest('.service-content').querySelector('.service-price').textContent.match(/(\d+\.?\d*)/)[0];
            const voucher = {
                title: title, // Используем только заголовок, например "Voucher for Haircut & Beard Trim (Crypto)"
                price: parseFloat(priceText),
                id: Date.now()
            };
            voucherCart.push(voucher);
            setCookie('voucherCart', voucherCart, 7);
            updateCart();
        });
    });

    updateCart();
});