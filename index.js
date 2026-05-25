const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
const mysql = require('mysql2');
const PORT = 3000;


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'node_matching_db'
});
connection.connect((err) => {
    if(err){
        console.error('データベースにつながりませんでした:原因::'+err.stack);
        return;
    }
    console.log('xamppのデータベースにつながりました')
});


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
            <title>クラン募集一覧</title>
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
                <h1 class="clan-name">NSS MATCHING CLAN</h1>
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
app.post('/add', (req, res) => {
    // 1. フォームから送られてきた「実際の入力内容」をキャッチする！
    const title = req.body.title;
    const content = req.body.content;

    // 2. SQLの ? の中に、上でキャッチした変数を当てはめる
    const sql = 'INSERT INTO posts(title, content) VALUES(?, ?)';
    const values = [title, content]; // ← ここが ['初めての編集', ...] のままだと固定されてしまいます

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('データ挿入エラー:', err);
            return res.status(500).send('データの保存に失敗しました');
        }
        // 保存できたら自動的に一覧（/posts）へ戻す
        res.redirect('/posts');
    });
});
app.get('/new', (req, res) =>{
    const html = `
    <h1>新規募集の投稿</h1>
    <form action="/add" method="POST">
        <div>
            <label for="title">タイトル:</label><br>
            <input type="text" id="title" name="title" required style="width: 300px">
        </div>
        <br>
        <div>
            <label for="content">内容：</label><br>
            <textarea id="content" name="content" required style="width: 300px; height: 100px;"></textarea>
        </div>
        <br>
        <button type = "submit">募集を投稿する</button>
    </form>
    <br>
    <a href="/posts">募集一覧に戻る</a>
    `;
    res.send(html);
});

// ブラウザでアクセスしたときに表示する内容
app.get('/', (req, res) => {
    res.send(`
        <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
            <h1>🎉 Node.jsサーバー起動成功！</h1>
            <p>ChatGPTのループを抜け出して、ついにここまで来ましたね！</p>
            <p style="color: #ff4757; font-weight: bold;">ここから最強のマッチング掲示板を作っていこう！</p>
        </div>
    `);
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

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` 🚀 サーバーが正常に起動したよ！`);
    console.log(` 👉 URLはこちら: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});