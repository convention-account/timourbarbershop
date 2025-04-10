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
const admins = ['admin', 'Andrii Slavutskyi'];
const multer = require('multer');

let products = {
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

require('dotenv').config();

// MySQL временно не используется, удалено для работы с SQLite
// const mysql = require('mysql2');
// const connection = mysql.createConnection({...});

// const connection = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME
// });

// connection.connect((err) => {
//     if (err) {
//         console.error('Ошибка подключения: ' + err.stack);
//         return;
//     }
//     console.log('Подключено к базе данных с ID ' + connection.threadId);
// });

// module.exports = connection;  // Экспортируем подключение для использования в других частях проекта

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

// Настройка multer для сохранения файлов во временную папку
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// Настройка multer для изображений товаров
const productUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, 'public/img');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});

// Загрузка товаров для админ-панели
app.get('/admin/products', (req, res) => {
    if (!req.session.user || !admins.includes(req.session.user)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json(Object.values(products));
});

// Добавление нового товара
app.post('/admin/add-product', productUpload.array('images'), (req, res) => {
    if (!req.session.user || !admins.includes(req.session.user)) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { title, description, price, priceEUR } = req.body;
    const images = req.files.map(file => `/img/${file.filename}`);

    if (!title || !price) {
        return res.status(400).json({ success: false, error: 'Title and price are required' });
    }

    const productId = title.toLowerCase().replace(/\s+/g, '-');
    products[productId] = {
        id: productId,
        title,
        description: description || '',
        price: parseFloat(price),
        priceEUR: priceEUR ? parseFloat(priceEUR) : 0,
        images,
        features: ['Professional tool', 'Payment in USDT or cash']
    };

    res.json({ success: true });
});

// Обновление товара
app.post('/admin/update-product', productUpload.array('images'), (req, res) => {
    if (!req.session.user || !admins.includes(req.session.user)) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { title, description, price, priceEUR, productId } = req.body; // Извлекаем productId из req.body
    const newImages = req.files.map(file => `/img/${file.filename}`);

    if (!productId || !products[productId]) {
        return res.status(404).json({ success: false, error: 'Product not found' });
    }

    products[productId] = {
        ...products[productId],
        title: title || products[productId].title,
        description: description || products[productId].description,
        price: price ? parseFloat(price) : products[productId].price,
        priceEUR: priceEUR ? parseFloat(priceEUR) : products[productId].priceEUR,
        images: newImages.length ? newImages : products[productId].images
    };
    res.json({ success: true });
});

// Удаление товара
app.post('/admin/delete-product', async (req, res) => {
    if (!req.session.user || !admins.includes(req.session.user)) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { productId, password } = req.body;

    const user = await new Promise((resolve) => {
        db.get('SELECT password FROM users WHERE username = ?', [req.session.user], (err, row) => {
            resolve(row);
        });
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    if (products[productId]) {
        delete products[productId];
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, error: 'Product not found' });
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Обработка формы подачи заявки на вакансию с файлом
app.post('/job/apply', upload.single('cv'), (req, res) => {
    const { name, email, phone, position } = req.body;
    const cvFile = req.file;

    if (!name || !email || !phone || !position) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const mailOptions = {
        from: 'timourbarber@gmail.com',
        to: 'timourbarber@gmail.com, andreyme0411@gmail.com',
        subject: `New Job Application: ${position}`,
        html: `
            <h1>New Job Application</h1>
            <p><strong>Full Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Position:</strong> ${position === 'barber-assistant' ? 'Reception' : 'Barber'}</p>
            <p><strong>CV:</strong> ${cvFile ? 'Attached' : 'Not provided'}</p>
            <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
            <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
            <p><strong>TimourBarber 2025©</strong></p>
        `,
        attachments: cvFile ? [{
            filename: cvFile.originalname,
            path: cvFile.path
        }] : []
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending job application email:', error);
            return res.status(500).json({ success: false, error: 'Failed to send application' });
        }
        console.log('Job application email sent:', info.response);

        // Удаляем временный файл после отправки
        if (cvFile) {
            fs.unlink(cvFile.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
        }

        res.json({ success: true, message: 'Application sent successfully' });
    });
});

// Middleware для передачи admins в шаблоны
app.use((req, res, next) => {
    res.locals.admins = admins; // Делаем admins доступным во всех шаблонах
    next();
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
        email TEXT UNIQUE,
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
        transaction_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) console.error('Error creating orders table:', err.message);
    });

    // МИГРАЦИЯ ДБ
    // db.run(`ALTER TABLE orders ADD COLUMN transaction_id TEXT`, (err) => {
    //     if (err) console.error('Error adding transaction_id column:', err.message);
    // });

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
    const { username, email, password, confirm_password } = req.body;
    if (password !== confirm_password) {
        return res.render('register', { error: 'Passwords do not match', user: null });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, email, password, voucher) VALUES (?, ?, ?, 0)',
            [username, email, hashedPassword], function (err) {
                if (err) {
                    return res.render('register', { error: 'This email is already registered', user: null });
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
    const { email, password } = req.body;

    console.log('Login attempt with:', { email, password });

    if (!email || !password) {
        console.log('Missing email or password in request');
        return res.render('login', { error: 'Please provide both email and password', user: null });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.render('login', { error: 'Database error', user: null });
        }
        if (!user) {
            console.log('No user found with email:', email);
            return res.render('login', { error: 'Invalid email or password', user: null });
        }
        console.log('User found:', user);

        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            console.log('Password is valid, logging in user:', user.username); // Изменено на username
            req.session.user = user.username; // Сохраняем username вместо email
            const authToken = crypto.randomBytes(16).toString('hex');
            db.run('UPDATE users SET authToken = ? WHERE email = ?', [authToken, email], (updateErr) => {
                if (updateErr) console.error('Error saving token:', updateErr.message);
            });
            res.cookie('authToken', authToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });
            res.redirect('/');
        } else {
            console.log('Invalid password for email:', email);
            res.render('login', { error: 'Invalid email or password', user: null });
        }
    });
});

