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

const app = express();
const port = 3001;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// Динамическая генерация секретного ключа
const secretKey = crypto.randomBytes(32).toString('hex');

// Настройка сессии
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
    }
}));

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'andreyme0411@gmail.com',
        pass: 'fgsjqaccwmmuzrnl'
    }
});

// Middleware для проверки авторизации через куки
app.use((req, res, next) => {
    const hashFreePaths = ['/login', '/register', '/logout', '/buy-voucher', '/cart', '/order-success'];
    if (!req.query.hash && !hashFreePaths.includes(req.path) && !req.path.startsWith('/product/')) {
        const hash = uuidv4();
        const newUrl = `${req.path}?hash=${hash}`;
        return res.redirect(newUrl);
    }
    next();
});

// Middleware для добавления хэша в URL
app.use((req, res, next) => {
    const hashFreePaths = ['/login', '/register', '/logout', '/buy-voucher', '/checkout', '/cart', '/order-success'];
    if (!req.query.hash && !hashFreePaths.includes(req.path) && !req.path.startsWith('/product/')) {
        const hash = uuidv4();
        const newUrl = `${req.path}?hash=${hash}`;
        return res.redirect(newUrl);
    }
    next();
});

// Создание директории базы данных
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

// Подключение к базе данных
const db = new sqlite3.Database(path.join(dbDir, 'users.db'), (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
        process.exit(1);
    }
    console.log('Подключено к базе данных SQLite');

    // Создание таблицы пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        voucher INTEGER DEFAULT 0,
        authToken TEXT
    )`, (err) => {
        if (err) console.error('Ошибка создания таблицы users:', err.message);
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
        if (err) console.error('Ошибка создания таблицы orders:', err.message);
    });

    // Seed admin account if it doesn't exist
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (!row) {
            bcrypt.hash('PRehp2u6Yry@', 10, (err, hashedPassword) => {
                db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
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

// Страницы авторизации и регистрации
app.get('/login', (req, res) => {
    res.render('login', { error: null, user: req.session?.user || null });
});

app.get('/register', (req, res) => {
    res.render('register', { error: null, user: req.session?.user || null });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, voucher) VALUES (?, ?, 0)',
            [username, hashedPassword],
            function (err) {
                if (err) {
                    return res.render('register', { error: 'This username is already taken', user: null });
                }
                res.redirect('/login');
            });
    } catch (error) {
        res.render('register', { error: 'Registration failed', user: null });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.render('login', { error: 'Incorrect login info', user: null });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            req.session.user = username;
            const authToken = crypto.randomBytes(16).toString('hex');
            db.run('UPDATE users SET authToken = ? WHERE username = ?', [authToken, username], (updateErr) => {
                if (updateErr) console.error('Ошибка сохранения токена:', updateErr.message);
            });
            res.cookie('authToken', authToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });
            res.redirect('/');
        } else {
            res.render('login', { error: 'Invalid login data', user: null });
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
        // Fetch user's orders
        db.all('SELECT * FROM orders WHERE user_id = ?', [user.id], (err, orders) => {
            if (err) {
                console.error(err.message);
                return res.redirect('/');
            }
            const processedOrders = orders.map(order => {
                try {
                    return { ...order, items: JSON.parse(order.items) };
                } catch (parseError) {
                    console.error(`Ошибка разбора items для заказа #${order.order_number}:`, parseError.message);
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

