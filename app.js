const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');

require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});


// Проверка соединения
connection.connect((err) => {
    if (err) {
        console.error('Ошибка подключения: ' + err.stack);
        return;
    }
    console.log('Подключено к базе данных с ID ' + connection.threadId);
});

module.exports = connection;  // Экспортируем подключение для использования в других частях проекта


const app = express();
const port = 3001;

// Middleware для обработки данных формы и JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// Динамическая генерация секретного ключа для сессий
const secretKey = crypto.randomBytes(32).toString('hex');

// Настройка сессий
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production' // Только HTTPS в продакшене
    }
}));

// Настройка отправки email через Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'timourbarber@gmail.com',
        pass: 'uhoalcumtbjfswqi'

        // user: 'andreyme0411@gmail.com',
        // pass: 'ronapadzvqoqrbdq'
    }
});

// Middleware для проверки авторизации через hash в URL
app.use((req, res, next) => {
    const hashFreePaths = ['/logout', '/buy-voucher', '/cart', '/order-success', '/admin/update-status'];
    // Пропускаем POST-запросы, чтобы не перенаправлять их
    if (req.method === 'POST') {
        return next();
    }
    if (!req.query.hash && !hashFreePaths.includes(req.path) && !req.path.startsWith('/product/')) {
        const hash = uuidv4();
        const newUrl = `${req.path}?hash=${hash}`;
        return res.redirect(newUrl);
    }
    next();
});

// Создание директории для базы данных, если она не существует
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

// Подключение к базе данных SQLite
const db = new sqlite3.Database(path.join(dbDir, 'users.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');

    // Создание таблицы пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        voucher INTEGER DEFAULT 0,
        authToken TEXT
    )`, (err) => {
        if (err) console.error('Error creating users table:', err.message);
    });

    // Создание таблицы заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        order_number TEXT UNIQUE,
        items TEXT,
        total_usdt REAL,
        shipping_address TEXT,
        payment_method TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) console.error('Error creating orders table:', err.message);
    });

    // Создание учетной записи администратора, если она еще не существует
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (!row) {
            bcrypt.hash('PRehp2u6Yry@', 10, (err, hashedPassword) => {
                if (err) console.error('Error hashing admin password:', err.message);
                db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword], (err) => {
                    if (err) console.error('Error inserting admin user:', err.message);
                });
            });
        }
    });
});

// Главная страница
app.get('/', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('index', renderData);
});

// Страница входа
app.get('/login', (req, res) => {
    res.render('login', { error: null, user: req.session?.user || null });
});

// Страница регистрации
app.get('/register', (req, res) => {
    res.render('register', { error: null, user: req.session?.user || null });
});

// Обработка регистрации
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, voucher) VALUES (?, ?, 0)', [username, hashedPassword], function (err) {
            if (err) {
                return res.render('register', { error: 'This username is already taken', user: null });
            }
            res.redirect('/login');
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.render('register', { error: 'Registration error', user: null });
    }
});

// Обработка входа
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.render('login', { error: 'Invalid login credentials', user: null });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            req.session.user = username;
            const authToken = crypto.randomBytes(16).toString('hex');
            db.run('UPDATE users SET authToken = ? WHERE username = ?', [authToken, username], (updateErr) => {
                if (updateErr) console.error('Error saving token:', updateErr.message);
            });
            res.cookie('authToken', authToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });
            res.redirect('/');
        } else {
            res.render('login', { error: 'Invalid login credentials', user: null });
        }
    });
});

// Страница профиля
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    db.get('SELECT id, voucher FROM users WHERE username = ?', [req.session.user], (err, user) => {
        if (err || !user) {
            console.error(err?.message || 'User not found');
            return res.redirect('/');
        }
        db.all('SELECT * FROM orders WHERE user_id = ?', [user.id], (err, orders) => {
            if (err) {
                console.error('Error fetching orders:', err.message);
                return res.redirect('/');
            }
            const processedOrders = orders.map(order => {
                try {
                    return { ...order, items: JSON.parse(order.items) };
                } catch (parseError) {
                    console.error(`Error parsing items for order #${order.order_number}:`, parseError.message);
                    return { ...order, items: [] };
                }
            });
            res.render('profile', {
                user: req.session.user,
                hasVoucher: user.voucher === 1,
                orders: processedOrders || []
            });
        });
    });
});

