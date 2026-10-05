# eTyping Auto Solver (Educational)

このリポジトリは、e-typing のタイピング問題を Chrome のブックマークから起動するための学習用スクリプトです。

- 目的: ブラウザ自動化の仕組みを学ぶ
- 対象: 自分が所有・確認できる環境 / 教育目的
- 注意: 本番サービスや他人の環境での不正利用は避けてください

## 使い方

1. ブラウザのブックマークバーに新しいブックマークを作成します。
2. URL に次のコードを貼り付けます。
3. e-typing の問題ページでそのブックマークを押します。

```javascript
javascript:(function(){var s=document.createElement('script');s.src='https://raw.githubusercontent.com/d51youkun/etyping/main/bookmarklet.js';document.body.appendChild(s);})();
```

上記の URL は GitHub 上のファイルを直接読む方式です。もしローカルで動かしたい場合は、`bookmarklet.js` をブラウザの DevTools から貼り付けて実行しても構いません。

## ファイル構成

- `bookmarklet.js`: Chrome ブックマークから実行する本体
- `README.md`: 使い方と注意事項

## 実装の考え方

- 問題文の候補を DOM から収集する
- 文字数と日本語文字の含有率で最適な候補を選ぶ
- 対象の入力欄に文字列を入れ、Enter / 送信動作を実行する
- 新しい問題が出るたびに再実行する

## 参考

このコードは「ブラウザ自動化のデモ」として、タイピング問題の入力欄に対して `input` / `keydown` 系イベントを発火させる構成になっています。

自分の学習用として、ページ構造の変化に合わせてセレクタや入力コードを調整してください。