// Выход
app.get('/logout', (req, res) => {
    if (req.session.user) {
        db.run('UPDATE users SET authToken = NULL WHERE username = ?', [req.session.user], (err) => {
            if (err) console.error('Ошибка очистки токена:', err.message);
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

// Страница чекаута
app.get('/checkout', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('checkout', {
        user: req.session.user || null,
        error: null
    });
});

// Обработка формы чекаута
app.post('/checkout', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Please log in' });

    console.log('Получен запрос на /checkout:', req.body);

    const { full_name, email, address, city, country, postal_code, payment_method, shipping_method } = req.body;
    if (!full_name || !email || !address || !city || !country || !postal_code || !payment_method || !shipping_method) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    let cart;
    try {
        cart = JSON.parse(req.cookies.cart || '[]');
    } catch (error) {
        console.error('Ошибка разбора корзины:', error.message);
        return res.status(400).json({ error: 'Invalid cart data' });
    }

    if (!Array.isArray(cart) || !cart.length) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    const isValidCart = cart.every(item => item && typeof item === 'object' && 'title' in item && 'price' in item);
    if (!isValidCart) {
        console.error('Некорректные данные в корзине:', cart);
        return res.status(400).json({ error: 'Invalid cart items' });
    }

    const totalUSDT = cart.reduce((sum, item) => sum + parseFloat(item.price), 0) + (shipping_method === 'dhl' ? 5 : shipping_method === 'fedex' ? 7 : 6);
    const shippingAddress = `${full_name}, ${address}, ${city}, ${country}, ${postal_code}, Email: ${email}`;
    const orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    db.get('SELECT id FROM users WHERE username = ?', [req.session.user], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'User not found' });

        const itemsJson = JSON.stringify(cart);
        console.log(`Записываем items для заказа #${orderNumber}:`, itemsJson);

        db.run(`INSERT INTO orders (user_id, order_number, items, total_usdt, shipping_address, payment_method, status)
                VALUES (?, ?, ?, ?, ?, ?, 'placed')`,
            [user.id, orderNumber, itemsJson, totalUSDT, shippingAddress, payment_method], (err) => {
                if (err) {
                    console.error('Ошибка создания заказа:', err.message);
                    return res.status(500).json({ error: 'Failed to create order' });
                }

                console.log(`Заказ создан: #${orderNumber}`);

                db.run('UPDATE orders SET status = ? WHERE order_number = ?', ['preparing', orderNumber], (updateErr) => {
                    if (updateErr) console.error('Ошибка обновления статуса заказа:', updateErr.message);
                });

                transporter.sendMail({
                    from: 'andreyme0411@gmail.com',
                    to: email,
                    subject: `Order #${orderNumber} Receipt`,
                    html: `
                        <h1>Thank You for Your Order!</h1>
                        <p>Order #${orderNumber} is being prepared.</p>
                        <p><strong>Items:</strong> ${cart.map(item => `${item.title} - ${item.price} USDT`).join('<br>')}</p>
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p><strong>Shipping:</strong> ${shippingAddress}</p>
                    `
                }, (error, info) => {
                    if (error) console.error('Ошибка отправки письма пользователю:', error);
                    else console.log('Письмо отправлено пользователю:', info.response);
                });

                transporter.sendMail({
                    from: 'andreyme0411@gmail.com',
                    to: 'andreyme0411@gmail.com',
                    subject: `New Order #${orderNumber}`,
                    html: `
                        <h1>New Order Received</h1>
                        <p>Order #${orderNumber}</p>
                        <p><strong>User:</strong> ${req.session.user}</p>
                        <p><strong>Items:</strong> ${cart.map(item => `${item.title} - ${item.price} USDT`).join('<br>')}</p>
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p><strong>Shipping:</strong> ${shippingAddress}</p>
                    `
                }, (error, info) => {
                    if (error) console.error('Ошибка отправки письма администратору:', error);
                    else console.log('Письмо отправлено администратору:', info.response);
                });

                res.json({ redirect: `/order-confirmation?order=${orderNumber}` });
            });
    });
});