// Страница "Why Crypto is Easier"
app.get('/cryptoeasier', (req, res) => {
    res.render('cryptoeasier', { user: req.session.user || null });
});

// Выход из системы
app.get('/logout', (req, res) => {
    if (req.session.user) {
        db.run('UPDATE users SET authToken = NULL WHERE username = ?', [req.session.user], (err) => {
            if (err) console.error('Error clearing token:', err.message);
        });
    }
    res.clearCookie('authToken');
    req.session.destroy();
    res.redirect('/');
});

// Страница магазина
app.get('/webshop', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('webshop', renderData);
});

// Страница оформления заказа
app.get('/checkout', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('checkout', {
        user: req.session.user || null,
        error: null
    });
});

// Обработка формы оформления заказа
app.post('/checkout', async (req, res) => {
    console.log('Handling POST /checkout request');

    // Проверяем, авторизован ли пользователь
    if (!req.session.user) {
        console.log('User not logged in, returning 401');
        return res.status(401).json({ error: 'Please log in' });
    }
    console.log('User is logged in:', req.session.user);

    // Логируем полученные данные из формы
    console.log('Received POST request at /checkout:', req.body);
    console.log('Raw cart cookie:', req.cookies.cart);
    console.log('Type of cart cookie:', typeof req.cookies.cart);

    // Проверяем, что все обязательные поля присутствуют
    const { full_name, email, address, city, country, postal_code, payment_method, shipping_method } = req.body;
    if (!full_name || !email || !address || !city || !country || !postal_code || !payment_method || !shipping_method) {
        console.log('Missing required fields:', { full_name, email, address, city, country, postal_code, payment_method, shipping_method });
        return res.status(400).json({ error: 'All fields are required' });
    }
    console.log('All required fields are present');

    // Обрабатываем корзину
    let cart;
    try {
        const rawCart = req.cookies.cart;
        console.log('Attempting to parse cart:', rawCart);

        if (!rawCart || typeof rawCart !== 'string') {
            console.log('Cart cookie is missing or not a string, setting to empty array');
            cart = [];
        } else if (rawCart.trim() === '') {
            console.log('Cart cookie is an empty string, setting to empty array');
            cart = [];
        } else {
            let decodedCart;
            try {
                decodedCart = decodeURIComponent(rawCart);
                console.log('Decoded cart:', decodedCart);
            } catch (decodeError) {
                console.error('Error decoding cart cookie:', decodeError.message);
                return res.status(400).json({ error: 'Invalid cart data (decoding failed)' });
            }

            if (decodedCart === 'undefined' || decodedCart === 'null' || decodedCart === '') {
                console.log('Cart cookie contains invalid value (undefined/null/empty), setting to empty array');
                cart = [];
            } else {
                try {
                    cart = JSON.parse(decodedCart);
                    console.log('Parsed cart:', cart);
                } catch (parseError) {
                    console.error('Error parsing cart JSON:', parseError.message);
                    console.error('Problematic cart data (decoded):', decodedCart);
                    return res.status(400).json({ error: 'Invalid cart data (parsing failed)' });
                }
            }
        }
    } catch (error) {
        console.error('Unexpected error in cart processing:', error.message);
        return res.status(500).json({ error: 'Unexpected error processing cart' });
    }

    // Проверяем, что корзина не пуста
    if (!Array.isArray(cart) || !cart.length) {
        console.log('Cart is empty or not an array after parsing');
        return res.status(400).json({ error: 'Cart is empty' });
    }
    console.log('Cart is valid and not empty:', cart);

    // Проверяем элементы корзины
    const isValidCart = cart.every(item => item && typeof item === 'object' && 'title' in item && 'price' in item);
    if (!isValidCart) {
        console.error('Invalid cart data:', cart);
        return res.status(400).json({ error: 'Invalid cart items' });
    }
    console.log('Cart items are valid');

    // Вычисляем итоговую сумму
    const shippingCosts = { dhl: 5, fedex: 7, ups: 6 };
    const totalUSDT = cart.reduce((sum, item) => sum + parseFloat(item.price), 0) + (shippingCosts[shipping_method] || 0);
    console.log('Calculated totalUSDT:', totalUSDT);

    // Формируем адрес доставки
    const shippingAddress = `${full_name}, ${address}, ${city}, ${country}, ${postal_code}, Email: ${email}`;
    console.log('Shipping address:', shippingAddress);

    // Генерируем номер заказа
    const orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
    console.log('Generated order number:', orderNumber);

    // Определяем метод доставки
    let shippingMethodName, shippingIcon;
    switch (shipping_method) {
        case 'dhl':
            shippingMethodName = 'LPExpress';
            shippingIcon = '/media/lp-express-s.png';
            break;
        case 'fedex':
            shippingMethodName = 'DPD';
            shippingIcon = '/media/dpd.png';
            break;
        case 'ups':
            shippingMethodName = 'Omniva';
            shippingIcon = '/media/omniva_horizontal_orange-1024x410-1.webp';
            break;
        default:
            shippingMethodName = 'Unknown';
            shippingIcon = '';
    }
    console.log('Shipping method details:', { shippingMethodName, shippingIcon });

    // Получаем ID пользователя
    db.get('SELECT id FROM users WHERE username = ?', [req.session.user], (err, user) => {
        if (err || !user) {
            console.error('User lookup error:', err?.message || 'User not found');
            return res.status(500).json({ error: 'User not found' });
        }
        console.log('User found:', user);

        // Сериализуем корзину в JSON
        let itemsJson;
        try {
            itemsJson = JSON.stringify(cart);
            console.log('Serialized cart to JSON:', itemsJson);
        } catch (stringifyError) {
            console.error('Error converting cart to JSON:', stringifyError.message);
            return res.status(500).json({ error: 'Unable to process cart data' });
        }

        // Логируем все данные перед вставкой в базу
        console.log('Preparing to insert order into database with the following data:', {
            user_id: user.id,
            order_number: orderNumber,
            items: itemsJson,
            total_usdt: totalUSDT,
            shipping_address: shippingAddress,
            payment_method: payment_method,
            status: 'placed'
        });

        // Вставляем заказ в базу данных
        db.run(
            `INSERT INTO orders (user_id, order_number, items, total_usdt, shipping_address, payment_method, status)
             VALUES (?, ?, ?, ?, ?, ?, 'placed')`,
            [user.id, orderNumber, itemsJson, totalUSDT, shippingAddress, payment_method],
            function (err) {
                if (err) {
                    console.error('Error creating order:', err.message);
                    return res.status(500).json({ error: 'Unable to create order' });
                }
                console.log(`Order created: #${orderNumber}, ID: ${this.lastID}`);

                // Проверяем, что заказ действительно сохранён
                db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
                    if (err || !order) {
                        console.error('Order not found in database after insert:', err?.message || 'Order not found');
                    } else {
                        console.log('Order successfully saved in database:', order);
                    }
                });

                // Обновляем статус заказа
                console.log('Updating order status to awaiting_payment...');
                db.run('UPDATE orders SET status = ? WHERE order_number = ?', ['awaiting_payment', orderNumber], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating order status:', updateErr.message);
                    } else {
                        console.log('Order status updated to awaiting_payment');
                    }
                });

                // Отправляем письмо пользователю
                console.log('Sending email to user:', email);
                transporter.sendMail({
                    from: 'timourbarber@gmail.com',
                    to: email,
                    subject: `Receipt for Order #${orderNumber}`,
                    html: `
                        <h1>Thank you for your order!</h1>
                        <p>Order #${orderNumber} is awaiting payment.</p>
                        <p><strong>Items:</strong></p>
                        <ul>${cart.map(item => `<li>${item.title} - ${item.price} USDT</li>`).join('')}</ul>
                        <p><strong>Shipping Method:</strong> ${shippingMethodName}</p>
                        <p><img src="https://timour-barber.com${shippingIcon}" alt="${shippingMethodName}" style="max-width: 150px;"></p>
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
                        <h3>Payment Instructions</h3>
                        <p>Please send the payment in USDT TRC (Tron) (TRC20) to the following wallet address:</p>
                        <p><strong>Wallet Address:</strong> TSLutTokZzNEnz1fb8NBDWrgE2GEYF2xet</p>
                        <p><strong>Amount to Pay:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p style="color: red; font-weight: bold;">Important: In the transaction comment, you MUST include your order number: ${orderNumber}. This is necessary to match your payment to your order.</p>
                        <p>Once the payment is received, we will update your order status and proceed with shipping.</p>
                        <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                        <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
                        <p><strong>TimourBarber 2025&copy;</strong></p>
                    `
                }, (error, info) => {
                    if (error) {
                        console.error('Error sending email to user:', error);
                    } else {
                        console.log('Email sent to user:', info.response);
                    }
                });

                // Отправляем письмо администратору
                console.log('Sending email to admin: timourbarber@gmail.com');
                transporter.sendMail({
                    from: 'timourbarber@gmail.com',
                    to: 'timourbarber@gmail.com',
                    subject: `New Order #${orderNumber}`,
                    html: `
                        <h1>New Order Received</h1>
                        <p>Order #${orderNumber}</p>
                        <p><strong>User:</strong> ${req.session.user}</p>
                        <p><strong>Items:</strong></p>
                        <ul>${cart.map(item => `<li>${item.title} - ${item.price} USDT</li>`).join('')}</ul>
                        <p><strong>Shipping Method:</strong> ${shippingMethodName}</p>
                        <p><img src="https://timour-barber.com${shippingIcon}" alt="${shippingMethodName}" style="max-width: 150px;"></p>
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
                        <h3>Payment Instructions (Sent to User)</h3>
                        <p>Please send the payment in USDT (TRC20) to the following wallet address:</p>
                        <p><strong>Wallet Address:</strong> TXb1e2f3g4h5j6k7m8n9p0q1r2s3t4u5v6w7x8y9z</p>
                        <p><strong>Amount to Pay:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p style="color: red; font-weight: bold;">Important: In the transaction comment, the user must include the order number: ${orderNumber}.</p>
                        <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                        <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
                        <p><strong>TimourBarber 2025&copy;</strong></p>
                    `
                }, (error, info) => {
                    if (error) {
                        console.error('Error sending email to admin:', error);
                    } else {
                        console.log('Email sent to admin:', info.response);
                    }
                });

                // Отправляем успешный ответ
                console.log('Sending success response with redirect:', `/order-success?order=${orderNumber}`);
                res.status(200).json({ redirect: `/order-success?order=${orderNumber}` });
            }
        );
    });
});

