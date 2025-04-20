document.addEventListener('DOMContentLoaded', () => {
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
});