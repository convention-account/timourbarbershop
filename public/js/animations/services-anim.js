document.addEventListener('DOMContentLoaded', () => {
    // Анимация появления
    const cards = document.querySelectorAll('.service-card');
    const introElements = document.querySelectorAll('.headline-main, .headline-sub, .welcome-text');

    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight * 0.8;
    }

    function checkVisibility() {
        introElements.forEach(el => {
            if (isInViewport(el)) {
                el.classList.add('visible');
            }
        });

        cards.forEach(card => {
            if (isInViewport(card)) {
                card.classList.add('visible');
            }
        });
    }

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