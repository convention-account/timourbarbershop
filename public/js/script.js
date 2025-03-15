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

