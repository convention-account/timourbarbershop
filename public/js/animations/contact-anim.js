document.addEventListener('DOMContentLoaded', () => {
    // Анимация появления
    const elements = document.querySelectorAll('.headline-main, .headline-sub, .contact-text, .social-links a, .form-title, .form-group, .form-btn');

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
});