document.addEventListener('DOMContentLoaded', () => {
    const manageProductsBtn = document.getElementById('manage-products-btn');
    const productsManagement = document.getElementById('products-management');
    const productsList = document.getElementById('products-list');
    const newProductCard = document.querySelector('.new-product');

    // Переключение видимости панели управления товарами
    manageProductsBtn.addEventListener('click', () => {
        productsManagement.classList.toggle('hidden');
        if (!productsManagement.classList.contains('hidden')) {
            loadProducts();
        }
    });

    // Загрузка товаров из сервера
    async function loadProducts() {
        try {
            const response = await fetch('/admin/products');
            const products = await response.json();
            productsList.innerHTML = '';

            products.forEach(product => {
                const productCard = createProductCard(product);
                productsList.appendChild(productCard);
            });
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    // Создание карточки товара
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <form class="product-form" data-id="${product.id}">
                <input type="text" name="title" value="${product.title}" placeholder="Title">
                <textarea name="description" placeholder="Description">${product.description}</textarea>
                <input type="number" name="price" value="${product.price}" placeholder="Price (USDT)">
                <input type="number" name="priceEUR" value="${product.priceEUR}" placeholder="Price (EUR)">
                <input type="file" name="images" multiple accept="image/*">
                <div class="current-images">
                    ${product.images.map(img => `<img src="${img}" width="50">`).join('')}
                </div>
                <button type="button" class="save-btn">Save Changes</button>
                <button type="button" class="delete-btn">Delete Product</button>
            </form>
        `;

        // Обработчик сохранения изменений
        card.querySelector('.save-btn').addEventListener('click', () => saveProduct(card));

        // Обработчик удаления
        card.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(product.id));

        return card;
    }

    // Форма для нового товара
    newProductCard.addEventListener('click', () => {
        const form = document.createElement('div');
        form.className = 'product-card';
        form.innerHTML = `
            <form class="product-form">
                <input type="text" name="title" placeholder="Title">
                <textarea name="description" placeholder="Description"></textarea>
                <input type="number" name="price" placeholder="Price (USDT)">
                <input type="number" name="priceEUR" placeholder="Price (EUR)">
                <input type="file" name="images" multiple accept="image/*">
                <button type="button" class="save-btn">Add Product</button>
            </form>
        `;
        form.querySelector('.save-btn').addEventListener('click', () => saveProduct(form, true));
        productsList.appendChild(form);
        newProductCard.style.display = 'none';
    });

    // Сохранение товара
    async function saveProduct(card, isNew = false) {
        const form = card.querySelector('.product-form');
        const formData = new FormData(form);

        try {
            const response = await fetch(isNew ? '/admin/add-product' : '/admin/update-product', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert('Product saved successfully');
                loadProducts();
                if (isNew) newProductCard.style.display = 'block';
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error saving product');
        }
    }

    // Удаление товара
    async function deleteProduct(productId) {
        const password = prompt('Enter admin password to confirm deletion:');
        if (!password) return;

        try {
            const response = await fetch('/admin/delete-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, password })
            });
            const result = await response.json();
            if (result.success) {
                alert('Product deleted successfully');
                loadProducts();
            } else {
                alert('Failed to delete product: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product');
        }
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