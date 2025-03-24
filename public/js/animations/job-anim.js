document.addEventListener('DOMContentLoaded', () => {
    // Анимация появления
    const elements = document.querySelectorAll('.headline-main, .headline-sub, .job-text, .apply-title, .form-group, .form-btn');

    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight * 0.8;
    }

    function checkVisibility() {
        elements.forEach(el => {
            if (isInViewport(el)) {
                el.classList.add('visible');
            }
        });
    }

    // Проверяем видимость сразу при загрузке
    checkVisibility();
    window.addEventListener('scroll', checkVisibility);

    // Показ попапа
    const popup = document.querySelector('.crypto-popup');
    if (popup) {
        setTimeout(() => popup.classList.add('active'), 2000);
        document.querySelector('.crypto-close-btn').addEventListener('click', () => {
            popup.classList.remove('active');
        });
    }

    // Оптимизация для мобильных: уменьшаем задержку анимации
    if (window.innerWidth <= 768) {
        elements.forEach(el => {
            el.style.transitionDuration = '0.3s'; // Ускоряем анимацию на мобильных
        });
    }
});