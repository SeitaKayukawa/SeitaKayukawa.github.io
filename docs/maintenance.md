# Website maintenance guide

このサイトはGitHub PagesのJekyllビルドを利用しています。公開URLと見た目を維持しながら、共通部品と一覧データを一元管理しています。

2026-11-05のURL移行後は `https://seitakayukawa.github.io/` が正規URLです。
通常の更新先は **SeitaKayukawa/SeitaKayukawa.github.io の main** です。
旧 **Wotipati/Wotipati.github.io** は転送と既存資料の直リンクを維持するため残します。
移行手順・検証・制約は [url-migration-2026-11-05.md](url-migration-2026-11-05.md) を参照してください。

Jekyllは公開時にテンプレートとデータを完成済みのHTMLへ展開します。アクセスのたびにページを生成したり、ブラウザからJSONを取得したりする構成ではありません。公開後は従来と同じ静的サイトとして配信されます。

## ローカルで確認する

Ruby 3.3を用意し、初回だけ依存関係をインストールします。

```sh
bundle install
```

開発サーバーを起動します。

```sh
bundle exec jekyll serve
```

`http://127.0.0.1:4000/`で確認できます。

公開前にビルドとサイト検証を実行します。

```sh
bundle exec jekyll build --trace --strict_front_matter
node scripts/check-site.mjs
node scripts/check-migration.mjs
git diff --check
```

検証では、全HTMLのローカルリンクとページ内アンカー、重複ID、名前のないリンク、見出し・main・スキップ先、画像のalt属性、動画の説明と参照先、iframeのタイトル、一覧データの必須項目などを確認します。同じ検証はPull Requestでも自動実行されます。説明の正確さや読み上げの使いやすさは別途確認してください。

## 構成

- `_includes/`: head、ナビゲーション、フッター、プロジェクトカード、論文表示などの共通部品
- `_data/projects.json`: トップページのResearch Projects一覧
- `_data/publications.json`: 論文一覧と各リソースへのリンク
- `_data/resource_types.json`: DOI、Paper、BibTeXなどのラベル表示設定
- `_layouts/bibtex.html`: BibTeXページの共通レイアウト
- `_templates/project-page.html`: 新しいプロジェクト詳細ページの雛形
- `projects/`: 各プロジェクト固有の本文と素材
- `scripts/check-site.mjs`: ビルド後のサイト検証

共通ナビゲーションやheadを各ページへコピーする必要はありません。サイト全体の共通表示は`_includes/`で変更します。

## 論文を追加する

1. `_data/publications.json`の該当カテゴリへレコードを追加します。
   - `full`: Journal / Conference Full Paper
   - `selected`: 選択掲載するShort Paper / Demo / Poster
   - `other_international`: その他の国際発表
   - `other_domestic`: 国内発表
2. `citation_html`に引用表記を、`resources`にラベルとリンクを記述します。
3. `authors`、`title`、`year`、`venue`を`citation_html`と一致させます。不一致は検証スクリプトが検出します。
4. PDFやBibTeXを掲載する場合は`projects/`以下へ配置します。
5. ビルドとサイト検証を実行します。

最小のレコード例です。`kind`は`conf`、`projectpage`、`link`、`slide`、`pdf`、`bibtex`、`award`から選べます。

```json
{
  "id": "paper-unique-id",
  "language": "en",
  "title": "Paper title.",
  "authors": "Authors.",
  "year": 2026,
  "venue": "In Venue",
  "citation_html": "<span>Authors.</span> <span>2026.</span> <span class=\"body_en_bold\">Paper title.</span> <span>In <i>Venue</i></span>.",
  "resources": [
    { "kind": "conf", "label": "Venue 2026" },
    { "kind": "link", "label": "DOI", "href": "https://doi.org/..." },
    { "kind": "pdf", "label": "Paper", "href": "/projects/.../paper.pdf" }
  ]
}
```

## プロジェクトを追加する

1. `_data/projects.json`へカード固有の情報を追加します。配列順が表示順です。
2. `publication_id`で`_data/publications.json`の論文を参照します。カードのタイトルと著者は参照先から自動取得されます。
3. `thumbnail_dimensions`へサムネイル画像の実寸を`[幅, 高さ]`で記録します。画像読込前のレイアウトずれを防ぐために使われます。
4. 詳細ページが必要なら`_templates/project-page.html`を`projects/<slug>/index.html`へコピーし、front matterと本文を更新します。
5. サムネイルなどの素材を同じプロジェクトディレクトリへ配置します。
6. ビルドとサイト検証を実行します。

サイト内URLは`/`から始めます。外部URLはカードから自動的に新しいタブで開きます。

```json
{
  "id": "project-example",
  "publication_id": "paper-unique-id",
  "url": "/projects/example/",
  "thumbnail": "/projects/example/images/thumbnail.png",
  "thumbnail_dimensions": [852, 517],
  "image_opacity": 1,
  "venue_label": "Venue 2026"
}
```

## メディアと表示速度

- 画像は、想定される最大表示幅の約2倍を目安にします。高DPI表示を考慮し、単にファイル容量が大きいだけで解像度を一律に下げる必要はありません。
- トップページのプロジェクト画像は自動的に遅延読込されます。
- YouTubeなどの埋め込みには`loading="lazy"`を付けます。
- ローカル動画は`video[data-lazy-video]`と`source[data-src]`を使います。共通スクリプトが表示領域へ近づいた時点で読み込み、従来どおり自動再生します。
- 動画にも実寸の`width`・`height`と`style="width: 100%; height: auto;"`を指定し、読込前から正しい縦横比の表示領域を確保します。
- 自動再生動画を追加する場合は、`preload="none"`も指定します。`prefers-reduced-motion`を有効にした閲覧者には、自動再生の代わりに操作ボタンが表示されます。

## アクセシビリティを保つ

- 各ページの本文は `main#main-content[tabindex="-1"]` に置きます。共通ナビゲーションのスキップリンクから本文へ移動できます。
- ページタイトルはh1、セクションはh2、配下の小見出しはh3を使います。従来のdivを見出しに変える場合は `semantic-heading` と既存の見た目用クラスを併用し、余白や書体を比較します。
- 情報を伝える図・写真には英語のaltを付けます。本文と重複するサムネイルや装飾は `alt=""` とし、画像だけのリンクには行き先を示す名前を付けます。CSS背景画像は装飾のまま扱います。
- 動画には短い `aria-label`、英語の説明を参照する `aria-describedby`、`tabindex="0"` を指定します。説明は動画の外側に `<p id="…" class="visually-hidden" lang="en">…</p>` として置きます。同一ページのIDは重複させません。
- 共通スクリプトは動画にフォーカス・ポインターが来た時に標準コントロールを表示します。Spaceで再生・停止でき、手動停止はスクロールして戻っても維持されます。動画をリンクで囲まないでください。
- YouTubeにはプロジェクト名と動画の種類を含むtitle、内容を短く説明するテキストを指定します。概要は全文の文字起こし・字幕・音声解説の代わりにはなりません。
- 日本語ページはfront matterの `lang: ja`、英語ページ内の日本語部分は `lang="ja"` とします。
- `css/accessibility.css` は既存のページCSSより先に読み込みます。通常時の配色・コントラストは変えず、スキップリンクとフォーカス枠はキーボード操作時に表示します。
