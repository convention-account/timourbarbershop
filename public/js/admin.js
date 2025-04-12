let currentOrderNumber = null;
let reviewToDelete = null;

function openDeleteModal(orderNumber) {
    currentOrderNumber = orderNumber;
    document.getElementById('delete-order-number').textContent = orderNumber;
    document.getElementById('delete-modal').style.display = 'flex';
    document.getElementById('delete-password').value = '';
}

function openDeleteReviewModal(reviewId) {
    reviewToDelete = reviewId;
    document.getElementById('delete-order-number').textContent = `Отзыв #${reviewId}`;
    document.getElementById('delete-modal').style.display = 'flex';
    document.getElementById('delete-password').value = '';
}

function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    document.getElementById('delete-password').value = '';
    currentOrderNumber = null;
    reviewToDelete = null;
}

async function confirmDelete() {
    const password = document.getElementById('delete-password').value;
    if (!password) {
        alert('Пожалуйста, введите пароль');
        return;
    }

    if (currentOrderNumber) {
        // Удаление заказа
        try {
            const response = await fetch('/admin/delete-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderNumber: currentOrderNumber, password })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка HTTP! Статус: ${response.status}, Сообщение: ${errorText}`);
            }

            const result = await response.json();
            if (result.success) {
                alert('Заказ успешно удалён');
                document.querySelector(`.order-card:has([data-order-number="${currentOrderNumber}"])`).remove();
                closeDeleteModal();
            } else {
                alert('Не удалось удалить заказ: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка при удалении заказа:', error);
            alert('Ошибка при удалении заказа: ' + error.message);
        }
    } else if (reviewToDelete) {
        // Удаление отзыва
        try {
            const response = await fetch('/admin/delete-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewId: reviewToDelete, password })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка HTTP! Статус: ${response.status}, Сообщение: ${errorText}`);
            }

            const result = await response.json();
            if (result.success) {
                alert('Отзыв успешно удалён');
                const reviewsList = document.getElementById('reviews-list');
                reviewsList.innerHTML = '';
                // Загружаем обновлённый список отзывов
                const reviewsResponse = await fetch('/admin/reviews');
                if (!reviewsResponse.ok) {
                    const errorText = await reviewsResponse.text();
                    throw new Error(`Не удалось загрузить отзывы: ${reviewsResponse.status} ${errorText}`);
                }
                const reviewsData = await reviewsResponse.json();

                // Проверяем, является ли ответ массивом
                if (!Array.isArray(reviewsData)) {
                    console.error('Ответ сервера не является массивом:', reviewsData);
                    reviewsList.innerHTML = '<p>Ошибка при загрузке отзывов: некорректный формат данных.</p>';
                    return;
                }

                if (reviewsData.length === 0) {
                    reviewsList.innerHTML = '<p>Нет доступных отзывов.</p>';
                } else {
                    reviewsData.forEach(review => {
                        const reviewCard = document.createElement('div');
                        reviewCard.className = 'review-card';
                        reviewCard.innerHTML = `
                            <p><strong>Пользователь:</strong> ${review.username}</p>
                            <p><strong>ID продукта:</strong> ${review.product_id}</p>
                            <p><strong>Отзыв:</strong> ${review.review_text}</p>
                            <p><strong>Дата:</strong> ${new Date(review.created_at).toLocaleString()}</p>
                            <button class="delete-review-btn" onclick="openDeleteReviewModal('${review.id}')">Удалить</button>
                        `;
                        reviewsList.appendChild(reviewCard);
                    });
                }
            } else {
                alert('Не удалось удалить отзыв: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка при удалении отзыва:', error);
            alert('Ошибка при удалении отзыва: ' + error.message);
        } finally {
            closeDeleteModal();
        }
    }
}

async function updateStatus(orderNumber) {
    const select = document.querySelector(`select[data-order-number="${orderNumber}"]`);
    const newStatus = select.value;

    try {
        const response = await fetch('/admin/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber, status: newStatus })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка HTTP! Статус: ${response.status}, Сообщение: ${errorText}`);
        }

        const result = await response.json();
        if (result.success) {
            const statusSpan = select.parentElement.previousElementSibling.querySelector('.status');
            statusSpan.textContent = newStatus;
            statusSpan.className = `status ${newStatus.replace(/\s+/g, '-')}`;
            alert('Статус успешно обновлён');
        } else {
            alert('Не удалось обновить статус: ' + result.error);
        }
    } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
        alert('Ошибка при обновлении статуса: ' + error.message);
    }
}