// Страница подтверждения заказа
app.get('/order-confirmation', (req, res) => {
    const orderNumber = req.query.order;
    if (!orderNumber) {
        return res.redirect('/webshop');
    }

    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
        if (err || !order) {
            console.error('Error fetching order:', err?.message || 'Order not found');
            return res.redirect('/webshop');
        }
        let items;
        try {
            items = JSON.parse(order.items);
        } catch (parseError) {
            console.error(`Error parsing items for order #${orderNumber}:`, parseError.message);
            items = [];
        }
        res.render('order-confirmation', {
            user: req.session.user || null,
            order: {
                order_number: order.order_number,
                total_usdt: order.total_usdt,
                items: items,
                shipping_address: order.shipping_address,
                payment_method: order.payment_method,
                status: order.status
            }
        });
    });
});

// Страница успешного заказа (если используется)
app.get('/order-success', (req, res) => {
    const orderNumber = req.query.order;
    const hash = req.query.hash || '';
    if (!orderNumber) {
        return res.redirect('/webshop');
    }

    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
        if (err || !order) {
            console.error('Error fetching order:', err?.message || 'Order not found');
            return res.redirect('/webshop');
        }
        let items;
        try {
            items = JSON.parse(order.items);
        } catch (parseError) {
            console.error(`Error parsing items for order #${orderNumber}:`, parseError.message);
            items = [];
        }
        res.render('order-success', {
            user: req.session.user || null,
            order: {
                order_number: order.order_number,
                total_usdt: order.total_usdt,
                items: items,
                shipping_address: order.shipping_address,
                payment_method: order.payment_method,
                status: order.status
            },
            hash: hash
        });
    });
});

