let currentOrderNumber = null;

function openDeleteModal(orderNumber) {
    currentOrderNumber = orderNumber;
    document.getElementById('delete-order-number').textContent = orderNumber;
    document.getElementById('delete-modal').classList.add('active');
    document.getElementById('delete-password').value = '';
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
    currentOrderNumber = null;
}

async function confirmDelete() {
    const password = document.getElementById('delete-password').value;
    if (!password) {
        alert('Please enter your password');
        return;
    }

    try {
        const response = await fetch('/admin/delete-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber: currentOrderNumber, password })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            alert('Order successfully deleted');
            document.querySelector(`.order-card:has([data-order-number="${currentOrderNumber}"])`).remove();
            closeDeleteModal();
        } else {
            alert('Failed to delete order: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order: ' + error.message);
    }
}

async function updateStatus(orderNumber) {
    const select = document.querySelector(`select[data-order-number="${orderNumber}"]`);
    const newStatus = select.value;

    try {
        const response = await fetch('/admin/update-status', {
            method: 'POST', // Set the POST method
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber, status: newStatus })
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            const statusSpan = select.parentElement.previousElementSibling.querySelector('.status');
            statusSpan.textContent = newStatus;
            statusSpan.className = `status ${newStatus.replace(/\s+/g, '-')}`;
            alert('Status successfully updated');
        } else {
            alert('Failed to update status: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
    }
}