// Страница профиля
app.get('/profile', (req, res) => {
    console.log('Handling GET /profile request');
    if (!req.session.user) {
        console.log('User not logged in, redirecting to /login');
        return res.redirect('/login');
    }
    console.log('User is logged in:', req.session.user);

    db.get('SELECT id, voucher FROM users WHERE email = ?', [req.session.user], (err, user) => {
        if (err || !user) {
            console.error('User lookup error:', err?.message || 'User not found');
            return res.redirect('/');
        }
        console.log('User found:', user);

        db.all('SELECT * FROM orders WHERE user_id = ?', [user.id], (err, orders) => {
            if (err) {
                console.error('Error fetching orders:', err.message);
                return res.redirect('/');
            }
            console.log('Orders fetched from database:', orders);

            const processedOrders = orders.map(order => {
                try {
                    const parsedItems = JSON.parse(order.items);
                    console.log(`Parsed items for order #${order.order_number}:`, parsedItems);
                    return { ...order, items: parsedItems };
                } catch (parseError) {
                    console.error(`Error parsing items for order #${order.order_number}:`, parseError.message);
                    return { ...order, items: [] };
                }
            });
            console.log('Processed orders:', processedOrders);

            db.get(
                `SELECT order_number, items FROM orders 
                 WHERE user_id = ? AND order_number LIKE 'VCH-%' 
                 AND status NOT IN ('completed', 'cancelled')`,
                [user.id],
                (err, activeVoucher) => {
                    if (err) {
                        console.error('Error fetching active voucher:', err.message);
                    }
                    let voucherDetails = null;
                    if (activeVoucher) {
                        try {
                            const items = JSON.parse(activeVoucher.items);
                            voucherDetails = {
                                orderNumber: activeVoucher.order_number,
                                title: items[0].title
                            };
                            console.log('Active voucher found:', voucherDetails);
                        } catch (parseError) {
                            console.error('Error parsing voucher items:', parseError.message);
                        }
                    } else {
                        console.log('No active vouchers found for user');
                    }

                    console.log('Rendering profile page with data:', {
                        user: req.session.user,
                        hasVoucher: !!activeVoucher,
                        voucherDetails: voucherDetails,
                        orders: processedOrders
                    });
                    res.render('profile', {
                        user: req.session.user,
                        hasVoucher: !!activeVoucher,
                        voucherDetails: voucherDetails,
                        orders: processedOrders || []
                    });
                }
            );
        });
    });
});

