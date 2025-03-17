// public/js/cart.js
document.addEventListener('DOMContentLoaded', () => {
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.querySelector('.cart-modal');
    const closeCart = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCount = document.querySelector('.cart-count');
    const totalPriceElement = document.querySelector('.total-price');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const paymentForm = document.getElementById('payment-form');
    const body = document.body;

    // Вспомогательные функции для работы с cookies
    function setCookie(name, value, days) {
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
                return JSON.parse(decodeURIComponent(cookie.substring(nameEQ.length)));
            }
        }
        return null;
    }

    // Инициализация корзины из cookies
    let cart = getCookie('cart') || [];

    // Проверка наличия всех элементов
    if (!cartIcon || !cartModal || !closeCart || !cartItemsContainer || !cartCount || !totalPriceElement || !checkoutBtn || !paymentForm) {
        console.error('Ошибка: один или несколько элементов корзины не найдены!');
        return;
    }

    // Открытие корзины
    cartIcon.addEventListener('click', () => {
        cartModal.classList.add('active');
        body.classList.add('cart-open');
        updateCart();
    });

    // Закрытие корзины
    closeCart.addEventListener('click', () => {
        cartModal.classList.remove('active');
        body.classList.remove('cart-open');
    });

    // Обновление корзины
    function updateCart() {
        cartItemsContainer.innerHTML = '';
        let totalUSDT = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        } else {
            cart.forEach((item, index) => {
                totalUSDT += item.price;
                const cartItem = document.createElement('div');
                cartItem.classList.add('cart-item');
                cartItem.innerHTML = `
                    <span class="cart-item-title">${item.title}</span>
                    <span class="cart-item-price">${item.price} USDT</span>
                    <button class="remove-item" data-index="${index}">Remove</button>
                `;
                cartItemsContainer.appendChild(cartItem);
            });
        }

        cartCount.textContent = cart.length;
        totalPriceElement.textContent = `${totalUSDT} USDT`;

        // Конвертация USDT в евро (1 USDT ≈ 0.9 EUR)
        const totalEUR = totalUSDT * 0.9;
        const minimumOrderEUR = 50;

        // Управление состоянием кнопки и сообщением
        const existingMessage = cartItemsContainer.querySelector('.min-order-message');
        if (existingMessage) existingMessage.remove(); // Удаляем старое сообщение

        if (totalEUR < minimumOrderEUR && cart.length > 0) {
            const message = document.createElement('p');
            message.classList.add('min-order-message');
            message.style.color = '#ff4444';
            message.style.textAlign = 'center';
            message.textContent = `Minimum order amount is ${minimumOrderEUR} EUR. Add more items to proceed.`;
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

        // Обработчики удаления
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                cart.splice(index, 1);
                setCookie('cart', cart, 7);
                updateCart();
            });
        });
    }

    // Обработка оплаты через Plisio
    checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Предотвращаем действие по умолчанию
        const totalUSDT = parseFloat(totalPriceElement.textContent.match(/\d+/)[0]);
        const totalEUR = totalUSDT * 0.9;
        const minimumOrderEUR = 50;

        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        if (totalEUR < minimumOrderEUR) {
            alert(`Minimum order amount is ${minimumOrderEUR} EUR. Please add more items to proceed.`);
            return;
        }

        // Заполняем форму Plisio
        document.getElementById('cart-amount').value = totalUSDT;
        paymentForm.submit(); // Отправляем форму на Plisio
    });

    // Инициализация корзины при загрузке страницы
    updateCart();
});