// Админ-панель
app.get('/admin', (req, res) => {
    console.log('Received request at /admin, session:', req.session);
    if (req.session.user !== 'admin', req.session.user !== 'Andrii Slavutskyi') {
        console.log('User is not an admin, redirecting to /login');
        return res.redirect('/login');
    }
    db.all('SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id', (err, orders) => {
        if (err) {
            console.error('Error fetching orders:', err.message);
            return res.redirect('/');
        }
        const processedOrders = orders.map(order => {
            try {
                return { ...order, items: JSON.parse(order.items) };
            } catch (parseError) {
                console.error(`Error parsing items for order #${order.order_number}:`, parseError.message);
                return { ...order, items: [] };
            }
        });
        res.render('admin', {
            user: req.session.user,
            orders: processedOrders
        });
    });
});

// Обновление статуса заказа в админ-панели
app.post('/admin/update-status', (req, res) => {
    if (req.session.user !== 'admin' && req.session.user !== 'Andrii Slavutskyi') {
        return res.status(403).json({ success: false, error: 'Unauthorized access' });
    }

    const { orderNumber, status } = req.body;
    const productStatuses = ['placed', 'preparing', 'ready to ship', 'delivered', 'cancelled'];
    const voucherStatuses = ['awaiting_payment', 'awaiting_visitor', 'completed'];

    const isVoucherOrder = orderNumber.startsWith('VCH-');
    const validStatuses = isVoucherOrder ? voucherStatuses : productStatuses;

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    if (!orderNumber || !status) {
        return res.status(400).json({ success: false, error: 'orderNumber and status are required' });
    }

    db.get(
        `SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id WHERE o.order_number = ?`,
        [orderNumber],
        (err, order) => {
            if (err || !order) {
                return res.status(500).json({ success: false, error: 'Order not found' });
            }

            db.run('UPDATE orders SET status = ? WHERE order_number = ?', [status, orderNumber], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ success: false, error: 'Unable to update status' });
                }

                const emailMatch = order.shipping_address.match(/Email: ([^\s]+)/);
                const userEmail = emailMatch ? emailMatch[1] : null;

                let itemsList = 'Unable to display items due to data error';
                try {
                    const items = JSON.parse(order.items);
                    if (Array.isArray(items)) {
                        itemsList = items.map(item => `${item.title} - ${item.price} USDT`).join('<br>');
                    }
                } catch (parseError) {
                    console.error(`Error parsing items for order #${orderNumber}:`, parseError.message);
                }

                if (userEmail) {
                    transporter.sendMail({
                        from: 'timourbarber@gmail.com',
                        to: userEmail,
                        subject: `Order Status Update #${orderNumber}`,
                        html: `
                            <h1>Order Status Update</h1>
                            <p>Your order #${orderNumber} has been updated.</p>
                            <p><strong>New Status:</strong> <strong style="color: white; background-color: black; border-radius: 5px;">${status}</strong></p>
                            <p><strong>Items:</strong> ${itemsList}</p>
                            <p><strong>Total:</strong> ${order.total_usdt.toFixed(2)} USDT</p>
                            ${isVoucherOrder ? '' : `<p><strong>Shipping Address:</strong> ${order.shipping_address}</p>`}
                            <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                            <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
                            <p><strong>TimourBarber 2025&copy;</strong></p>
                        `
                    }, (error, info) => {
                        if (error) console.error('Error sending email:', error);
                    });
                }

                res.json({ success: true });
            });
        }
    );
});

