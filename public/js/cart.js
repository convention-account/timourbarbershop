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

    if (!cartIcon || !cartModal || !closeCart || !cartItemsContainer || !cartCount || !totalPriceElement || !checkoutBtn) {
        console.warn('Cart elements not found on this page. Skipping cart initialization.');
        if (cartIcon && cartCount) {
            const cart = getCookie('cart');
            cartCount.textContent = cart.length;
        }
        return;
    }

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
            cartItemsContainer.innerHTML = '<p>Ваша корзина пуста</p>';
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
                    <button class="remove-item" data-index="${index}">Удалить</button>
                `;
                cartItemsContainer.appendChild(cartItem);
            });
        }

        cartCount.textContent = currentCart.length;
        totalPriceElement.textContent = `${totalUSDT.toFixed(2)} USDT`;

        setCookie(isServicesPage ? 'voucherCart' : 'cart', currentCart, 7);

        // Проверка условий для отключения кнопки
        const minOrderAmount = 55; // 50 EUR ≈ 55 USDT
        const minOrderMessage = document.querySelector('.min-order-message');
        const cartTotalElement = document.querySelector('.cart-total');

        if (!minOrderMessage) {
            const messageElement = document.createElement('p');
            messageElement.classList.add('min-order-message');
            messageElement.textContent = 'Минимальная сумма заказа — 50 EUR (~55 USDT). Добавьте ещё товаров.';
            cartItemsContainer.parentNode.insertBefore(messageElement, cartTotalElement);
        }

        // Управление состоянием кнопки и сообщения
        if (currentCart.length === 0) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('disabled');
            document.querySelector('.min-order-message').style.display = 'none';
            console.log('Кнопка отключена: Корзина пуста');
        } else if (!isServicesPage && totalUSDT < minOrderAmount) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('disabled');
            document.querySelector('.min-order-message').style.display = 'block';
            console.log('Кнопка отключена: Сумма меньше 55 USDT');
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('disabled');
            document.querySelector('.min-order-message').style.display = 'none';
            console.log('Кнопка активна');
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

    // Удаляем все предыдущие обработчики клика, чтобы избежать дублирования
    while (checkoutBtn._clickHandlers && checkoutBtn._clickHandlers.length) {
        checkoutBtn.removeEventListener('click', checkoutBtn._clickHandlers.pop());
    }

    // Добавляем новый обработчик клика
    const handleCheckoutClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (checkoutBtn.disabled || checkoutBtn.classList.contains('disabled')) {
            console.log('Клик проигнорирован: кнопка отключена');
            return;
        }

        const currentCart = isServicesPage ? voucherCart : cart;
        const totalUSDT = currentCart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const minOrderAmount = 55;

        if (currentCart.length === 0) {
            showAlert('Ваша корзина пуста!');
            return;
        }

        if (!isServicesPage && totalUSDT < minOrderAmount) {
            showAlert('Минимальная сумма заказа — 50 EUR (~55 USDT). Добавьте ещё товаров.');
            return;
        }

        console.log('Переход на checkout');
        window.location.href = isServicesPage ? '/voucher-checkout' : '/checkout';
    };

    checkoutBtn.addEventListener('click', handleCheckoutClick);

    // Сохраняем обработчик для возможного удаления
    if (!checkoutBtn._clickHandlers) {
        checkoutBtn._clickHandlers = [];
    }
    checkoutBtn._clickHandlers.push(handleCheckoutClick);

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

    // Логика добавления товаров в корзину (для Webshop)
    document.querySelectorAll('.product-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productCard = button.closest('.product-card');
            const title = productCard.querySelector('h2').textContent;
            const priceText = productCard.querySelector('.product-price').textContent.match(/(\d+\.?\d*)/)[0];
            const product = {
                title: title,
                price: parseFloat(priceText),
                id: Date.now()
            };
            cart.push(product);
            setCookie('cart', cart, 7);
            updateCart();

            // Анимация полета товара в корзину
            const flyingItem = document.createElement('div');
            flyingItem.classList.add('flying-item');
            const rect = button.getBoundingClientRect();
            flyingItem.style.left = `${rect.left + rect.width / 2 - 25}px`;
            flyingItem.style.top = `${rect.top + rect.height / 2 - 25}px`;
            document.body.appendChild(flyingItem);

            const cartIconRect = cartIcon.getBoundingClientRect();
            const targetX = cartIconRect.left + cartIconRect.width / 2 - 25;
            const targetY = cartIconRect.top + cartIconRect.height / 2 - 25;

            flyingItem.animate([
                { transform: `translate(0, 0)` },
                { transform: `translate(${targetX - rect.left - rect.width / 2 + 25}px, ${targetY - rect.top - rect.height / 2 + 25}px)` }
            ], {
                duration: 500,
                easing: 'ease-in-out'
            }).onfinish = () => {
                flyingItem.remove();
            };
        });
    });

    // Логика добавления услуг в корзину (для Services)
    document.querySelectorAll('.service-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const serviceContent = button.closest('.service-content');
            const title = serviceContent.querySelector('h2').textContent;
            const priceText = serviceContent.querySelector('.service-price').textContent.match(/(\d+\.?\d*)/)[0];
            const voucher = {
                title: title,
                price: parseFloat(priceText),
                id: Date.now()
            };
            voucherCart.push(voucher);
            setCookie('voucherCart', voucherCart, 7);
            updateCart();

            // Анимация полета услуги в корзину
            const flyingItem = document.createElement('div');
            flyingItem.classList.add('flying-item');
            const rect = button.getBoundingClientRect();
            flyingItem.style.left = `${rect.left + rect.width / 2 - 25}px`;
            flyingItem.style.top = `${rect.top + rect.height / 2 - 25}px`;
            document.body.appendChild(flyingItem);

            const cartIconRect = cartIcon.getBoundingClientRect();
            const targetX = cartIconRect.left + cartIconRect.width / 2 - 25;
            const targetY = cartIconRect.top + cartIconRect.height / 2 - 25;

            flyingItem.animate([
                { transform: `translate(0, 0)` },
                { transform: `translate(${targetX - rect.left - rect.width / 2 + 25}px, ${targetY - rect.top - rect.height / 2 + 25}px)` }
            ], {
                duration: 500,
                easing: 'ease-in-out'
            }).onfinish = () => {
                flyingItem.remove();
            };
        });
    });

    updateCart();
});