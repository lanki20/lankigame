(() => {
  const games = Array.isArray(window.GAMES) ? window.GAMES : [];
  const grid = document.querySelector("#gameGrid");
  const search = document.querySelector("#searchInput");
  const filters = document.querySelector("#filters");
  const count = document.querySelector("#gameCount");
  const empty = document.querySelector("#emptyState");
  let activeCategory = "全部";

  const categories = ["全部", ...new Set(games.map((game) => game.category))];

  const normalize = (value) => String(value || "").toLocaleLowerCase("zh-Hant");

  function createCard(game, index) {
    const article = document.createElement("article");
    article.className = `game-card tone-${game.tone || "mint"}`;
    article.style.setProperty("--delay", `${Math.min(index * 45, 360)}ms`);
    article.innerHTML = `
      <div class="card-visual" aria-hidden="true">
        <span class="card-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="card-icon">${game.icon}</span>
        <span class="card-dot"></span>
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${game.category}</span><span>${game.subtitle}</span></div>
        <h3>${game.title}</h3>
        <p>${game.description}</p>
        <a class="play-link" href="${game.url}" aria-label="開始玩${game.title}">
          開始玩 <span aria-hidden="true">↗</span>
        </a>
      </div>`;
    return article;
  }

  function render() {
    const term = normalize(search.value.trim());
    const visible = games.filter((game) => {
      const inCategory = activeCategory === "全部" || game.category === activeCategory;
      const haystack = normalize([game.title, game.subtitle, game.description, game.category, ...(game.tags || [])].join(" "));
      return inCategory && (!term || haystack.includes(term));
    });

    grid.replaceChildren(...visible.map(createCard));
    count.textContent = `${visible.length} 個遊戲`;
    empty.hidden = visible.length > 0;
  }

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.textContent = category;
    button.setAttribute("aria-pressed", category === activeCategory ? "true" : "false");
    button.addEventListener("click", () => {
      activeCategory = category;
      filters.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      render();
    });
    filters.append(button);
  });

  search.addEventListener("input", render);
  window.addEventListener("online", updateNetworkState);
  window.addEventListener("offline", updateNetworkState);

  function updateNetworkState() {
    const state = document.querySelector("#onlineState");
    state.textContent = navigator.onLine ? "可離線瀏覽目錄" : "目前離線 · 目錄仍可用";
  }

  render();
  updateNetworkState();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();

