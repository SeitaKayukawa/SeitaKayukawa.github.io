# 公開URL移行（2026-11-05）

## 公開先と更新先

- 正規サイト: https://seitakayukawa.github.io/
- 今後の更新: `SeitaKayukawa/SeitaKayukawa.github.io` の `main`・ルート。
- 旧サイト: https://wotipati.github.io/ — `Wotipati/Wotipati.github.io` の `main`・ルートを維持。
- 両方ともGitHub Pages標準Jekyllビルド。カスタムドメイン、リポジトリ改名、アカウント改名は使用しない。
- 旧リポジトリ・アカウントを削除／改名したり、旧Pagesを無効化しない。

## 開始時の確認

MacBookの `/Users/kayukawa/Wotipati.github.io` はクリーンな `main`、remoteは `git@github.com:Wotipati/Wotipati.github.io.git`。
`git fetch origin` 後も `origin/main` は `de6eeae`。同コミットを祖先に含むことを確認した。
`gh` の認証は `SeitaKayukawa`。旧リポジトリはpush可・admin不可。
旧Pagesは `build_type: legacy`、`main`・`/`、`cname: null`、`status: built`。
移行先リポジトリは未作成だった。

## 仕組みと制約

`url` は両リポジトリとも新しい正規URLとし、canonical、OGP、sitemapを新URLへ統一する。
サイト内の旧ドメイン絶対リンクはルート相対リンクへ変更した。Xのハンドルや別のGitHubリポジトリへのリンクは別物なので維持する。

新リポジトリでは `_config.yml` の `legacy_redirect: false`。
新サイトの公開検証後に、旧リポジトリだけ `legacy_redirect: true` にする。
共通headとBibTeXレイアウトにJekyllで転送コードを展開するため、カスタムプラグインやサーバー処理は不要。

| アクセス | 動作 |
| --- | --- |
| 既存HTML、JavaScript有効 | `location.replace` で新origin + 元のpathname + search + hashへ移動。トップへの一律転送はしない |
| JavaScript無効 | ページ別のnoscript meta refreshで対応ページへ移動。自動転送も無効なら明示的なリンクを使用 |
| JavaScript無効時のquery/hash | リクエスト値を静的Jekyllが取得できないため保持を保証できない。必要ならアドレスを手動でコピー |
| PDF・画像・動画・InDesign等 | 元のバイト列とパスを両リポジトリで保持し、旧URLも200で直接配信。HTMLへの置換はしない |
| 存在しない旧パス | カスタム404がJavaScriptで同じパスを新サイトへ渡す。新側にもなければ404。JavaScript無効時はドメイン置換の案内 |

これは **HTTP 301/308ではなく、HTTP 200のHTMLを読んだブラウザによる転送**。
404経由なら最初の応答は404。`curl -L` やJavaScriptを実行しないクライアントはJavaScript転送に追従しない。
転送先originは固定で、queryを転送先として解釈しない。JavaScriptは旧ホスト名でのみ動作し、新サイトから旧サイトへ戻る処理はない。
PDF等の既存URLは存続するが、そのアドレス自体は新ドメインに変わらない。
PDF本文内の印刷されたURL等も今回は編集せず、旧HTMLの転送で受け止める。

GitHubのリポジトリURLの転送とPagesのWebページ転送は別の機能。
[GitHubの改名仕様](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)、
[Pagesの静的配信](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、
[JekyllのHTML転送方式](https://github.com/jekyll/jekyll-redirect-from#how-it-works) を確認した。

## 公開順序と検証

1. `de6eeae` を含む履歴・全資料を新リポジトリへpushし、main直下をPagesの公開元にする。
2. 新サイトのCI・Pages公開成功後に、各HTMLと静的資料、canonical・OGP・sitemapを確認する。
3. その後で旧リポジトリの転送を有効にし、同じビルド・検証を実施してpushする。
4. 新旧URLの対応、query/hash保持、転送ループ防止、資料の直接配信を確認する。

公開前の必須コマンド:

```sh
bundle exec jekyll build --trace --strict_front_matter
node scripts/check-site.mjs
node scripts/check-migration.mjs
git diff --check
```

開始時は45 HTML・20 projects・33 publications。404ページ追加後は46 HTMLで、既存45ページのパスは変えない。
`check-migration.mjs` は全HTMLのcanonical、OGP、旧ドメイン参照、sitemapを検査する。
旧サイトでは全HTMLの転送スクリプトを実行し、query/hash、indexの別表記、エンコード、外部URL風の入力、ループ防止、noscriptの行き先も検査する。
既存CSS、レイアウト、アクセシビリティ用の本文・メディア説明、CHI 2026サムネイル、CV PDFとInDesignを保持する。メディアの縮小・再圧縮はしない。

ローカル検証結果:

- 新サイト・旧サイト設定の両方でJekyllビルドと46 HTML・20 projects・33 publicationsの検証が成功。
- 旧設定で153ケースのパス・query・hash保持とホスト別のループ防止を確認。
- 移行前の全ファイルが残り、非HTMLの静的ファイル212件はSHA-256が一致（生成XML等を除く）。
- 既存45 HTMLの生成結果は、URLと空白を正規化すると移行前と一致。CSSや本文構造の変更なし。
- ローカルブラウザで従来の表示を確認。`git diff --check` 成功。
- GitHub Actionsの `Validate site` はpush・PRに加えて手動実行も可能。

## 今後の運用と復旧

通常の更新は新リポジトリで行う。旧HTMLの転送先は同じパスなので、新サイトの既存パスは削除・変更しない。
旧資料URLを今後も最新内容へ更新したい場合は、該当する資料ファイルを旧リポジトリにも同じパスでコピーして検証・pushする。自動同期は行わない。
旧サイトの転送を一時停止する場合は、旧リポジトリだけ `legacy_redirect: false` にしてビルド・検証・pushする。元のHTML本文と資料は残してある。
新リポジトリへ旧設定を誤って取り込まない。CIは新サイトで転送コードが出力されないことも検査する。
