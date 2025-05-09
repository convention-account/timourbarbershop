document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('job-apply-form');
    const notification = document.getElementById('notification');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Предотвращаем перезагрузку страницы

            const formData = new FormData(form); // Собираем данные формы, включая файл

            try {
                const response = await fetch('/job/apply', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    notification.style.display = 'block';
                    notification.style.backgroundColor = '#d4edda';
                    notification.style.color = '#155724';
                    notification.textContent = 'Your application has been successfully sent!';
                    form.reset(); // Очищаем форму после успешной отправки
                } else {
                    notification.style.display = 'block';
                    notification.style.backgroundColor = '#f8d7da';
                    notification.style.color = '#721c24';
                    notification.textContent = result.error || 'Something went wrong. Please try again.';
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                notification.style.display = 'block';
                notification.style.backgroundColor = '#f8d7da';
                notification.style.color = '#721c24';
                notification.textContent = 'An error occurred. Please try again later.';
            }

            // Скрываем уведомление через 5 секунд
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
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