立ち上げ　
xamppでapacheとMysqlの立ち上げ
node.index.jsをコマンドプロンプトで

READMEの手順
１　リポジトリクローンを作る！
git clone<URL>              ※今回の場合タスク管理のところに入れるので（https://github.com/ryuto0322/TaskManagement）

↑の後　cd TaskManagement これを打たないと次のステップに行けません

2 ライブラリインストール！
composer install
npm install     

３　環境設定ファイルの準備
cp .env.example .env
php artisan key:generate                    ※意味　GITには秘密鍵（env）を置いていない。つまり鍵がないのでgitを動かせない。なのでgitの中でシークレットキーを作っているということ。

４マイグレーション（データベース構築）

php artisan migrate

５　サーバー起動

php artisan serve

 1. mainブランチに移動して最新にする
git checkout main
git pull origin main

 2. 新しい機能用のブランチを作って切り替える
git checkout -b feature/task-history


git switch -c ブランチ名・・・作業ブランチ切り替え

git push・・・自分のパソコンでコミットした変更をリポジトリにアップロードして反映させるコマンド

サーバー起動手順
サーバー起動　php artisan serve
レイアウト起動 npm run dev
ライン送信起動　php artisan schedule:work