app.post('/admin/delete-order', (req, res) => {
    if (!req.session.user || !admins.includes(req.session.user)) {
        return res.status(403).json({ success: false, error: 'Unauthorized access' });
    }

    const { orderNumber, password } = req.body;

    if (!orderNumber || !password) {
        return res.status(400).json({ success: false, error: 'Order number and password are required' });
    }

    // Проверяем пароль администратора
    db.get('SELECT password FROM users WHERE username = ?', [req.session.user], async (err, user) => {
        if (err || !user) {
            return res.status(500).json({ success: false, error: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Incorrect password' });
        }

        // Проверяем существование заказа
        db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
            if (err || !order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }

            // Удаляем заказ
            db.run('DELETE FROM orders WHERE order_number = ?', [orderNumber], (deleteErr) => {
                if (deleteErr) {
                    return res.status(500).json({ success: false, error: 'Unable to delete order' });
                }

                // Отправляем уведомление пользователю, если есть email
                const emailMatch = order.shipping_address.match(/Email: ([^\s]+)/);
                const userEmail = emailMatch ? emailMatch[1] : null;

                if (userEmail) {
                    transporter.sendMail({
                        from: 'timourbarber@gmail.com',
                        to: userEmail,
                        subject: `Order #${orderNumber} Deleted`,
                        html: `
                            <h1>Order Deleted</h1>
                            <p>Your order #${orderNumber} has been deleted by an administrator.</p>
                            <p>If you believe this is an error, please contact us.</p>
                            <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                            <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
                            <p><strong>TimourBarber 2025©</strong></p>
                        `
                    }, (error, info) => {
                        if (error) console.error('Error sending deletion email:', error);
                    });
                }

                res.json({ success: true });
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
        db.run('UPDATE users SET authToken = NULL WHERE email = ?', [req.session.user], (err) => {
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
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false,
        products: Object.values(products) // Преобразуем объект в массив
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

    if (!req.session.user) {
        console.log('User not logged in, returning 401');
        return res.status(401).json({ error: 'Please log in' });
    }
    console.log('User is logged in:', req.session.user);

    console.log('Received POST request at /checkout:', req.body);
    console.log('Raw cart cookie:', req.cookies.cart);

    const { full_name, email, address, city, country, postal_code, payment_method, shipping_method, transaction_id } = req.body;
    if (!full_name || !email || !address || !city || !country || !postal_code || !payment_method || !shipping_method || !transaction_id) {
        console.log('Missing required fields:', { full_name, email, address, city, country, postal_code, payment_method, shipping_method, transaction_id });
        return res.status(400).json({ error: 'All fields, including Transaction ID, are required' });
    }
    console.log('All required fields are present');

    let cart;
    try {
        const rawCart = req.cookies.cart;
        cart = rawCart && typeof rawCart === 'string' && rawCart.trim() !== '' ? JSON.parse(decodeURIComponent(rawCart)) : [];
    } catch (error) {
        console.error('Error parsing cart:', error.message);
        return res.status(400).json({ error: 'Invalid cart data' });
    }

    if (!Array.isArray(cart) || !cart.length) {
        console.log('Cart is empty or not an array');
        return res.status(400).json({ error: 'Cart is empty' });
    }
    console.log('Cart is valid:', cart);

    const isValidCart = cart.every(item => item && typeof item === 'object' && 'title' in item && 'price' in item);
    if (!isValidCart) {
        console.error('Invalid cart data:', cart);
        return res.status(400).json({ error: 'Invalid cart items' });
    }

    const shippingCosts = { dhl: 5, fedex: 7, ups: 6 };
    const totalUSDTWithoutShipping = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const totalUSDT = totalUSDTWithoutShipping + (shippingCosts[shipping_method] || 0);

    if (totalUSDTWithoutShipping < 54) {
        console.log('Order total is below minimum (50 EUR ~ 54 USDT)');
        return res.status(400).json({ error: 'Minimum order amount is 50 EUR (~54 USDT) excluding shipping.' });
    }

    const shippingAddress = `${full_name}, ${address}, ${city}, ${country}, ${postal_code}, Email: ${email}`;
    const orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    let shippingMethodName, shippingIcon;
    switch (shipping_method) {
        case 'dhl': shippingMethodName = 'LPExpress'; shippingIcon = '/media/lp-express-s.png'; break;
        case 'fedex': shippingMethodName = 'DPD'; shippingIcon = '/media/dpd.png'; break;
        case 'ups': shippingMethodName = 'Omniva'; shippingIcon = '/media/omniva_horizontal_orange-1024x410-1.webp'; break;
        default: shippingMethodName = 'Unknown'; shippingIcon = '';
    }

    db.get('SELECT id FROM users WHERE username = ?', [req.session.user], (err, user) => {
        if (err || !user) {
            console.error('User lookup error:', err?.message || 'User not found');
            return res.status(500).json({ error: 'User not found' });
        }

        const itemsJson = JSON.stringify(cart);

        db.run(
            `INSERT INTO orders (user_id, order_number, items, total_usdt, shipping_address, payment_method, transaction_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')`,
            [user.id, orderNumber, itemsJson, totalUSDT, shippingAddress, payment_method, transaction_id],
            function (err) {
                if (err) {
                    console.error('Error creating order:', err.message);
                    return res.status(500).json({ error: 'Unable to create order' });
                }
                console.log(`Order created: #${orderNumber}, ID: ${this.lastID}`);

                // Отправляем письмо пользователю
                transporter.sendMail({
                    from: 'timourbarber@gmail.com',
                    to: email,
                    subject: `Order #${orderNumber} Received`,
                    html: `
                        <h1>Order Received</h1>
                        <p>Your order #${orderNumber} has been successfully placed.</p>
                        <p><strong>Items:</strong></p>
                        <ul>${cart.map(item => `<li>${item.title} - ${item.price} USDT</li>`).join('')}</ul>
                        <p><strong>Shipping Method:</strong> ${shippingMethodName}</p>
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
                        <p><strong>Transaction ID:</strong> ${transaction_id}</p>
                        <p>We will verify your payment and update the order status soon.</p>
                        <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                        <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
                        <p><strong>TimourBarber 2025©</strong></p>
                    `
                }, (error, info) => {
                    if (error) console.error('Error sending email to user:', error);
                    else console.log('Email sent to user:', info.response);
                });

                // Отправляем письмо администратору
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
                        <p><strong>Total:</strong> ${totalUSDT.toFixed(2)} USDT</p>
                        <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
                        <p><strong>Transaction ID:</strong> ${transaction_id}</p>
                        <p>Please verify the payment.</p>
                        <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                    `
                }, (error, info) => {
                    if (error) console.error('Error sending email to admin:', error);
                    else console.log('Email sent to admin:', info.response);
                });

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
    if (!orderNumber) return res.redirect('/webshop');

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
                transaction_id: order.transaction_id, // Добавляем Transaction ID
                status: order.status
            }
        });
    });
});

// Админ-панель
app.get('/admin', (req, res) => {
    console.log('Received request at /admin, session:', req.session);
    if (!req.session.user || !admins.includes(req.session.user)) {
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
    if (!req.session.user || !admins.includes(req.session.user)) {
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

    // const products = {
    //     'сlassic-pomade-125ml': {
    //         id: 'сlassic-pomade-125ml',
    //         title: 'Classic pomade 125ML',
    //         price: 21.83,
    //         priceEUR: 20,
    //         description: 'A timeless, strong-hold pomade for a sleek, polished look. Perfect for all hair types. 125ML.',
    //         images: ['/img/image4.jpg', '/img/image16.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'deluxe_pomade_125ml': {
    //         id: 'deluxe_pomade_125ML',
    //         title: 'Deluxe pomade 125ML',
    //         price: 21.83,
    //         priceEUR: 20,
    //         description: 'A classic deluxe pomade with a strong hold and high shine. Ideal for sleek, timeless styles. 125ML.',
    //         images: ['/img/image17.jpg', '/img/image5.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'fiber-wax-125ml': {
    //         id: 'fiber-wax-125ML',
    //         title: 'Fiber wax 125ML',
    //         price: 21.83,
    //         priceEUR: 20,
    //         description: 'A flexible fiber wax with a strong hold and matte finish. Perfect for textured, natural styles. 125ML.',
    //         images: ['/img/image14.jpg', '/img/image18.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'matte-wax-125ml': {
    //         id: 'matte-wax-125ML',
    //         title: 'Matte wax 125 ML',
    //         price: 21.83,
    //         priceEUR: 20,
    //         description: 'A matte wax with a strong hold for a natural, textured look. No shine, all style. 125ML.',
    //         images: ['/img/image2.jpg', '/img/image6.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'matte-clay-125ml': {
    //         id: 'matte-clay-125ML',
    //         title: 'Matte clay 125ML',
    //         price: 21.83,
    //         priceEUR: 20,
    //         description: 'A flexible fiber wax with a strong hold and matte finish. Perfect for textured, natural styles. 125ML.',
    //         images: ['/img/image15.jpg', '/img/image3.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'beard-oil-limited-edition-40ml': {
    //         id: 'beard-oil-limited-edition-40ml',
    //         title: 'Beard Oil Limited Edition 40ML',
    //         price: 24.01,
    //         priceEUR: 22,
    //         description: 'A premium limited-edition beard oil that nourishes, softens, and adds a healthy shine. 40ML.',
    //         images: ['/img/image23.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'beard-balm-argan-oil-40ml': {
    //         id: 'beard-balm-argan-oil-40ml',
    //         title: 'Beard Balm argan oil 40ML',
    //         price: 24.01,
    //         priceEUR: 22,
    //         description: 'A nourishing beard balm with argan oil for softness, control, and a healthy shine. 40ML.',
    //         images: ['/img/image1.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'hairspray-extra-volume-400ml': {
    //         id: 'hairspray-extra-volume-400ml',
    //         title: 'Hairspray Extra Volume 400ML',
    //         price: 16.37,
    //         priceEUR: 15,
    //         description: 'A lightweight hairspray for extra volume and long-lasting hold without stiffness. 400ML.',
    //         images: ['/img/image22.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'sea-salt-spray-250ml': {
    //         id: 'sea-salt-spray-250ml',
    //         title: 'Sea salt spray 250ML',
    //         price: 20.74,
    //         priceEUR: 19,
    //         description: 'A sea salt spray for effortless, beachy waves with natural texture and volume. 250ML.',
    //         images: ['/img/image21.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'after-shave-cream-cologne-350ml': {
    //         id: 'after-shave-cream-cologne-350ml',
    //         title: 'After shave cream cologne 350ML ',
    //         price: 21.83,
    //         priceEUR: 20,
    //         description: 'A flexible fiber wax with a strong hold and matte finish. Perfect for textured, natural styles. 125ML.',
    //         images: ['/img/image19.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'hairstyling-powder-20ml': {
    //         id: 'hairstyling-powder-20ml',
    //         title: 'Hairstyling powder 20ml',
    //         price: 21.83,
    //         priceEUR: 20,
    //         description: 'A lightweight hairstyling powder for instant volume and texture with a matte finish. 20ML.',
    //         images: ['/img/image20.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'black-flat-top-barber-comb-professional-use': {
    //         id: 'black-flat-top-barber-comb-professional-use',
    //         title: 'Black flat top barber comb professional use',
    //         price: 6.55,
    //         priceEUR: 6,
    //         description: 'A durable black flat-top barber comb, designed for professional use, offering precise styling and control.',
    //         images: ['/img/image7.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'styling-comb-wet&dry-for-all-hair-types': {
    //         id: 'styling-comb-wet&dry-for-all-hair-types',
    //         title: 'Styling comb wet&dry for all hair types',
    //         price: 9.82,
    //         priceEUR: 9,
    //         description: 'A versatile wet & dry styling comb, suitable for all hair types, providing gentle detangling and smooth styling.',
    //         images: ['/img/image8.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'dual-sided-brush-for-daily-hair': {
    //         id: 'dual-sided-brush-for-daily-hair',
    //         title: 'Dual-sided brush for daily hair',
    //         price: 5.46,
    //         priceEUR: 5,
    //         description: 'A dual-sided brush for daily hair care, with soft bristles for detangling and a firmer side for styling and volume.',
    //         images: ['/img/image9.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'broken-hair-sweep-beard-shape': {
    //         id: 'broken-hair-sweep-beard-shape',
    //         title: 'broken hair sweep beard shape, two sides combed men`s oil head texture combing nylon soft hair clean beard brush',
    //         price: 7.64,
    //         priceEUR: 7,
    //         description: 'A multifunctional comb and brush for men, designed to shape and sweep broken hair and beards. Features two sides for versatile styling, with soft nylon bristles for gentle cleaning and texture.',
    //         images: ['/img/image10.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'double-side-hair-comb-texture-comb': {
    //         id: 'double-side-hair-comb-texture-comb',
    //         title: 'Double Side Hair Comb, Texture Comb',
    //         price: 6.55,
    //         priceEUR: 6,
    //         description: 'A double-sided hair and texture comb for precise styling, offering both fine and wide teeth for versatile hair control. Perfect for all hair types.',
    //         images: ['/img/image11.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'men-beard-brush&1pc-beard': {
    //         id: 'men-beard-brush&1pc-beard',
    //         title: '1pc Men Beard Brush & 1pc Beard Comb & 1pc Storage Bag.',
    //         price: 20.74,
    //         priceEUR: 19,
    //         description: 'A complete beard grooming set, including a beard brush, comb, and a convenient storage bag. Ideal for keeping your beard neat and well-maintained.',
    //         images: ['/img/image12.jpg'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'derma-roller-system': {
    //         id: 'derma-roller-system',
    //         title: '1pc Derma Roller System',
    //         price: 14,
    //         priceEUR: 12.98,
    //         description: 'Derma Roller System boosts collagen, improves skin texture, and enhances skincare absorption.',
    //         images: ['/img/image24.png'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     },
    //     'matte-pomade-125ml': {
    //         id: 'matte-pomade-125ml',
    //         title: 'Matte pomade 125ML',
    //         price: 20,
    //         priceEUR: 18.56,
    //         description: 'Matte Pomade provides strong, flexible hold with a natural, shine-free finish. 125ML.',
    //         images: ['/img/image25.png'],
    //         features: ['Professional tool', 'Payment in USDT or cash']
    //     }
    // };

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
    console.log('Handling POST /voucher-checkout request');

    // Проверяем, авторизован ли пользователь
    if (!req.session.user) {
        console.log('User not logged in, returning 401');
        return res.status(401).json({ error: 'Please log in' });
    }
    console.log('User is logged in:', req.session.user);

    // Логируем полученные данные из формы
    console.log('Received POST request at /voucher-checkout:', req.body);
    console.log('Raw voucherCart cookie:', req.cookies.voucherCart);
    console.log('Type of voucherCart cookie:', typeof req.cookies.voucherCart);

    // Проверяем, что все обязательные поля присутствуют
    const { full_name, email, payment_method, transaction_id } = req.body;
    if (!full_name || !email || !payment_method || !transaction_id) {
        console.log('Missing required fields:', { full_name, email, payment_method, transaction_id });
        return res.status(400).json({ error: 'All fields, including Transaction ID, are required' });
    }
    console.log('All required fields are present');

    // Обрабатываем корзину ваучеров
    let voucherCart;
    try {
        const rawCart = req.cookies.voucherCart || '[]';
        console.log('Attempting to parse voucherCart:', rawCart);

        if (!rawCart || typeof rawCart !== 'string') {
            console.log('VoucherCart cookie is missing or not a string, setting to empty array');
            voucherCart = [];
        } else if (rawCart.trim() === '') {
            console.log('VoucherCart cookie is an empty string, setting to empty array');
            voucherCart = [];
        } else {
            let decodedCart;
            try {
                decodedCart = decodeURIComponent(rawCart);
                console.log('Decoded voucherCart:', decodedCart);
            } catch (decodeError) {
                console.error('Error decoding voucherCart cookie:', decodeError.message);
                return res.status(400).json({ error: 'Invalid voucher cart data (decoding failed)' });
            }

            if (decodedCart === 'undefined' || decodedCart === 'null' || decodedCart === '') {
                console.log('VoucherCart cookie contains invalid value (undefined/null/empty), setting to empty array');
                voucherCart = [];
            } else {
                try {
                    voucherCart = JSON.parse(decodedCart);
                    console.log('Parsed voucherCart:', voucherCart);
                } catch (parseError) {
                    console.error('Error parsing voucherCart JSON:', parseError.message);
                    console.error('Problematic voucherCart data (decoded):', decodedCart);
                    return res.status(400).json({ error: 'Invalid voucher cart data (parsing failed)' });
                }
            }
        }
    } catch (error) {
        console.error('Unexpected error in voucherCart processing:', error.message);
        return res.status(500).json({ error: 'Unexpected error processing voucher cart' });
    }

    // Проверяем, что корзина не пуста
    if (!Array.isArray(voucherCart) || !voucherCart.length) {
        console.log('VoucherCart is empty or not an array after parsing');
        return res.status(400).json({ error: 'Voucher cart is empty' });
    }
    console.log('VoucherCart is valid and not empty:', voucherCart);

    // Проверяем элементы корзины
    const isValidCart = voucherCart.every(item => item && typeof item === 'object' && 'title' in item && 'price' in item);
    if (!isValidCart) {
        console.error('Invalid voucherCart data:', voucherCart);
        return res.status(400).json({ error: 'Invalid voucher cart items' });
    }
    console.log('VoucherCart items are valid');

    // Проверка на наличие активного ваучера
    db.get(
        `SELECT o.order_number FROM orders o 
         JOIN users u ON o.user_id = u.id 
         WHERE u.username = ? AND o.order_number LIKE 'VCH-%' 
         AND o.status NOT IN ('completed', 'cancelled')`,
        [req.session.user],
        (err, activeVoucher) => {
            if (err) {
                console.error('Error checking active voucher:', err.message);
                return res.status(500).json({ error: 'Server error checking voucher status' });
            }
            if (activeVoucher) {
                console.log('Active voucher found:', activeVoucher.order_number);
                console.log('Blocking purchase due to existing active voucher');
                return res.status(400).json({ error: 'You already have an active voucher. Only one voucher is allowed at a time.' });
            }
            console.log('No active vouchers found, proceeding with purchase');

            const totalUSDT = voucherCart.reduce((sum, item) => sum + parseFloat(item.price), 0);
            const billingAddress = `${full_name}, Email: ${email}`;
            const orderNumber = `VCH-${uuidv4().slice(0, 8).toUpperCase()}`;

            console.log('Calculated totalUSDT:', totalUSDT);
            console.log('Billing address:', billingAddress);
            console.log('Generated voucher order number:', orderNumber);

            db.get('SELECT id FROM users WHERE username = ?', [req.session.user], (err, user) => {
                if (err || !user) {
                    console.error('User lookup error:', err?.message || 'User not found');
                    return res.status(500).json({ error: 'User not found' });
                }
                console.log('User found:', user);

                const itemsJson = JSON.stringify(voucherCart);
                console.log('Serialized voucherCart to JSON:', itemsJson);

                console.log('Preparing to insert voucher order into database with the following data:', {
                    user_id: user.id,
                    order_number: orderNumber,
                    items: itemsJson,
                    total_usdt: totalUSDT,
                    shipping_address: billingAddress,
                    payment_method: payment_method,
                    transaction_id: transaction_id,
                    status: 'awaiting_payment'
                });

                db.run(
                    `INSERT INTO orders (user_id, order_number, items, total_usdt, shipping_address, payment_method, transaction_id, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')`,
                    [user.id, orderNumber, itemsJson, totalUSDT, billingAddress, payment_method, transaction_id],
                    function (err) {
                        if (err) {
                            console.error('Error creating voucher order:', err.message);
                            return res.status(500).json({ error: 'Unable to create order' });
                        }
                        console.log(`Voucher order created: #${orderNumber}, ID: ${this.lastID}`);

                        // Проверяем, что заказ действительно сохранён
                        db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
                            if (err || !order) {
                                console.error('Voucher order not found in database after insert:', err?.message || 'Order not found');
                            } else {
                                console.log('Voucher order successfully saved in database:', order);
                            }
                        });

                        // Отправляем письмо пользователю
                        console.log('Sending email to user:', email);
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
                                <p><strong>Transaction ID:</strong> ${transaction_id}</p>
                                <p style="color: red; font-weight: bold;">Your order is being prepared. Our receptionist checks the payment for the (${orderNumber}) order. This usually doesn't take long. You will receive a new notification of a status change.</p>
                                <p><img src="https://timour-barber.com/media/icon.png" alt="TimourBarber" style="max-width: 250px;"></p>
                                <p><strong><a href="https://timour-barber.com/">Our website</a></strong></p>
                                <p><strong>TimourBarber 2025©</strong></p>
                            `
                        }, (error, info) => {
                            if (error) {
                                console.error('Error sending voucher email:', error);
                            } else {
                                console.log('Email sent to user:', info.response);
                            }
                        });

                        // Отправляем письмо администратору
                        console.log('Sending email to admin: timourbarber@gmail.com');
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
                                <p><strong>Transaction ID:</strong> ${transaction_id}</p>
                            `
                        }, (error, info) => {
                            if (error) {
                                console.error('Error sending admin voucher email:', error);
                            } else {
                                console.log('Email sent to admin:', info.response);
                            }
                        });

                        console.log('Sending success response with redirect:', `/order-success?order=${orderNumber}`);
                        res.status(200).json({ redirect: `/order-success?order=${orderNumber}` });
                    }
                );
            });
        }
    );
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