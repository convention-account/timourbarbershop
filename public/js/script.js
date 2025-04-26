document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.burger-menu');
    const navList = document.querySelector('.nav-list');
    const body = document.body;
    const header = document.querySelector('header');
    const navItems = document.querySelectorAll('.nav-list li');
    const loadingOverlay = document.querySelector('.loading-overlay');
    const cartIcon = document.querySelector('.cart-icon');

    // --- Логика корзины ---
    const isCheckoutPage = window.location.pathname === '/checkout';
    const isVoucherCheckoutPage = window.location.pathname === '/voucher-checkout';
    const cartModal = document.querySelector('.cart-modal');
    const closeCart = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCount = document.querySelector('.cart-count');
    const totalPriceElement = document.querySelector('.total-price');
    const checkoutBtn = document.querySelector('.checkout-btn');

    // Пропускаем полную инициализацию корзины на страницах checkout
    if (isCheckoutPage || isVoucherCheckoutPage) {
        console.log(`On ${isCheckoutPage ? 'checkout' : 'voucher checkout'} page, skipping full cart initialization.`);
        if (cartCount) {
            const cart = getCookie(isCheckoutPage ? 'cart' : 'voucherCart');
            cartCount.textContent = cart.length;
        }
    } else if (cartIcon && cartModal && closeCart && cartItemsContainer && cartCount && totalPriceElement && checkoutBtn) {
        let cart = getCookie('cart');
        let voucherCart = getCookie('voucherCart');
        const isServicesPage = window.location.pathname === '/services';

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

        function updateCart() {
            const currentCart = isServicesPage ? voucherCart : cart;
            cartItemsContainer.innerHTML = '';
            let totalUSDT = 0;

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

            const minOrderAmount = 55;
            const minOrderMessage = document.querySelector('.min-order-message');
            const cartTotalElement = document.querySelector('.cart-total');

            if (!minOrderMessage) {
                const messageElement = document.createElement('p');
                messageElement.classList.add('min-order-message');
                messageElement.textContent = 'Minimum sum of order — 50 EUR (~55 USDT). Add more items.';
                cartItemsContainer.parentNode.insertBefore(messageElement, cartTotalElement);
            }

            if (currentCart.length === 0) {
                checkoutBtn.disabled = true;
                checkoutBtn.classList.add('disabled');
                document.querySelector('.min-order-message').style.display = 'none';
                console.log('Button off: Cart is empty');
            } else if (!isServicesPage && totalUSDT < minOrderAmount) {
                checkoutBtn.disabled = true;
                checkoutBtn.classList.add('disabled');
                document.querySelector('.min-order-message').style.display = 'block';
                console.log('Button off: Sum < 55 USDT');
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

        cartIcon.addEventListener('click', () => {
            cartModal.classList.add('active');
            body.classList.add('cart-open');
            updateCart();
        });

        closeCart.addEventListener('click', () => {
            cartModal.classList.remove('active');
            body.classList.remove('cart-open');
        });

        const handleCheckoutClick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (checkoutBtn.disabled || checkoutBtn.classList.contains('disabled')) {
                console.log('Click ignored: button off');
                return;
            }

            const currentCart = isServicesPage ? voucherCart : cart;
            const totalUSDT = currentCart.reduce((sum, item) => sum + parseFloat(item.price), 0);
            const minOrderAmount = 55;

            if (currentCart.length === 0) {
                showAlert('Your cart is empty!');
                return;
            }

            if (!isServicesPage && totalUSDT < minOrderAmount) {
                showAlert('Minimum order sum — 50 EUR (~55 USDT). Add more items.');
                return;
            }

            console.log('Переход на checkout');
            window.location.href = isServicesPage ? '/voucher-checkout' : '/checkout';
        };

        checkoutBtn.addEventListener('click', handleCheckoutClick);

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

        // Обработчик для кнопок на странице списка товаров (webshop)
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

        // Обработчик для кнопки на странице отдельного продукта
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const title = button.dataset.title;
                const price = parseFloat(button.dataset.price);
                const product = {
                    title: title,
                    price: price,
                    id: Date.now()
                };
                cart.push(product);
                setCookie('cart', cart, 7);
                updateCart();

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

        // Обработчик для кнопок услуг (services)
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
    } else if (cartIcon && cartCount) {
        const cart = getCookie('cart');
        cartCount.textContent = cart.length;
    }

    // --- Логика закрепления корзины при скролле ---
    window.addEventListener('scroll', () => {
        if (cartIcon) {
            if (window.scrollY > 100) { // Добавляем класс при скролле больше 100px
                cartIcon.classList.add('cart-icon-scrolled');
            } else {
                cartIcon.classList.remove('cart-icon-scrolled');
            }
        }
    });

    // --- Существующая логика из script.js ---
    const repositionLogo = () => {
        const logo = document.querySelector('.logo');
        const navbar = document.querySelector('.navbar');
        const loginNav = document.querySelector('.login-nav');

        if (logo && navbar && loginNav && window.innerWidth <= 768) {
            logo.remove();
            header.insertBefore(logo, loginNav);
        } else if (logo && window.innerWidth > 768) {
            logo.remove();
            header.insertBefore(logo, navbar);
        }
    };

    repositionLogo();
    window.addEventListener('resize', repositionLogo);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 0) {
            header.classList.add('fixed');
        } else {
            header.classList.remove('fixed');
        }
    });

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

    const scrollToSecond = document.querySelector('.scroll-to-second');
    if (scrollToSecond) {
        scrollToSecond.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.second-section').scrollIntoView({ behavior: 'smooth' });
        });
    }

    const playButtons = document.querySelectorAll('.play-button-second');
    playButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const scrollDistance = 600;
            window.scrollBy({
                top: scrollDistance,
                behavior: 'smooth'
            });
        });
    });

    // Всплывающее уведомление
    const cryptoPopup = document.querySelector('.crypto-popup');
    const cryptoCloseBtn = document.querySelector('.crypto-close-btn');

    if (cryptoPopup && cryptoCloseBtn) {
        setTimeout(() => {
            cryptoPopup.classList.add('active');
        }, 1000);

        cryptoCloseBtn.addEventListener('click', () => {
            cryptoPopup.classList.remove('active');
            localStorage.setItem('cryptoPopupClosed', 'true');
        });

        if (localStorage.getItem('cryptoPopupClosed') !== 'true') {
            cryptoPopup.style.display = 'block';
        } else {
            cryptoPopup.style.display = 'none';
        }
    }

    // Анимация появления страницы
    document.body.classList.add('fade-in');

    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = link.getAttribute('href');
            if (!href.includes(location.hostname) || href.startsWith('#') || href.startsWith('mailto')) return;
            e.preventDefault();
            document.body.classList.add('fade-out');
            loadingOverlay.classList.add('active');
            setTimeout(() => {
                window.location.href = href;
            }, 150);
        });
    });

    // Спиннер при загрузке
    window.addEventListener('load', () => {
        loadingOverlay.classList.remove('active');
    });

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            loadingOverlay.classList.remove('active');
        }
    });

    window.addEventListener('beforeunload', () => {
        loadingOverlay.classList.add('active');
    });
});

// Проверка видимости элемента
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.top <= window.innerHeight * 0.8;
}

// Обработка касаний
let startX = 0;
let startY = 0;

document.addEventListener('touchstart', function (e) {
    startX = e.touches[0].pageX;
    startY = e.touches[0].pageY;
}, { passive: true });

document.addEventListener('touchmove', function (e) {
    const touch = e.touches[0];
    const deltaX = touch.pageX - startX;
    const deltaY = touch.pageY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
    }
}, { passive: false });