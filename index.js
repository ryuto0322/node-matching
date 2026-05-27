const express = require('express');
const connection = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, uniqueSuffix + '.' + ext); 
    }
});

const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
const PORT = 3000;

app.use(session({
    secret: 'secret-key-matching-app',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

// ==========================================
// 1. 認証関連（登録・ログイン）
// ==========================================

app.get('/', (req, res) => {
    res.redirect('/signup');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        connection.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('ユーザー登録エラー:', err);
                return res.status(500).send('登録に失敗しました');
            }
            res.redirect('/login');
        });
    } catch (error) {
        res.status(500).send('サーバーエラーが発生しました');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';

    connection.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).send('エラーが発生しました');
        if (results.length === 0) return res.status(401).send('メールアドレスまたはパスワードが違います');

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/posts');
        } else {
            res.status(401).send('メールアドレスまたはパスワードが違います');
        }
    });
});

// ==========================================
// 2. 掲示板関連（一覧・詳細・コメント）
// ==========================================

app.get('/posts', (req, res) => {
    const sql = 'SELECT * FROM posts ORDER BY created_at DESC';

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('データ取得エラー', err);
            return res.status(500).send('データ取得に失敗しました');
        }
        res.render('index', { results: results });
    });
});

app.get('/new', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.render('new');
});

app.post('/posts', (req, res) => {
    const myId = req.session.userId; 
    const { title, content } = req.body; 

    if (!myId) return res.redirect('/login');

    const sql = 'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)';
    
    connection.query(sql, [title, content, myId], (err, result) => {
        if (err) {
            console.error('投稿エラー:', err);
            return res.status(500).send('投稿に失敗しました');
        }
        res.redirect('/posts');
    });
});

app.get('/posts/:id', (req, res) => {
    const postId = req.params.id;
    const postSql = 'SELECT * FROM posts WHERE id = ?';

    connection.query(postSql, [postId], (err, postResults) => {
        if (err) return res.status(500).send('エラーが発生しました');
        if (postResults.length === 0) return res.status(404).send('投稿が見つかりません');

        const post = postResults[0];
        const formattedDate = new Date(post.created_at).toLocaleString('ja-JP');

        const commentSql = 'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC';
        connection.query(commentSql, [postId], (err, commentResults) => {
            if (err) return res.status(500).send('チャットの取得に失敗しました');

            res.render('detail', { 
                post: post, 
                formattedDate: formattedDate,
                comments: commentResults,
                myId: req.session.userId
            });
        });
    });
});

app.post('/posts/:id/comments', (req, res) => {
    const postId = req.params.id; 
    const commentContent = req.body.comment_content; 
    const username = req.session.username || 'ゲスト'; 

    const sql = 'INSERT INTO comments (post_id, name, content) VALUES (?, ?, ?)';
    
    connection.query(sql, [postId, username, commentContent], (err, result) => {
        if (err) {
            console.error('コメント保存エラー:', err);
            return res.status(500).send('コメントの送信に失敗しました');
        }
        res.redirect(`/posts/${postId}`);
    });
});

app.get('/posts/:id/delete', (req, res) => {
    const postId = req.params.id;
    const myId = req.session.userId;

    if (!myId) return res.redirect('/login');

    const sql = 'DELETE FROM posts WHERE id = ? AND user_id = ?';

    connection.query(sql, [postId, myId], (err, result) => {
        if (err) {
            console.error('削除エラー:', err);
            return res.status(500).send('削除に失敗しました');
        }
        res.redirect('/posts');
    });
});

// ==========================================
// 3. メッセージ（1対1ダイレクトチャット）関連
// ==========================================

app.get('/messages', (req, res) => {
    const myId = req.session.userId; 

    if (!myId) return res.redirect('/login');

    const sql = `
        SELECT 
            u.id AS partner_id,
            u.username AS partner_name,
            m.message AS latest_message,
            m.created_at AS time
        FROM messages m
        JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id)
        WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?
        AND m.id = (
            SELECT MAX(id) 
            FROM messages 
            WHERE (sender_id = ? AND receiver_id = u.id) 
               OR (sender_id = u.id AND receiver_id = ?)
        )
        ORDER BY m.created_at DESC`;

    connection.query(sql, [myId, myId, myId, myId, myId], (err, results) => {
        if (err) {
            console.error('メッセージ一覧取得エラー:', err);
            return res.status(500).send('一覧の取得に失敗しました');
        }
        res.render('messages', { chatPartners: results });
    });
});

app.get('/chat/:id', (req, res) => {
    const myId = req.session.userId; 

    if (!myId) return res.redirect('/login');

    const sql = `
        SELECT 
            u.id AS partner_id,
            u.username AS partner_name,
            m.message AS latest_message,
            m.created_at AS time
        FROM messages m
        JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id)
        WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?
        AND m.id = (
            SELECT MAX(id) 
            FROM messages 
            WHERE (sender_id = ? AND receiver_id = u.id) 
               OR (sender_id = u.id AND receiver_id = ?)
        )
        ORDER BY m.created_at DESC`;

    connection.query(sql, [myId, myId, myId, myId, myId], (err, results) => {
        if (err) {
            console.error('メッセージ一覧取得エラー:', err);
            return res.status(500).send('一覧の取得に失敗しました');
        }
        res.render('messages', { chatPartners: results });
    });
});

app.post('/chat/:id', (req, res) => {
    const myId = req.session.userId;
    const theirId = req.params.id;
    const message = req.body.message; 

    if (!myId) return res.redirect('/login');

    const sql = 'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)';
    
    connection.query(sql, [myId, theirId, message], (err, result) => {
        if (err) {
            console.error('メッセージ送信エラー:', err);
            return res.status(500).send('メッセージの送信に失敗しました');
        }
        res.redirect(`/chat/${theirId}`);
    });
});

// ==========================================
// 4. プロフィール関連
// ==========================================

app.get('/profile', (req, res) => {
    const myId = req.session.username; 
    if (!myId) return res.redirect('/login');
    const testUser = { username: "名前は " + myId + " です" };
    res.render('profile', { user: testUser });
});

app.post('/profile/update', upload.single('avatar'), (req, res) => {
    console.log("文字データ:", req.body);
    console.log("画像データ:", req.file);

    const { bio, birthday, age, gender } = req.body;
    const avatar = req.file ? req.file.filename : null;
    const myId = req.session.username;

    const sql = "UPDATE users SET bio = ?, birthday = ?, age = ?, gender = ?, avatar = ? WHERE username = ?";

    connection.query(sql, [bio, birthday, age, gender, avatar, myId], (err, result) => {
        if (err) {
            console.error("データベース接続エラー", err);
            return res.status(500).send("データベースの保存に失敗しました");
        }
        console.log("phpmyadminへの保存が成功しました");
        res.redirect('/profile?success=true'); 
    });
});

// ==========================================
// 5. サーバー起動
// ==========================================
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` 🚀 サーバーが正常に起動したよ！`);
    console.log(` 👉 URLはこちら: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});