const express = require('express');
const connection = require('./db');
const bcrypt = require('bcrypt'); // 🌟 パスワード暗号化の道具
const session = require('express-session'); // 🌟 ログイン状態を記憶する道具

const app = express();

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
const PORT = 3000;

// 🌟【重要】セッション（ログインの記憶）の設定をここに追加！
app.use(session({
    secret: 'secret-key-matching-app', // 記憶を暗号化するための秘密の合言葉（何でもOK）
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } // ログインを維持する時間（ここでは1時間）
}));


app.get('/posts', (req, res) => {
    const sql = 'SELECT * FROM posts ORDER BY created_at DESC';

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('データ取得エラー', err);
            return res.status(500).send('データ取得に失敗しました');
        }
        
        let html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <title>趣味掲示板一覧</title>
            <style>
                body {
                    font-family: 'Arial Black', Gadget, sans-serif;
                    background-color: #1a2436; /* クラロワ風の深いダークブルー */
                    color: #fff;
                    margin: 0;
                    padding: 20px;
                }
                .clan-header {
                    background: linear-gradient(180deg, #2a3d5c 0%, #17243c 100%);
                    border: 3px solid #4a638d;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    max-width: 650px;
                    margin: 0 auto 20px auto;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.4);
                }
                .clan-badge {
                    font-size: 3rem;
                    margin-bottom: 5px;
                }
                .clan-name {
                    font-size: 1.8rem;
                    margin: 0;
                    color: #ffca28; /* ゴールド文字 */
                    text-shadow: 2px 2px 0px #000;
                }
                .clan-info {
                    font-size: 0.9rem;
                    color: #a0b2ce;
                    margin-top: 5px;
                }
                .container {
                    max-width: 650px;
                    margin: 0 auto;
                }
                .btn-container {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .btn-clash {
                    display: inline-block;
                    background: linear-gradient(180deg, #ff9800 0%, #e65100 100%);
                    color: white;
                    text-decoration: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 1.1rem;
                    border: 2px solid #fff;
                    box-shadow: 0 4px 0px #b33600, 0 6px 10px rgba(0,0,0,0.5);
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                }
                .btn-clash:active {
                    transform: translateY(4px);
                    box-shadow: none;
                }
                .post-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .member-row {
                    background: linear-gradient(90deg, #243552 0%, #1b2940 100%);
                    border: 2px solid #364e75;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                }
                /* クラロワの順位バッジ風 */
                .rank-badge {
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 1.1rem;
                    margin-right: 15px;
                    border: 2px solid #fff;
                    text-shadow: 1px 1px 0px #000;
                    flex-shrink: 0;
                }
                .rank-1 { background: #ffd700; color: #000; } /* 金 */
                .rank-2 { background: #c0c0c0; color: #000; } /* 銀 */
                .rank-3 { background: #cd7f32; color: #fff; } /* 銅 */
                .rank-other { background: #4e6587; color: #fff; border-color: #2b3b52; }

                .member-info {
                    flex-grow: 1;
                }
                .member-title a {
                    text-decoration: none;
                    color: #fff;
                    font-size: 1.2rem;
                    text-shadow: 1px 1px 2px #000;
                }
                .member-title a:hover {
                    color: #ffca28;
                }
                .member-content {
                    font-size: 0.95rem;
                    color: #b0c4de;
                    margin-top: 5px;
                    font-family: sans-serif;
                    white-space: pre-wrap;
                }
                .trophy-section {
                    text-align: right;
                    font-size: 0.8rem;
                    color: #8da2c4;
                    margin-left: 10px;
                    flex-shrink: 0;
                }
            </style>
        </head>
        <body>
            <div class="clan-header">
                <div class="clan-badge">👑</div>
                <h1 class="clan-name">趣味掲示板へようこそ！</h1>
                <div class="clan-info">現在の募集枠: ${results.length} 件 | タイプ: 誰でも歓迎</div>
            </div>

            <div class="container">
                <div class="btn-container">
                    <a href="/new" class="btn-clash">＋ 募集を投稿する</a>
                </div>

                <ul class="post-list">
        `;

        // 配列のインデックス（番号）を使ってループを回す
        results.forEach((post, index) => {
            const formattedDate = new Date(post.created_at).toLocaleString('ja-JP');
            const rank = index + 1; // 1位、2位、3位...

            // 順位によってバッジの色を変えるクラスを決定
            let rankClass = 'rank-other';
            if (rank === 1) rankClass = 'rank-1';
            if (rank === 2) rankClass = 'rank-2';
            if (rank === 3) rankClass = 'rank-3';

            html += `
                <li class="member-row">
                    <div class="rank-badge ${rankClass}">${rank}</div>
                    
                    <div class="member-info">
                        <h2 class="member-title">
                            <a href="/posts/${post.id}">${post.title}</a>
                        </h2>
                        <div class="member-content">${post.content}</div>
                    </div>
                    
                    <div class="trophy-section">
                        🏆 ONLINE<br>
                        <small>${formattedDate}</small>
                    </div>
                </li>
            `;
        });

        html += `
                </ul>
            </div>
        </body>
        </html>
        `;
        
        res.send(html);
    });
});
// フォームからの投稿データを受け取ってDBに保存するルート
// 💬 チャット（コメント）を送信して、データベースに保存するルート
// 💬 チャットを送信して、データベースに保存するルート
app.post('/posts/:id/comments', (req, res) => {
    const postId = req.params.id;
    const commentContent = req.body.comment_content;

    // 🌟ログインしている人の名前を取得（もしログインしていなければ「ゲスト」にする）
    const username = req.session.username || 'ゲスト';

    // SQLのINSERT文に name も追加して保存！
    const sql = 'INSERT INTO comments (post_id, name, content) VALUES (?, ?, ?)';
    
    connection.query(sql, [postId, username, commentContent], (err, result) => {
        if (err) {
            console.error('コメント保存エラー:', err);
            return res.status(500).send('コメントの送信に失敗しました');
        }
        res.redirect(`/posts/${postId}`);
    });
});
// 投稿の詳細画面を表示するルート（チャット履歴の取得付き！）
app.get('/posts/:id', (req, res) => {
    const postId = req.params.id;

    // 1. まずは「投稿そのもの」を取得
    const postSql = 'SELECT * FROM posts WHERE id = ?';
    connection.query(postSql, [postId], (err, postResults) => {
        if (err) return res.status(500).send('エラーが発生しました');
        if (postResults.length === 0) return res.status(404).send('投稿が見つかりません');

        const post = postResults[0];
        const formattedDate = new Date(post.created_at).toLocaleString('ja-JP');

        // 🔥【新機能】2. この投稿に紐づく「チャット履歴」を新しく作ったテーブルから古い順（ASC）で全件取得！
        const commentSql = 'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC';
        connection.query(commentSql, [postId], (err, commentResults) => {
            if (err) return res.status(500).send('チャットの取得に失敗しました');

            // 3. 取得した「投稿」と「チャット履歴（配列）」の両方を、まとめてdetail.ejsに送り込む！
            res.render('detail', { 
                post: post, 
                formattedDate: formattedDate,
                comments: commentResults // 👈 これを新しく画面に渡します！
            });
        });
    });
});

// ブラウザでアクセスしたときに表示する内容
// 投稿の詳細画面を表示するルート
app.get('/posts/:id', (req, res) => {
    const postId = req.params.id;
    const sql = 'SELECT * FROM posts WHERE id = ?';
    
    connection.query(sql, [postId], (err, results) => {
        if (err) {
            console.error('データ取得エラー:', err);
            return res.status(500).send('エラーが発生しました');
        }
        if (results.length === 0) {
            return res.status(404).send('指定された投稿が見つかりません');
        }

        const post = results[0];
        const formattedDate = new Date(post.created_at).toLocaleString('ja-JP');

        // 📌 先ほど作ったクラロワ風の views/detail.ejs を呼び出す！
        res.render('detail', { post: post, formattedDate: formattedDate });
    });
});
// 💬 チャット（コメント）を送信したときの処理
app.post('/posts/:id/comments', (req, res) => {
    const postId = req.params.id;
    const commentContent = req.body.comment_content; // 画面から送られてきた文字

    // 🌟本来はここでSQLを使ってテーブルに保存しますが、
    // 🌟まずはエラーを出さずに「送信成功」を体感するために、一覧へリダイレクトさせます！
    console.log(`【チャット受信】投稿ID: ${postId} へのメッセージ: ${commentContent}`);
    
    // 送信が終わったら、元の詳細画面に戻す
    res.redirect(`/posts/${postId}`);
});
// 投稿の詳細画面を表示するルート
app.get('/posts/:id', (req, res) => {
    // URLの末尾（/posts/1 の「1」など）を数字のIDとして取得
    const postId = req.params.id;

    // データベースから、このIDのデータ「1件だけ」を取得するSQL
    const sql = 'SELECT * FROM posts WHERE id = ?';

    connection.query(sql, [postId], (err, results) => {
        if (err) {
            console.error('データ取得エラー:', err);
            return res.status(500).send('エラーが発生しました');
        }

        // もしデータが見つからなかった場合
        if (results.length === 0) {
            return res.status(404).send('指定された投稿が見つかりません');
        }

        // 見つかった1件のデータを取り出す
        const post = results[0];
        const formattedDate = new Date(post.created_at).toLocaleString('ja-JP');

        // 詳細画面のHTMLとCSS
        let html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <title>${post.title} - 募集詳細</title>
            <style>
                body {
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                    background-color: #f5f7fa;
                    color: #333;
                    margin: 0;
                    padding: 40px 20px;
                }
                .container {
                    max-width: 700px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }
                h1 {
                    color: #2c3e50;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 10px;
                    margin-top: 0;
                }
                .meta {
                    font-size: 0.9rem;
                    color: #999;
                    margin-bottom: 20px;
                }
                .content {
                    font-size: 1.1rem;
                    line-height: 1.8;
                    white-space: pre-wrap;
                    background: #fafafa;
                    padding: 20px;
                    border-radius: 5px;
                    border: 1px solid #eee;
                    margin-bottom: 30px;
                }
                .actions {
                    display: flex;
                    justify-content: space-between;
                }
                .btn {
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-weight: bold;
                    text-decoration: none;
                    cursor: pointer;
                }
                .btn-back {
                    background-color: #6c757d;
                    color: white;
                }
                .btn-delete {
                    background-color: #dc3545;
                    color: white;
                    border: none;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${post.title}</h1>
                <div class="meta">📅 投稿日時: ${formattedDate}</div>
                
                <div class="content">${post.content}</div>
                
                <div class="actions">
                    <a href="/posts" class="btn btn-back">⬅ 一覧に戻る</a>
                    
                    <form action="/posts/${post.id}/delete" method="POST" onsubmit="return confirm('本当に削除しますか？');">
                        <button type="submit" class="btn btn-delete">🗑️ この募集を削除する</button>
                    </form>
                </div>
            </div>
        </body>
        </html>
        `;
        res.send(html);
    });
});

// 1. 新規登録画面を表示
app.get('/signup', (req, res) => {
    res.render('signup');
});

// 2. 新規登録のボタンが押されたときの処理
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 🔥 実務の鉄則：パスワードを安全に暗号化（ハッシュ化）する
        const hashedPassword = await bcrypt.hash(password, 10);

        // データベースにユーザーを保存
        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        connection.query(sql, [username, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('ユーザー登録エラー:', err);
                return res.status(500).send('登録に失敗しました（メールアドレスが既に使われている可能性があります）');
            }
            // 登録できたらログイン画面へ移動
            res.redirect('/login');
        });
    } catch (error) {
        res.status(500).send('サーバーエラーが発生しました');
    }
});

// 3. ログイン画面を表示
app.get('/login', (req, res) => {
    res.render('login');
});

// 4. ログインボタンが押されたときの処理
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // メールアドレスからユーザーを探す
    const sql = 'SELECT * FROM users WHERE email = ?';
    connection.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).send('エラーが発生しました');
        if (results.length === 0) return res.status(401).send('メールアドレスまたはパスワードが違います');

        const user = results[0];

        // 🔥 入力されたパスワードと、DBにある暗号化されたパスワードが一致するか検証
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // 🎉 一致したらセッションに「この人ログイン中！」と記憶させる
            req.session.userId = user.id;
            req.session.username = user.username;

            // ログイン成功したら、掲示板の一覧画面へ！
            res.redirect('/posts');
        } else {
            res.status(401).send('メールアドレスまたはパスワードが違います');
        }
    });
});
// トップページ（/）にアクセスされたら、一覧画面（/posts）にリダイレクトする
app.get('/', (req, res) => {
    res.redirect('/posts');
});

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` 🚀 サーバーが正常に起動したよ！`);
    console.log(` 👉 URLはこちら: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});