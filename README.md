# Lanki 遊戲教室

這是 `lanki20` 的 GitHub Pages 教育遊戲與互動工具總目錄，部署網址為：

<https://lanki20.github.io/lankigame/>

## 新增遊戲

只需編輯 `games.js`，在 `window.GAMES` 陣列加入一筆資料：

```js
{
  id: "game-id",
  title: "顯示名稱",
  subtitle: "一句短標",
  description: "遊戲說明",
  category: "數學",
  icon: "🎲",
  tone: "mint",
  url: "https://lanki20.github.io/repo-name/index.html",
  repo: "repo-name",
  tags: ["搜尋標籤"]
}
```

`tone` 可使用 `mint`、`coral`、`gold`、`lavender`。儲存並推送到 `main` 後，首頁卡片會自動更新。

## 遊戲網址慣例

- 各遊戲可繼續放在自己的 repo，首頁直接連到既有 GitHub Pages 網址。
- 要集中放在本 repo 時，建議使用 `games/<name>/index.html`，卡片網址填 `./games/<name>/index.html`。
- 既有的 `ratio-mix-lanki/` 已原樣保留。

首頁使用純 HTML、CSS 與 JavaScript，不需要建置工具或第三方套件。

