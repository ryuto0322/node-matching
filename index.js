const express = require('express');
const connection = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();

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

// 1. トップページ（/）
app.get('/', (req, res) => {
    res.redirect('/posts');
});

// 2. 趣味掲示板一覧画面（外部の views/index.ejs を読み込む）
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

// 3. 投稿の詳細画面（外部の views/detail.ejs を読み込む）
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
                comments: commentResults
            });
        });
    });
});

// 4. チャット（コメント）の送信処理
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

// 5. 新規登録画面を表示
app.get('/signup', (req, res) => {
    res.render('signup');
});

// 6. 新規登録処理
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

// 7. ログイン画面を表示
app.get('/login', (req, res) => {
    res.render('login');
});

// 8. ログイン処理
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

// サーバー起動
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` 🚀 サーバーが正常に起動したよ！`);
    console.log(` 👉 URLはこちら: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});