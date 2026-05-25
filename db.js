const mysql = require('mysql2');
const connection = mysql.createConnection({
    host:'localhost',
    user: 'root',
    password: '',
    database: 'node_matching_db'
});

connection.connect((err) => {
    if(err){
        console.error('データベース接続に失敗しました',err);
        return;
    }
    console.log('Mysqlに接続しました');
});
module.exports = connection;