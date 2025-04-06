document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.burger-menu');
    const navList = document.querySelector('.nav-list');
    const body = document.body;
    const header = document.querySelector('header');
    const navItems = document.querySelectorAll('.nav-list li');

    // Функция для перемещения логотипа на мобильных устройствах
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

    // Вызываем функцию при загрузке страницы
    repositionLogo();

    // Обновляем позицию логотипа при изменении размера окна
    window.addEventListener('resize', repositionLogo);

    // Фиксация header при скролле для всех устройств
    window.addEventListener('scroll', () => {
        if (window.scrollY > 0) {
            header.classList.add('fixed');
        } else {
            header.classList.remove('fixed');
        }
    });

    // Обработка клика по бургер-меню
    burger.addEventListener('click', () => {
        burger.classList.toggle('toggle');
        navList.classList.toggle('active');
        body.classList.toggle('menu-open');
    });

    // Закрытие меню при клике на пункт меню
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            burger.classList.remove('toggle');
            navList.classList.remove('active');
            body.classList.remove('menu-open');
        });
    });

    // Существующий код скролла к второму блоку
    const scrollToSecond = document.querySelector('.scroll-to-second');
    if (scrollToSecond) {
        scrollToSecond.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.second-section').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Обработчики для .play-button-second
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
});

// Всплывающее уведомление
const cryptoPopup = document.querySelector('.crypto-popup');
const cryptoCloseBtn = document.querySelector('.crypto-close-btn');

if (cryptoPopup && cryptoCloseBtn) {
    // Показываем уведомление через 1 секунду после загрузки
    setTimeout(() => {
        cryptoPopup.classList.add('active');
    }, 1000);

    // Закрытие уведомления
    cryptoCloseBtn.addEventListener('click', () => {
        cryptoPopup.classList.remove('active');
        // Можно добавить cookie или localStorage, чтобы не показывать снова
        localStorage.setItem('cryptoPopupClosed', 'true');
    });

    // Проверяем, было ли уведомление уже закрыто
    if (localStorage.getItem('cryptoPopupClosed') !== 'true') {
        cryptoPopup.style.display = 'block';
    } else {
        cryptoPopup.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("fade-in"); // Анимация появления страницы

    document.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", function (e) {
            if (!this.href.includes(location.hostname)) return; // Игнорируем внешние ссылки
            e.preventDefault();

            document.body.classList.add("fade-out"); // Анимация исчезновения
            setTimeout(() => {
                window.location.href = this.href;
            }, 150); // Задержка в 0.5 секунды перед переходом
        });
    });
});
// Функция для проверки видимости элемента
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.top <= window.innerHeight * 0.8;
}

// Анимация при загрузке и скролле
document.addEventListener('DOMContentLoaded', () => {
    const loadingOverlay = document.querySelector('.loading-overlay');

    // Показать спиннер при клике на ссылку
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // Исключаем якорные ссылки, внешние ссылки и почтовые ссылки
            if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto')) {
                e.preventDefault(); // Предотвращаем немедленный переход
                loadingOverlay.classList.add('active');
                setTimeout(() => {
                    window.location.href = href; // Переход после активации спиннера
                }, 150); // Задержка для плавности
            }
        });
    });

    // Скрыть спиннер после полной загрузки страницы
    window.addEventListener('load', () => {
        loadingOverlay.classList.remove('active');
    });

    // Скрыть спиннер при возврате на страницу (включая bfcache)
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) { // Проверяем, загружается ли страница из кэша
            loadingOverlay.classList.remove('active');
        }
    });

    // Показать спиннер перед уходом со страницы
    window.addEventListener('beforeunload', () => {
        loadingOverlay.classList.add('active');
    });
});