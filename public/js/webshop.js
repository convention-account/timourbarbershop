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
        cart = [];
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
    if (burger && navList) {
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
    }

    // Добавление товара в корзину (для страницы продукта)
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const product = {
                title: button.dataset.title,
                price: parseFloat(button.dataset.price),
                id: Date.now()
            };
            cart.push(product);
            setCookie('cart', cart, 7);
            updateCartCount(); // Обновляем только счетчик, если корзина не отображается
            alert(`${product.title} added to cart!`);
        });
    });

    // Логика корзины (только если все элементы присутствуют)
    const isCartAvailable = cartIcon && cartModal && closeCart && cartItemsContainer && cartCount && totalPriceElement && checkoutBtn;
    if (isCartAvailable) {
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

        // Обработка оплаты
        checkoutBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                alert(`Proceeding to payment with total: ${totalPriceElement.textContent}. Please implement payment logic here!`);
                cart = [];
                setCookie('cart', cart, 7);
                updateCart();
                cartModal.classList.remove('active');
                body.classList.remove('cart-open');
            } else {
                alert('Your cart is empty!');
            }
        });
    } else {
        console.warn('Полная функциональность корзины недоступна на этой странице');
    }

    // Обновление корзины (только если все элементы есть)
    function updateCart() {
        if (!isCartAvailable) return;
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

    // Обновление только счетчика корзины (для страниц без модального окна)
    function updateCartCount() {
        if (cartCount) {
            cartCount.textContent = cart.length;
        }
    }

    // Инициализация корзины при загрузке страницы
    if (isCartAvailable) {
        updateCart();
    } else {
        updateCartCount(); // Только обновляем счетчик на странице продукта
    }
});