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
    res.redirect('/signup');
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



// メッセージ一覧画面を表示するルート
// 🌟 メッセージ一覧画面を表示する（LINE風に最新メッセージを自動取得）
app.get('/messages', (req, res) => {
    const myId = req.session.userId; // ログイン中の自分のID

    if (!myId) return res.redirect('/login');

    // 自分とやり取りした相手の「最新メッセージ」をごっそり取得するSQL
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

        // 🌟 ここで 'chatPartners' という名前で結果を渡すことで、EJSのエラーが完全に消えます！
        res.render('messages', { chatPartners: results });
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
// 💡 掲示板への投稿を処理する場所のイメージ
app.post('/posts', (req, res) => {
    const myId = req.session.userId; // 🌟 ログイン中の自分のIDを取得
    const { title, content } = req.body; // フォームから届いたタイトルや本文

    if (!myId) return res.redirect('/login');

    // 🌟 SQLに「user_id」を追加して、誰が書いた投稿かをハッキリ刻む！
    const sql = 'INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)';
    
    connection.query(sql, [title, content, myId], (err, result) => {
        if (err) {
            console.error('投稿エラー:', err);
            return res.status(500).send('投稿に失敗しました');
        }
        res.redirect('/posts');
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



// 🌟 特定の相手（:id）とのチャット画面を表示する
// 🌟 index.js のこのルートを完全に上書きします
// 🌟 メッセージ一覧画面を表示する（LINE風に最新メッセージを自動取得）
app.get('/chat/:id', (req, res) => {
    const myId = req.session.userId; // ログイン中の自分のID

    if (!myId) return res.redirect('/login');

    // 自分とやり取りした相手の「最新メッセージ」をごっそり取得するSQL
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

        // 🌟 ここで 'chatPartners' を EJS に渡すことでエラーが直ります！
        res.render('messages', { chatPartners: results });
    });
});



// 🌟 メッセージを送信してDBに保存する処理（これもセットで下に貼り付けてね）
app.post('/chat/:id', (req, res) => {
    const myId = req.session.userId;
    const theirId = req.params.id;
    const message = req.body.message; // 🌟 ここが「message」

    if (!myId) return res.redirect('/login');

    const sql = 'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)';
    
    // 🌟 下の配列の中身も「messageContent」から「message」に変更！
    connection.query(sql, [myId, theirId, message], (err, result) => {
        if (err) {
            console.error('メッセージ送信エラー:', err);
            return res.status(500).send('メッセージの送信に失敗しました');
        }
        // 送信が終わったら、同じチャット画面をリロードする
        res.redirect(`/chat/${theirId}`);
    });
});



// 🧪 【テスト専用】確実にチャット画面（/chat/2）を開くための裏ルート
app.get('/test-chat', (req, res) => {
    // 1. まず自分を「ユーザーID: 1」として強制ログインさせる
    req.session.userId = 1;

    // 2. 本来のデータベース接続を無視して、空のメッセージ履歴として画面（chat.ejs）を強制表示する！
    res.render('chat', { 
        messages: [],       // 履歴は一旦空っぽ
        myId: 1,           // 自分のID
        theirId: 2         // 相手のID（クランメンバーA）
    });
});
// 4. チャット（コメント）の送信処理
app.post('/posts/:id/comments', (req, res) => {
    const postId = req.params.id; // URLの「:id」から投稿のIDをゲット
    const commentContent = req.body.comment_content; // フォームから届いた本文
    const username = req.session.username || 'ゲスト'; // ログイン中の名前（なければゲスト）

    // 💡 クイズ①：データベースに保存するためのSQL文です。
    // commentsテーブルの post_id, name, content に、それぞれ「？」のデータを入れます。
    const sql = 'INSERT INTO comments (post_id, name, content) VALUES (?,?,?)';
    
    // 💡 クイズ②：上のSQLの「？」に当てはめる実際の変数を順番に並べます。
    connection.query(sql, [postId, username, commentContent], (err, result) => {
        if (err) {
            console.error('コメント保存エラー:', err);
            return res.status(500).send('コメントの送信に失敗しました');
        }
        
        // 💡 クイズ③：送信が終わったら、元の詳細画面（/posts/8 など）に自動で引き返します。
        res.redirect(`/posts/${postId}`);
    });
});


// サーバー起動
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` 🚀 サーバーが正常に起動したよ！`);
    console.log(` 👉 URLはこちら: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});