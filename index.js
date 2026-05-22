const express = require('express');
const app = express();
const mysql = require('mysql2');
const PORT = 3000;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    datebase: 'node_matching_db'
});
connection.connect((err) => {
    if(err){
        console.error('データベースにつながりませんでした:原因::'+err.stack);
        return;
    }
    console.log('xamppのデータベースにつながりました')
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

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` 🚀 サーバーが正常に起動したよ！`);
    console.log(` 👉 URLはこちら: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});