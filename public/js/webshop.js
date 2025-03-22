// public/js/webshop.js
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

    // Функция анимации полета товара в корзину
    function flyToCart(button) {
        const cartIconRect = cartIcon.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();

        // Создаем элемент для анимации (копия изображения товара или просто иконка)
        const flyingItem = document.createElement('div');
        flyingItem.classList.add('flying-item');
        
        // Используем первое изображение из галереи как основу
        const productImage = document.querySelector('.product-gallery .product-image');
        if (productImage) {
            flyingItem.style.backgroundImage = `url(${productImage.src})`;
            flyingItem.style.backgroundSize = 'cover';
        } else {
            flyingItem.textContent = '🛒'; // Запасной вариант - иконка
        }

        // Устанавливаем начальную позицию (от кнопки)
        flyingItem.style.position = 'fixed';
        flyingItem.style.left = `${buttonRect.left + buttonRect.width / 2 - 25}px`; // Центр кнопки
        flyingItem.style.top = `${buttonRect.top + buttonRect.height / 2 - 25}px`;
        flyingItem.style.width = '50px';
        flyingItem.style.height = '50px';
        flyingItem.style.borderRadius = '50%';
        flyingItem.style.zIndex = '3000';
        document.body.appendChild(flyingItem);

        // Анимация полета
        const deltaX = cartIconRect.left + cartIconRect.width / 2 - (buttonRect.left + buttonRect.width / 2);
        const deltaY = cartIconRect.top + cartIconRect.height / 2 - (buttonRect.top + buttonRect.height / 2);

        flyingItem.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.5)`, opacity: 0.7 }
        ], {
            duration: 800, // Длительность анимации в миллисекундах
            easing: 'ease-in-out',
            fill: 'forwards'
        });

        // Удаляем элемент после завершения анимации
        setTimeout(() => {
            flyingItem.remove();
            updateCartCount(); // Обновляем счетчик после анимации
        }, 800);
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
            flyToCart(button); // Запускаем анимацию вместо alert
            if (isCartAvailable) updateCart(); // Обновляем корзину, если она доступна
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

        // Обработка перехода на чекаут
        checkoutBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                window.location.href = '/checkout';
            } else {
                const customAlert = document.getElementById('custom-alert');
                const customAlertMessage = document.getElementById('custom-alert-message');
                const customAlertClose = document.querySelector('.custom-alert-close');

                customAlertMessage.textContent = 'Your cart is empty!';
                customAlert.style.display = 'flex';

                customAlertClose.addEventListener('click', () => {
                    customAlert.style.display = 'none';
                });
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
            cartItemsContainer.innerHTML = '<p>Ваша корзина пуста</p>';
        } else {
            cart.forEach((item, index) => {
                total += item.price;
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

    // Обновление только счетчика корзины
    function updateCartCount() {
        if (cartCount) {
            cartCount.textContent = cart.length;
        }
    }

    // Инициализация корзины при загрузке страницы
    if (isCartAvailable) {
        updateCart();
    } else {
        updateCartCount();
    }
});