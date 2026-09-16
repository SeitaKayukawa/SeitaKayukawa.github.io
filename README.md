# Seita Kayukawa's website

GitHub Pages のJekyllビルドを利用した個人Webサイトです。公開URLと見た目を維持しつつ、共通部分と一覧データを一元管理しています。

## ローカル確認

Ruby 3.3 を用意し、初回だけ依存関係をインストールします。

```sh
bundle install
```

開発サーバーは次のコマンドで起動します。

```sh
bundle exec jekyll serve
```

`http://127.0.0.1:4000/` で確認できます。公開前の一括検証は次の2コマンドです。

```sh
bundle exec jekyll build --trace --strict_front_matter
node scripts/check-site.mjs
```

検証では、全HTMLのローカルリンクとページ内アンカー、重複ID、iframeのタイトル、データの必須項目などを確認します。同じ検証はPull Requestでも自動実行されます。

## ファイル構成

- `_includes/`: head、ナビゲーション、フッター、プロジェクトカード、論文表示などの共通部品
- `_data/projects.json`: トップページの「Research Projects」19件
- `_data/publications.json`: 論文一覧32件（カテゴリ別）
- `_data/resource_types.json`: DOI、Paper、BibTeXなどのラベル表示設定
- `_layouts/bibtex.html`: BibTeXページの共通レイアウト
- `_templates/project-page.html`: 新しいプロジェクト詳細ページの雛形
- `projects/`: 各プロジェクト固有の本文と素材
- `scripts/check-site.mjs`: ビルド後のサイト検証

## 論文を追加する

1. `_data/publications.json` の該当カテゴリへ1レコード追加します。
   - `full`: Journal / Conference Full Paper
   - `selected`: 選択掲載するShort Paper / Demo / Poster
   - `other_international`: その他の国際発表
   - `other_domestic`: 国内発表
2. `citation_html` に引用表記を、`resources` にラベルとリンクを記述します。`authors`、`title`、`year`、`venue` は `citation_html` と一致しているか自動検証されます。
3. PDFやBibTeXを掲載する場合は `projects/` 以下へ配置します。
4. 上記のビルドと検証を実行します。

最小のレコード例です。`kind` は `conf`、`projectpage`、`link`、`slide`、`pdf`、`bibtex`、`award` から選べます。

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

1. `_data/projects.json` にカード固有の情報を追加します。`publication_id` で `_data/publications.json` の論文を参照し、配列順が表示順です。
2. 詳細ページが必要なら `_templates/project-page.html` を `projects/<slug>/index.html` へコピーし、front matterと本文を更新します。
3. サムネイルなどの素材を同じプロジェクトディレクトリへ配置します。
4. 論文も掲載する場合は `_data/publications.json` に対応するレコードを追加します。

カードのタイトルと著者は参照先の論文から自動取得されます。外部URLは自動的に新しいタブで開き、サイト内URLは `/` から始めます。

```json
{
  "id": "project-example",
  "publication_id": "paper-unique-id",
  "url": "/projects/example/",
  "thumbnail": "/projects/example/images/thumbnail.png",
  "image_opacity": 1,
  "venue_label": "Venue 2026"
}
```

共通ナビゲーションやheadを各ページへコピーする必要はありません。サイト全体の変更は `_includes/` を編集してください。