// Дополнительные маршруты
app.get('/services', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess === true,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned === true
    };
    res.render('services', renderData);
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
});

app.get('/academy', (req, res) => {
    res.render('academy', { user: req.session.user || null });
});

app.get('/cookie-policy', (req, res) => {
    res.render('cookie-policy', { user: req.session.user || null });
});

app.get('/terms-of-service', (req, res) => {
    res.render('terms-of-service', { user: req.session.user || null });
});

app.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

app.get('/job', (req, res) => {
    res.render('job', { user: req.session.user || null });
});

app.get('/coin', (req, res) => {
    res.render('coin', { user: req.session.user || null });
});

app.get('/contact', (req, res) => {
    res.render('contact', { user: req.session.user || null });
});

// Страница продукта
app.get('/product/:productId', (req, res) => {
    const productId = req.params.productId;
    const hash = req.query.hash || uuidv4();

    const products = {
        'сlassic-pomade-125ml': {
            id: 'сlassic-pomade-125ml',
            title: 'Classic pomade 125ML',
            price: 21.83,
            priceEUR: 20,
            description: 'A timeless, strong-hold pomade for a sleek, polished look. Perfect for all hair types. 125ML.',
            images: ['/img/image4.jpg', '/img/image16.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'deluxe_pomade_125ml': {
            id: 'deluxe_pomade_125ML',
            title: 'Deluxe pomade 125ML',
            price: 21.83,
            priceEUR: 20,
            description: 'A classic deluxe pomade with a strong hold and high shine. Ideal for sleek, timeless styles. 125ML.',
            images: ['/img/image17.jpg', '/img/image5.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'fiber-wax-125ml': {
            id: 'fiber-wax-125ML',
            title: 'Fiber wax 125ML',
            price: 21.83,
            priceEUR: 20,
            description: 'A flexible fiber wax with a strong hold and matte finish. Perfect for textured, natural styles. 125ML.',
            images: ['/img/image14.jpg', '/img/image18.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'matte-wax-125ml': {
            id: 'matte-wax-125ML',
            title: 'Matte wax 125 ML',
            price: 21.83,
            priceEUR: 20,
            description: 'A matte wax with a strong hold for a natural, textured look. No shine, all style. 125ML.',
            images: ['/img/image2.jpg', '/img/image6.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'matte-clay-125ml': {
            id: 'matte-clay-125ML',
            title: 'Matte clay 125ML',
            price: 21.83,
            priceEUR: 20,
            description: 'A flexible fiber wax with a strong hold and matte finish. Perfect for textured, natural styles. 125ML.',
            images: ['/img/image15.jpg', '/img/image3.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'beard-oil-limited-edition-40ml': {
            id: 'beard-oil-limited-edition-40ml',
            title: 'Beard Oil Limited Edition 40ML',
            price: 24.01,
            priceEUR: 22,
            description: 'A premium limited-edition beard oil that nourishes, softens, and adds a healthy shine. 40ML.',
            images: ['/img/image23.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'beard-balm-argan-oil-40ml': {
            id: 'beard-balm-argan-oil-40ml',
            title: 'Beard Balm argan oil 40ML',
            price: 24.01,
            priceEUR: 22,
            description: 'A nourishing beard balm with argan oil for softness, control, and a healthy shine. 40ML.',
            images: ['/img/image1.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'hairspray-extra-volume-400ml': {
            id: 'hairspray-extra-volume-400ml',
            title: 'Hairspray Extra Volume 400ML',
            price: 16.37,
            priceEUR: 15,
            description: 'A lightweight hairspray for extra volume and long-lasting hold without stiffness. 400ML.',
            images: ['/img/image22.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'sea-salt-spray-250ml': {
            id: 'sea-salt-spray-250ml',
            title: 'Sea salt spray 250ML',
            price: 20.74,
            priceEUR: 19,
            description: 'A sea salt spray for effortless, beachy waves with natural texture and volume. 250ML.',
            images: ['/img/image21.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'after-shave-cream-cologne-350ml': {
            id: 'after-shave-cream-cologne-350ml',
            title: 'After shave cream cologne 350ML ',
            price: 21.83,
            priceEUR: 20,
            description: 'A flexible fiber wax with a strong hold and matte finish. Perfect for textured, natural styles. 125ML.',
            images: ['/img/image19.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'hairstyling-powder-20ml': {
            id: 'hairstyling-powder-20ml',
            title: 'Hairstyling powder 20ml',
            price: 21.83,
            priceEUR: 20,
            description: 'A lightweight hairstyling powder for instant volume and texture with a matte finish. 20ML.',
            images: ['/img/image20.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'black-flat-top-barber-comb-professional-use': {
            id: 'black-flat-top-barber-comb-professional-use',
            title: 'Black flat top barber comb professional use',
            price: 6.55,
            priceEUR: 6,
            description: 'A durable black flat-top barber comb, designed for professional use, offering precise styling and control.',
            images: ['/img/image7.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'styling-comb-wet&dry-for-all-hair-types': {
            id: 'styling-comb-wet&dry-for-all-hair-types',
            title: 'Styling comb wet&dry for all hair types',
            price: 9.82,
            priceEUR: 9,
            description: 'A versatile wet & dry styling comb, suitable for all hair types, providing gentle detangling and smooth styling.',
            images: ['/img/image8.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'dual-sided-brush-for-daily-hair': {
            id: 'dual-sided-brush-for-daily-hair',
            title: 'Dual-sided brush for daily hair',
            price: 5.46,
            priceEUR: 5,
            description: 'A dual-sided brush for daily hair care, with soft bristles for detangling and a firmer side for styling and volume.',
            images: ['/img/image9.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'broken-hair-sweep-beard-shape': {
            id: 'broken-hair-sweep-beard-shape',
            title: 'broken hair sweep beard shape, two sides combed men`s oil head texture combing nylon soft hair clean beard brush',
            price: 7.64,
            priceEUR: 7,
            description: 'A multifunctional comb and brush for men, designed to shape and sweep broken hair and beards. Features two sides for versatile styling, with soft nylon bristles for gentle cleaning and texture.',
            images: ['/img/image10.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'double-side-hair-comb-texture-comb': {
            id: 'double-side-hair-comb-texture-comb',
            title: 'Double Side Hair Comb, Texture Comb',
            price: 6.55,
            priceEUR: 6,
            description: 'A double-sided hair and texture comb for precise styling, offering both fine and wide teeth for versatile hair control. Perfect for all hair types.',
            images: ['/img/image11.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'men-beard-brush&1pc-beard': {
            id: 'men-beard-brush&1pc-beard',
            title: '1pc Men Beard Brush & 1pc Beard Comb & 1pc Storage Bag.',
            price: 20.74,
            priceEUR: 19,
            description: 'A complete beard grooming set, including a beard brush, comb, and a convenient storage bag. Ideal for keeping your beard neat and well-maintained.',
            images: ['/img/image12.jpg'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'derma-roller-system': {
            id: 'derma-roller-system',
            title: '1pc Derma Roller System',
            price: 14,
            priceEUR: 12.98,
            description: 'Derma Roller System boosts collagen, improves skin texture, and enhances skincare absorption.',
            images: ['/img/image24.png'],
            features: ['Professional tool', 'Payment in USDT or cash']
        },
        'matte-pomade-125ml': {
            id: 'matte-pomade-125ml',
            title: 'Matte pomade 125ML',
            price: 20,
            priceEUR: 18.56,
            description: 'Matte Pomade provides strong, flexible hold with a natural, shine-free finish. 125ML.',
            images: ['/img/image25.png'],
            features: ['Professional tool', 'Payment in USDT or cash']
        }
    };

    const product = products[productId];
    if (!product) {
        return res.status(404).send('Product not found');
    }

    if (!req.query.hash) {
        return res.redirect(`/product/${productId}?hash=${hash}`);
    }

    res.render('product', {
        user: req.session.user || null,
        product: product,
        hash: hash
    });
});

// Обработка покупки ваучера
app.post('/buy-voucher', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    db.get('SELECT voucher FROM users WHERE username = ?', [req.session.user], (err, row) => {
        if (err) {
            console.error('Error fetching voucher status:', err.message);
            return res.redirect('/');
        }
        if (row.voucher === 1) {
            req.session.voucherAlreadyOwned = true;
            return res.redirect('/');
        }
        db.run('UPDATE users SET voucher = 1 WHERE username = ?', [req.session.user], (updateErr) => {
            if (updateErr) {
                console.error('Error updating voucher status:', updateErr.message);
                return res.redirect('/');
            }
            req.session.purchaseSuccess = true;
            res.redirect('/');
        });
    });
});

// Voucher Checkout Route
app.get('/voucher-checkout', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('voucher-checkout', {
        user: req.session.user || null,
        error: null
    });
});

app.post('/voucher-checkout', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Please log in' });
    }

    const { full_name, email, payment_method } = req.body;
    if (!full_name || !email || !payment_method) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    let voucherCart;
    try {
        const rawCart = req.cookies.voucherCart || '[]';
        voucherCart = JSON.parse(decodeURIComponent(rawCart));
    } catch (error) {
        console.error('Error parsing voucher cart:', error.message);
        return res.status(400).json({ error: 'Invalid voucher cart data' });
    }

    if (!Array.isArray(voucherCart) || !voucherCart.length) {
        return res.status(400).json({ error: 'Voucher cart is empty' });
    }

    const totalUSDT = voucherCart.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const billingAddress = `${full_name}, Email: ${email}`;
    const orderNumber = `VCH-${uuidv4().slice(0, 8).toUpperCase()}`;

    db.get('SELECT id FROM users WHERE username = ?', [req.session.user], (err, user) => {
        if (err || !user) {
            return res.status(500).json({ error: 'User not found' });
        }

        const itemsJson = JSON.stringify(voucherCart);
        db.run(
            `INSERT INTO orders (user_id, order_number, items, total_usdt, shipping_address, payment_method, status)
             VALUES (?, ?, ?, ?, ?, ?, 'awaiting_payment')`,
            [user.id, orderNumber, itemsJson, totalUSDT, billingAddress, payment_method],
            function (err) {
                if (err) {
                    console.error('Error creating voucher order:', err.message);
                    return res.status(500).json({ error: 'Unable to create order' });
                }

                transporter.sendMail({
                    from: 'timourbarber@gmail.com',
                    to: email,
                    subject: `Voucher Order #${orderNumber}`,
                    html: `
                        <h1>Thank you for your voucher order!</h1>
                        <p>Order #${orderNumber} is awaiting payment.</p>
                        <p><strong>Vouchers:</strong></p>
                        <ul>${voucherCart.map(item => `<li>${item.title} - ${item.price} USDT</li>`).join('')}</ul>
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <h3>Payment Instructions</h3>
                        <p>Please send the payment in USDT (TRC20) to:</p>
                        <p><strong>Wallet Address:</strong> TSLutTokZzNEnz1fb8NBDWrgE2GEYF2xet</p>
                        <p><strong>Amount:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p style="color: red; font-weight: bold;">Include your order number (${orderNumber}) in the transaction comment.</p>
                        <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                        <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
                        <p><strong>TimourBarber 2025&copy;</strong></p>
                    `
                }, (error, info) => {
                    if (error) console.error('Error sending voucher email:', error);
                });

                transporter.sendMail({
                    from: 'timourbarber@gmail.com',
                    to: 'timourbarber@gmail.com',
                    subject: `New Voucher Order #${orderNumber}`,
                    html: `
                        <h1>New Voucher Order</h1>
                        <p>Order #${orderNumber}</p>
                        <p><strong>User:</strong> ${req.session.user}</p>
                        <p><strong>Vouchers:</strong></p>
                        <ul>${voucherCart.map(item => `<li>${item.title} - ${item.price} USDT</li>`).join('')}</ul>
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                    `
                }, (error, info) => {
                    if (error) console.error('Error sending admin voucher email:', error);
                });

                res.status(200).json({ redirect: `/order-success?order=${orderNumber}` });
            }
        );
    });
});

// Запуск сервера
const server = app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});

// Обработка завершения работы сервера
process.on('SIGINT', () => {
    server.close(() => {
        console.log('Server stopped');
        db.close(() => {
            console.log('Database connection closed');
            process.exit(0);
        });
    });
});