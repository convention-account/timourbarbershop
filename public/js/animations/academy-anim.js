document.addEventListener('DOMContentLoaded', () => {
    // Параллакс
    document.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const mediaImage = document.querySelector('.media-image');
        if (mediaImage) {
            const offsetMedia = scrollPosition * 0.15;
            mediaImage.style.transform = `translateY(${offsetMedia}px)`;
        }
    });

    // Анимация появления
    const elements = document.querySelectorAll('.headline-main, .headline-sub, .welcome-text, .blog-text, .additional-info, .academy-text, .benefits-title, .benefits-list, .benefits-list li, .about-text, .achievements-title, .achievements-list, .achievements-list li');
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

    // Если движение больше по горизонтали, чем по вертикали, предотвращаем прокрутку
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
    }
}, { passive: false });