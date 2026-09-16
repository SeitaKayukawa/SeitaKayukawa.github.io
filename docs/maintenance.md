# Website maintenance guide

このサイトはGitHub PagesのJekyllビルドを利用しています。公開URLと見た目を維持しながら、共通部品と一覧データを一元管理しています。

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
```

検証では、全HTMLのローカルリンクとページ内アンカー、重複ID、画像の代替テキスト、iframeのタイトル、一覧データの必須項目などを確認します。同じ検証はPull Requestでも自動実行されます。

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
- 自動再生動画を追加する場合は、`preload="none"`も指定します。`prefers-reduced-motion`を有効にした閲覧者には、自動再生の代わりに操作ボタンが表示されます。
