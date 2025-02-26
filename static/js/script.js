document.addEventListener('DOMContentLoaded', () => {
    const burger = document.querySelector('.burger-menu');
    const navList = document.querySelector('.nav-list');

    burger.addEventListener('click', () => {
        navList.classList.toggle('active'); // Переключаем видимость меню

        // Анимация бургера в крестик
        burger.classList.toggle('toggle');
    });
});