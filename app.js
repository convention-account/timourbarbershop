const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = 3001;

// Middleware
app.use(express.urlencoded({ extended: true }));
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

// Middleware для проверки постоянной авторизации через куки
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

// Создание директории базы данных, если её нет
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

    // Создание таблицы users, если она не существует
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        voucher INTEGER DEFAULT 0,
        authToken TEXT
    )`, (err) => {
        if (err) console.error('Ошибка создания таблицы:', err.message);

        // Проверка наличия столбца authToken и добавление, если его нет
        db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
                console.error('Ошибка проверки столбцов таблицы:', err.message);
                return;
            }

            const hasAuthTokenColumn = columns.some(column => column.name === 'authToken');
            if (!hasAuthTokenColumn) {
                console.log('Столбец authToken отсутствует, добавляем...');
                db.run('ALTER TABLE users ADD COLUMN authToken TEXT', (alterErr) => {
                    if (alterErr) {
                        console.error('Ошибка добавления столбца authToken:', alterErr.message);
                    } else {
                        console.log('Столбец authToken успешно добавлен');
                    }
                });
            } else {
                console.log('Столбец authToken уже существует');
            }
        });
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

app.get('/login', (req, res) => {
    res.render('login', {
        error: null,
        user: req.session?.user || null
    });
});

app.get('/register', (req, res) => {
    res.render('register', {
        error: null,
        user: req.session?.user || null
    });
});

app.get('/register', (req, res) => {
    res.render('register',
        { user: req.session.user || null });
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

// Обработка регистрации
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, voucher) VALUES (?, ?, 0)',
            [username, hashedPassword],
            function (err) {
                if (err) {
                    return res.render('register', { error: 'Имя пользователя уже существует' });
                }
                res.redirect('/login');
            });
    } catch (error) {
        res.render('register', { error: 'Регистрация не удалась' });
    }
});

// Обработка логина
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.render('login', { error: 'Неверные учетные данные', user: null });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            req.session.user = username;

            // Генерируем уникальный токен
            const authToken = crypto.randomBytes(16).toString('hex');

            // Сохраняем токен в базе данных
            db.run('UPDATE users SET authToken = ? WHERE username = ?', [authToken, username], (updateErr) => {
                if (updateErr) {
                    console.error('Ошибка сохранения токена:', updateErr.message);
                }
            });

            // Устанавливаем токен как куки
            res.cookie('authToken', authToken, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });

            res.redirect('/');
        } else {
            res.render('login', { error: 'Неверные учетные данные', user: null });
        }
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

// Выход
app.get('/logout', (req, res) => {
    if (req.session.user) {
        db.run('UPDATE users SET authToken = NULL WHERE username = ?', [req.session.user], (err) => {
            if (err) {
                console.error('Ошибка очистки токена:', err.message);
            }
        });
    }
    res.clearCookie('authToken');
    req.session.destroy();
    res.redirect('/');
});

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

app.get('/services', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('services', renderData);
});

app.get('/academy', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('academy', renderData);
});

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

app.get('/about', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('about', renderData);
});

app.get('/job', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('job', renderData);
});

app.get('/coin', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('coin', renderData);
});

app.get('/contact', (req, res) => {
    const renderData = {
        user: req.session.user || null,
        purchaseSuccess: req.session.purchaseSuccess || false,
        voucherAlreadyOwned: req.session.voucherAlreadyOwned || false
    };
    if (req.session.purchaseSuccess) delete req.session.purchaseSuccess;
    if (req.session.voucherAlreadyOwned) delete req.session.voucherAlreadyOwned;
    res.render('contact', renderData);
});