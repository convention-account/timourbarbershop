// public/js/cart.js
document.addEventListener('DOMContentLoaded', () => {
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.querySelector('.cart-modal');
    const closeCart = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCount = document.querySelector('.cart-count');
    const totalPriceElement = document.querySelector('.total-price');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const body = document.body;

    // Функция для установки куки
    function setCookie(name, value, days) {
        if (!Array.isArray(value)) {
            console.error('Cart must be an array:', value);
            value = [];
        }
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        const cookieValue = encodeURIComponent(JSON.stringify(value)) + (days ? `; expires=${expires.toUTCString()}` : '');
        document.cookie = `${name}=${cookieValue}; path=/`;
    }

    // Функция для получения куки
    function getCookie(name) {
        const nameEQ = name + "=";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                try {
                    return JSON.parse(decodeURIComponent(cookie.substring(nameEQ.length)));
                } catch (error) {
                    console.error('Error parsing cookie:', error.message);
                    return [];
                }
            }
        }
        return [];
    }

    // Инициализация корзины из куки
    let cart = getCookie('cart');

    // Проверка наличия всех элементов корзины на странице
    if (!cartIcon || !cartModal || !closeCart || !cartItemsContainer || !cartCount || !totalPriceElement || !checkoutBtn) {
        console.warn('Cart elements not found on this page. Skipping cart initialization.');
        if (cartIcon && cartCount) {
            cartCount.textContent = cart.length;
        }
        return;
    }

    // Открытие модального окна корзины
    cartIcon.addEventListener('click', () => {
        cartModal.classList.add('active');
        body.classList.add('cart-open');
        updateCart();
    });

    // Закрытие модального окна корзины
    closeCart.addEventListener('click', () => {
        cartModal.classList.remove('active');
        body.classList.remove('cart-open');
    });

    // Обновление отображения корзины
    function updateCart() {
        cartItemsContainer.innerHTML = '';
        let totalUSDT = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        } else {
            cart.forEach((item, index) => {
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

        cartCount.textContent = cart.length;
        totalPriceElement.textContent = `${totalUSDT} USDT`;

        const totalEUR = totalUSDT * 0.9;
        const minimumOrderEUR = 50;

        const existingMessage = cartItemsContainer.querySelector('.min-order-message');
        if (existingMessage) existingMessage.remove();

        if (totalEUR < minimumOrderEUR && cart.length > 0) {
            const message = document.createElement('p');
            message.classList.add('min-order-message');
            message.style.color = '#ff4444';
            message.style.textAlign = 'center';
            message.textContent = `Minimum order sum is ${minimumOrderEUR} EUR. Add more items.`;
            cartItemsContainer.appendChild(message);
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        } else {
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
        }

        setCookie('cart', cart, 7);

        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                cart.splice(index, 1);
                setCookie('cart', cart, 7);
                updateCart();
            });
        });
    }

    // Обработка нажатия кнопки "Checkout"
    checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const totalUSDT = parseFloat(totalPriceElement.textContent.match(/\d+(\.\d+)?/)[0]);
        const totalEUR = totalUSDT * 0.9;
        const minimumOrderEUR = 50;

        if (cart.length === 0) {
            showAlert('Your cart is empty!');
            return;
        }

        if (totalEUR < minimumOrderEUR) {
            showAlert(`Minimum order sum is ${minimumOrderEUR} EUR. Add more items.`);
            return;
        }

        window.location.href = '/checkout';
    });

    // Функция для отображения пользовательского уведомления
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

    // Инициализация корзины при загрузке страницы
    updateCart();
});