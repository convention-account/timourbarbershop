const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3001;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Добавляем поддержку JSON для обработки данных из фронтенда
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

// Middleware для проверки авторизации через куки
app.use((req, res, next) => {
    if (!req.session.user && req.cookies.authToken) {
        const authToken = req.cookies.authToken;
        db.get('SELECT username FROM users WHERE authToken = ?', [authToken], (err, user) => {
            if (user) {
                req.session.user = user.username;
            }
            next();
        });
    } else {
        next();
    }
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
    db.get('SELECT voucher FROM users WHERE username = ?', [req.session.user], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.redirect('/');
        }
        res.render('profile', { user: req.session.user, hasVoucher: row.voucher });
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
    if (!req.session.user) {
        return res.status(401).json({ error: 'Please log in to complete your purchase' });
    }

    const { full_name, email, address, city, country, postal_code, payment_method, cart } = req.body;

    // Валидация данных
    if (!full_name || !email || !address || !city || !country || !postal_code || !payment_method || !cart) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    let cartItems;
    try {
        cartItems = JSON.parse(cart);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid cart data' });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    // Рассчитываем общую сумму
    const totalUSDT = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const totalEUR = totalUSDT * 0.9; // Примерный курс
    const minimumOrderEUR = 50;

    if (totalEUR < minimumOrderEUR) {
        return res.status(400).json({ error: `Minimum order amount is ${minimumOrderEUR} EUR` });
    }

    // Формируем адрес доставки
    const shippingAddress = `${full_name}, ${address}, ${city}, ${country}, ${postal_code}, Email: ${email}`;

    // Генерируем уникальный номер заказа
    const orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Получаем ID пользователя
    db.get('SELECT id FROM users WHERE username = ?', [req.session.user], (err, user) => {
        if (err || !user) {
            return res.status(500).json({ error: 'User not found' });
        }

        // Сохраняем заказ в базе данных
        db.run(`INSERT INTO orders (user_id, order_number, items, total_usdt, shipping_address, payment_method, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [user.id, orderNumber, JSON.stringify(cartItems), totalUSDT, shippingAddress, payment_method],
            function (err) {
                if (err) {
                    console.error('Ошибка сохранения заказа:', err.message);
                    return res.status(500).json({ error: 'Failed to create order' });
                }

                // Возвращаем данные для оплаты через Plisio
                const paymentData = {
                    order_number: orderNumber,
                    amount: totalUSDT,
                    redirect: `/order-success?order=${orderNumber}`
                };
                res.json(paymentData);
            });
    });
});

// Страница успешного заказа
app.get('/order-success', (req, res) => {
    const orderNumber = req.query.order;
    if (!orderNumber) {
        return res.redirect('/webshop');
    }

    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
        if (err || !order) {
            return res.redirect('/webshop');
        }
        res.render('order-success', {
            user: req.session.user || null,
            order: {
                order_number: order.order_number,
                total_usdt: order.total_usdt,
                items: JSON.parse(order.items),
                shipping_address: order.shipping_address,
                payment_method: order.payment_method,
                status: order.status
            }
        });
    });
});

// Дополнительные маршруты
app.get('/services', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess === true, // Явно задаем false, если undefined
        voucherAlreadyOwned: req.session.voucherAlreadyOwned === true // Явно задаем false, если undefined
    };
    res.render('services', renderData);
    // Удаляем после рендера, чтобы не терять значения до обработки
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