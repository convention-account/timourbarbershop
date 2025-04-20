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