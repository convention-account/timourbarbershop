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
    
        console.log('Current cart:', currentCart);
    
        if (currentCart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        } else {
            currentCart.forEach((item, index) => {
                const itemPrice = parseFloat(item.price);
                if (isNaN(itemPrice)) {
                    console.error(`Invalid price for item ${item.title}: ${item.price}`);
                    return;
                }
                totalUSDT += itemPrice;
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
    
        setCookie(isServicesPage ? 'voucherCart' : 'cart', currentCart, 7);
    
        // Проверка минимальной суммы заказа (50 EUR ≈ 55 USDT)
        const minOrderAmount = 55; // 50 EUR ≈ 55 USDT
        const minOrderMessage = document.querySelector('.min-order-message');
        const cartTotalElement = document.querySelector('.cart-total');
    
        console.log('Total USDT:', totalUSDT);
    
        if (!minOrderMessage) {
            const messageElement = document.createElement('p');
            messageElement.classList.add('min-order-message');
            messageElement.textContent = 'Minimum order amount is 50 EUR (~55 USDT). Please add more items to your cart.';
            cartItemsContainer.parentNode.insertBefore(messageElement, cartTotalElement);
        }
    
        // Управление состоянием кнопки
        if (!isServicesPage && totalUSDT < minOrderAmount) {
            checkoutBtn.setAttribute('disabled', 'true');
            checkoutBtn.classList.add('disabled');
            checkoutBtn.title = 'Minimum order amount is 50 EUR (~55 USDT)';
            document.querySelector('.min-order-message').style.display = 'block';
            console.log('Button disabled: Sum is less than 55 USDT');
        } else {
            checkoutBtn.removeAttribute('disabled');
            checkoutBtn.classList.remove('disabled');
            checkoutBtn.title = '';
            if (document.querySelector('.min-order-message')) {
                document.querySelector('.min-order-message').style.display = 'none';
            }
            console.log('Button enabled: Sum is 55 USDT or more');
        }
    
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
    
    // Обработчик клика для кнопки Checkout
    checkoutBtn.removeEventListener('click', checkoutBtn._clickHandler); // Удаляем старый обработчик
    checkoutBtn._clickHandler = () => {
        // Проверяем, заблокирована ли кнопка
        if (checkoutBtn.hasAttribute('disabled')) {
            console.log('Click ignored: Button is disabled due to insufficient amount');
            return; // Ничего не делаем, если кнопка заблокирована
        }
    
        const currentCart = isServicesPage ? voucherCart : cart;
        const totalUSDT = currentCart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const minOrderAmount = 55; // 50 EUR ≈ 55 USDT
    
        console.log('Checkout button clicked. Total USDT:', totalUSDT);
    
        if (currentCart.length === 0) {
            showAlert('Your cart is empty!');
            return;
        }
    
        // Дополнительная проверка на случай, если что-то пошло не так
        if (!isServicesPage && totalUSDT < minOrderAmount) {
            console.log('Click ignored: Sum is less than 55 USDT');
            showAlert('Minimum order amount is 50 EUR (~55 USDT). Please add more items.');
            return;
        }
    
        console.log('Proceeding to checkout');
        window.location.href = isServicesPage ? '/voucher-checkout' : '/checkout';
    };
    checkoutBtn.addEventListener('click', checkoutBtn._clickHandler);

    // Удаляем существующие обработчики, чтобы избежать дублирования
    checkoutBtn.removeEventListener('click', checkoutBtn._clickHandler);
    checkoutBtn._clickHandler = () => {
        // Проверяем, заблокирована ли кнопка
        if (checkoutBtn.hasAttribute('disabled')) {
            console.log('Click ignored: Button is disabled');
            return;
        }

        const currentCart = isServicesPage ? voucherCart : cart;
        const totalUSDT = currentCart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const minOrderAmount = 55; // 50 EUR ≈ 55 USDT

        console.log('Checkout button clicked. Total USDT:', totalUSDT);

        if (currentCart.length === 0) {
            showAlert('Your cart is empty!');
            return;
        }

        if (!isServicesPage && totalUSDT < minOrderAmount) {
            console.log('Click ignored: Sum is less than 55 USDT');
            return;
        }

        console.log('Proceeding to checkout');
        window.location.href = isServicesPage ? '/voucher-checkout' : '/checkout';
    };
    checkoutBtn.addEventListener('click', checkoutBtn._clickHandler);

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
                title: title,
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