// Страница успешного заказа
app.get('/order-success', (req, res) => {
    const orderNumber = req.query.order;
    const hash = req.query.hash || '';
    if (!orderNumber) {
        return res.redirect('/webshop');
    }

    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
        if (err || !order) {
            return res.redirect('/webshop');
        }
        let items;
        try {
            items = JSON.parse(order.items);
        } catch (parseError) {
            console.error(`Ошибка разбора items для заказа #${orderNumber}:`, parseError.message);
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

app.get('/order-confirmation', (req, res) => {
    const orderNumber = req.query.order;
    if (!orderNumber) return res.redirect('/webshop');

    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
        if (err || !order) return res.redirect('/webshop');
        let items;
        try {
            items = JSON.parse(order.items);
        } catch (parseError) {
            console.error(`Ошибка разбора items для заказа #${orderNumber}:`, parseError.message);
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

// Страница админ-панели
app.get('/admin', (req, res) => {
    if (req.session.user !== 'admin') return res.redirect('/login');
    db.all('SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id', (err, orders) => {
        if (err) {
            console.error('Ошибка получения заказов:', err.message);
            return res.redirect('/');
        }
        const processedOrders = orders.map(order => {
            try {
                return { ...order, items: JSON.parse(order.items) };
            } catch (parseError) {
                console.error(`Ошибка разбора items для заказа #${order.order_number}:`, parseError.message);
                return { ...order, items: [] };
            }
        });
        res.render('admin', {
            user: req.session.user,
            orders: processedOrders
        });
    });
});

// Обновление статуса заказа
app.post('/admin/update-status', (req, res) => {
    if (req.session.user !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    const { orderNumber, status } = req.body;

    const validStatuses = ['placed', 'preparing', 'ready to ship', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.get(`
        SELECT o.*, u.username 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        WHERE o.order_number = ?
    `, [orderNumber], (err, order) => {
        if (err || !order) {
            console.error('Ошибка получения заказа:', err?.message);
            return res.status(500).json({ error: 'Order not found' });
        }

        db.run('UPDATE orders SET status = ? WHERE order_number = ?', [status, orderNumber], (updateErr) => {
            if (updateErr) {
                console.error('Ошибка обновления статуса:', updateErr.message);
                return res.status(500).json({ error: 'Failed to update status' });
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
                console.error(`Ошибка разбора items для заказа #${orderNumber}:`, parseError.message);
            }

            if (userEmail) {
                transporter.sendMail({
                    from: 'andreyme0411@gmail.com',
                    to: userEmail,
                    subject: `Order #${orderNumber} Status Update`,
                    html: `
                        <h1>Order Status Update</h1>
                        <p>Your order #${orderNumber} has been updated.</p>
                        <p><strong>New Status:</strong> ${status}</p>
                        <p><strong>Items:</strong> ${itemsList}</p>
                        <p><strong>Total:</strong> ${order.total_usdt.toFixed(2)} USDT</p>
                        <p><strong>Shipping Address:</strong> ${order.shipping_address}</p>
                    `
                }, (error, info) => {
                    if (error) {
                        console.error('Ошибка отправки письма пользователю:', error);
                    } else {
                        console.log('Уведомление о статусе отправлено пользователю:', info.response);
                    }
                });
            } else {
                console.warn(`Не удалось извлечь email из shipping_address для заказа #${orderNumber}`);
            }

            res.json({ success: true });
        });
    });
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

// Маршрут для страницы продукта
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
            description: 'A double-sided hair and texture comb for precise styling, offering both fine and wide teeth for versatile hair control. Perfect for all hair types..',
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
            console.error(err.message);
            return res.redirect('/');
        }
        if (row.voucher === 1) {
            req.session.voucherAlreadyOwned = true;
            return res.redirect('/');
        }
        db.run('UPDATE users SET voucher = 1 WHERE username = ?', [req.session.user], (updateErr) => {
            if (updateErr) {
                console.error(updateErr.message);
                return res.redirect('/');
            }
            req.session.purchaseSuccess = true;
            res.redirect('/');
        });
    });
});

// Запуск сервера
const server = app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});

// Обработка завершения работы сервера
process.on('SIGINT', () => {
    server.close(() => {
        console.log('Сервер остановлен');
        db.close(() => {
            console.log('Соединение с базой данных закрыто');
            process.exit(0);
        });
    });
});