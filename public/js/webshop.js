document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.burger-menu');
    const navList = document.querySelector('.nav-list');
    const body = document.body;
    const header = document.querySelector('header');
    const navItems = document.querySelectorAll('.nav-list li');
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.querySelector('.cart-modal');
    const closeCart = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCount = document.querySelector('.cart-count');
    const totalPriceElement = document.querySelector('.total-price');
    const checkoutBtn = document.querySelector('.checkout-btn');

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

    // Инициализация корзины из cookies с проверкой
    let cart = getCookie('cart');
    if (!Array.isArray(cart)) {
        cart = []; // Если cookie не массив или null, инициализируем пустым массивом
    }

    // Проверка наличия всех элементов
    if (!cartIcon || !cartModal || !closeCart || !cartItemsContainer || !cartCount || !totalPriceElement || !checkoutBtn) {
        console.error('Ошибка: один или несколько элементов корзины не найдены!');
        return;
    }

    // Фиксация header при скролле
    window.addEventListener('scroll', () => {
        if (window.innerWidth <= 768) {
            if (window.scrollY > 0) {
                header.classList.add('fixed');
            } else {
                header.classList.remove('fixed');
            }
        }
    });

    // Бургер-меню
    burger.addEventListener('click', () => {
        burger.classList.toggle('toggle');
        navList.classList.toggle('active');
        body.classList.toggle('menu-open');
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            burger.classList.remove('toggle');
            navList.classList.remove('active');
            body.classList.remove('menu-open');
        });
    });

    // Добавление товара в корзину
    document.querySelectorAll('.product-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productCard = button.closest('.product-card');
            const product = {
                title: productCard.querySelector('h2').textContent,
                price: parseFloat(productCard.querySelector('.product-price').textContent.match(/\d+/)[0]),
                id: Date.now()
            };
            cart.push(product);
            setCookie('cart', cart, 7); // Сохраняем корзину в cookie на 7 дней
            updateCart();
        });
    });

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
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        } else {
            cart.forEach((item, index) => {
                total += item.price;
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
        totalPriceElement.textContent = `${total} USDT`;
        setCookie('cart', cart, 7); // Обновляем cookie при каждом изменении корзины

        // Обработчики удаления
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                cart.splice(index, 1);
                setCookie('cart', cart, 7); // Сохраняем изменения в cookie
                updateCart();
            });
        });
    }

    // Обработка оплаты
    checkoutBtn.addEventListener('click', () => {
        if (cart.length > 0) {
            alert(`Proceeding to payment with total: ${totalPriceElement.textContent}. Please implement payment logic here!`);
            cart = [];
            setCookie('cart', cart, 7); // Очищаем cookie после оплаты
            updateCart();
            cartModal.classList.remove('active');
            body.classList.remove('cart-open');
        } else {
            alert('Your cart is empty!');
        }
    });

    // Инициализация корзины при загрузке страницы
    updateCart();
});