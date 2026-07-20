(() => {
  "use strict";

  let data = Array.isArray(window.REGISTRY_DATA) ? window.REGISTRY_DATA : [];
  const pageSize = 10;
  const state = { query: "", country: "", category: "", sort: "country", page: 1 };

  const flags = {
    "Poland": "🇵🇱", "Lithuania": "🇱🇹", "United Kingdom": "🇬🇧",
    "Switzerland": "🇨🇭", "Canada": "🇨🇦", "St. Vincent and the Grenadines": "🇻🇨",
    "France": "🇫🇷", "Costa Rica": "🇨🇷", "Australia": "🇦🇺", "Dominica": "🇩🇲", "Spain": "🇪🇸"
  };

  const countryNames = {
    "Poland": "Польша", "Lithuania": "Литва", "United Kingdom": "Великобритания",
    "Switzerland": "Швейцария", "Canada": "Канада", "St. Vincent and the Grenadines": "Сент-Винсент и Гренадины",
    "France": "Франция", "Costa Rica": "Коста-Рика", "Australia": "Австралия", "Dominica": "Доминика", "Spain": "Испания"
  };

  const categoryMeta = {
    "Официальные реестры": { color: "#2d8065" },
    "Регуляторы и лицензии": { color: "#5182c4" },
    "Санкции и предупреждения": { color: "#cb675b" },
    "Суды и неплатёжеспособность": { color: "#8c71bd" },
    "Данные и аналитика": { color: "#e0a443" },
    "Другие источники": { color: "#8c9692" }
  };

  const el = id => document.getElementById(id);
  const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  function categoryFor(item) {
    const text = (item["Source type"] + " " + item["Area of check"]).toLowerCase();
    if (/sanction|watch list|warning|alert|enforcement|non-compliance|non-compliant|penalt/.test(text)) return "Санкции и предупреждения";
    if (/court|insolvency|bankruptcy|judgment|litigation|ombudsman|complaint|security interest/.test(text)) return "Суды и неплатёжеспособность";
    if (/regulatory|licence|license|authorisation|authorization|supervision|aml registration|sro/.test(text)) return "Регуляторы и лицензии";
    if (/commercial|paid|statistical|database|open data|directory|announcements/.test(text)) return "Данные и аналитика";
    if (/register|public registry|official public|e-filing/.test(text)) return "Официальные реестры";
    return "Другие источники";
  }

  const requiredHeaders = ["Country", "Area of check", "Source type", "Register / Portal", "Authority", "What to verify", "Search by", "Link", "Notes"];
  const unique = values => [...new Set(values)].sort((a, b) => a.localeCompare(b, "ru"));

  let countries = [];
  let categories = [];

  function prepareData(rows) {
    return rows
      .map(row => {
        const item = {};
        requiredHeaders.forEach(header => { item[header] = String(row[header] ?? "").trim(); });
        return item;
      })
      .filter(item => requiredHeaders.some(header => item[header]));
  }

  function refreshDerivedData() {
    data = prepareData(data);
    data.forEach((item, index) => {
      item._id = index;
      item._category = categoryFor(item);
      item._search = requiredHeaders.map(header => item[header]).join(" ").toLocaleLowerCase("ru");
    });
    countries = unique(data.map(item => item.Country).filter(Boolean));
    categories = Object.keys(categoryMeta).filter(category => data.some(item => item._category === category));
  }

  function setDataStatus(message, isError) {
    const status = el("dataStatus");
    status.innerHTML = '<span class="pulse"></span> ' + escapeHtml(message);
    status.title = message;
    status.classList.toggle("data-status-error", Boolean(isError));
  }

  function updateHeroCounts() {
    el("heroCountryCount").textContent = countries.length + " " + plural(countries.length, ["страна", "страны", "стран"]);
    el("heroSourceCount").textContent = data.length + " " + plural(data.length, ["источник", "источника", "источников"]);
  }
  function localCountry(country) { return countryNames[country] || country; }
  function plural(number, forms) {
    const n10 = number % 10, n100 = number % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
    return forms[2];
  }

  function fillFilters() {
    el("countryFilter").innerHTML = '<option value="">Все страны</option>';
    el("categoryFilter").innerHTML = '<option value="">Все категории</option>';
    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = (flags[country] || "🌐") + " " + localCountry(country);
      el("countryFilter").append(option);
    });
    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      el("categoryFilter").append(option);
    });
  }

  function filteredData() {
    const query = state.query.trim().toLocaleLowerCase("ru");
    let result = data.filter(item =>
      (!query || item._search.includes(query)) &&
      (!state.country || item.Country === state.country) &&
      (!state.category || item._category === state.category)
    );

    result.sort((a, b) => {
      if (state.sort === "name") return a["Register / Portal"].localeCompare(b["Register / Portal"], "ru");
      if (state.sort === "category") return a._category.localeCompare(b._category, "ru") || a.Country.localeCompare(b.Country, "en");
      return a.Country.localeCompare(b.Country, "en") || a["Register / Portal"].localeCompare(b["Register / Portal"], "en");
    });
    return result;
  }

  function countBy(items, keyFn) {
    return items.reduce((acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function renderMetrics(items) {
    const countryCount = new Set(items.map(item => item.Country)).size;
    const areaCount = new Set(items.map(item => item["Area of check"])).size;
    const linked = items.filter(item => /^https?:\/\//i.test(item.Link)).length;
    el("metricSources").textContent = items.length;
    el("metricCountries").textContent = countryCount;
    el("metricAreas").textContent = areaCount;
    el("metricCoverage").textContent = items.length ? Math.round(linked / items.length * 100) + "%" : "—";
    el("metricSourcesHint").textContent = items.length === data.length ? "в полном каталоге" : "после фильтрации";
  }

  function renderActiveFilters() {
    const target = el("activeFilters");
    target.innerHTML = "";
    const chips = [];
    if (state.query) chips.push("Поиск: " + state.query);
    if (state.country) chips.push((flags[state.country] || "") + " " + localCountry(state.country));
    if (state.category) chips.push(state.category);
    chips.forEach(text => {
      const chip = document.createElement("span");
      chip.className = "filter-chip";
      chip.textContent = text;
      target.append(chip);
    });
  }

  function renderCountryBars(items) {
    const counts = countBy(items, item => item.Country);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const max = Math.max(1, ...entries.map(entry => entry[1]));
    el("countryCountPill").textContent = entries.length + " " + plural(entries.length, ["страна", "страны", "стран"]);
    el("countryBars").innerHTML = entries.map(([country, count]) =>
      '<button type="button" class="country-row" data-country="' + escapeHtml(country) + '" title="Показать источники: ' + escapeHtml(localCountry(country)) + '">' +
        '<span class="country-name"><span class="flag">' + (flags[country] || "🌐") + '</span><span>' + escapeHtml(localCountry(country)) + '</span></span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + (count / max * 100).toFixed(1) + '%"></span></span>' +
        '<span class="bar-value">' + count + '</span>' +
      '</button>'
    ).join("");
  }

  function renderDonut(items) {
    const counts = countBy(items, item => item._category);
    const entries = categories.map(category => [category, counts[category] || 0]).filter(entry => entry[1] > 0);
    const total = Math.max(1, items.length);
    let angle = 0;
    const stops = entries.map(([category, count]) => {
      const start = angle;
      angle += count / total * 360;
      return categoryMeta[category].color + " " + start.toFixed(1) + "deg " + angle.toFixed(1) + "deg";
    });
    el("categoryDonut").style.background = stops.length ? "conic-gradient(" + stops.join(",") + ")" : "#e6e4de";
    el("donutTotal").textContent = items.length;
    el("categoryLegend").innerHTML = entries.map(([category, count]) =>
      '<button type="button" class="legend-item text-button" data-category="' + escapeHtml(category) + '">' +
        '<span class="legend-dot" style="background:' + categoryMeta[category].color + '"></span>' +
        '<span class="legend-label">' + escapeHtml(category) + '</span>' +
        '<span class="legend-value">' + count + '</span>' +
      '</button>'
    ).join("");
  }

  function renderTable(items) {
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * pageSize;
    const visible = items.slice(start, start + pageSize);
    el("resultCount").textContent = items.length;
    el("registryTable").innerHTML = visible.map(item => {
      const safeUrl = /^https?:\/\//i.test(item.Link) ? item.Link.trim() : "#";
      return '<tr>' +
        '<td><span class="country-cell"><span class="flag">' + (flags[item.Country] || "🌐") + '</span>' + escapeHtml(localCountry(item.Country)) + '</span></td>' +
        '<td><span class="registry-name">' + escapeHtml(item["Register / Portal"]) + '</span></td>' +
        '<td class="muted-cell">' + escapeHtml(item["Area of check"]) + '</td>' +
        '<td class="muted-cell">' + escapeHtml(item.Authority) + '</td>' +
        '<td><span class="category-tag">' + escapeHtml(item._category) + '</span></td>' +
        '<td><span class="row-actions">' +
          '<button class="icon-button detail-button" type="button" data-id="' + item._id + '" title="Подробнее" aria-label="Подробнее о ' + escapeHtml(item["Register / Portal"]) + '">•••</button>' +
          '<a class="icon-button" href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer" title="Открыть источник" aria-label="Открыть источник в новой вкладке">↗</a>' +
        '</span></td>' +
      '</tr>';
    }).join("");
    el("emptyState").hidden = items.length !== 0;
    el("registryTable").hidden = items.length === 0;
    renderPagination(pages);
  }

  function renderPagination(pages) {
    const target = el("pagination");
    if (pages <= 1) { target.innerHTML = ""; return; }
    let buttons = '<button class="page-button" data-page="' + (state.page - 1) + '" ' + (state.page === 1 ? "disabled" : "") + ' aria-label="Предыдущая страница">←</button>';
    for (let page = 1; page <= pages; page++) {
      if (pages > 7 && page > 2 && page < pages - 1 && Math.abs(page - state.page) > 1) {
        if (page === 3 || page === pages - 2) buttons += '<span class="page-button" aria-hidden="true">…</span>';
        continue;
      }
      buttons += '<button class="page-button ' + (page === state.page ? "active" : "") + '" data-page="' + page + '" aria-label="Страница ' + page + '">' + page + '</button>';
    }
    buttons += '<button class="page-button" data-page="' + (state.page + 1) + '" ' + (state.page === pages ? "disabled" : "") + ' aria-label="Следующая страница">→</button>';
    target.innerHTML = buttons;
  }

  function render() {
    const items = filteredData();
    renderMetrics(items);
    renderActiveFilters();
    renderCountryBars(items);
    renderDonut(items);
    renderTable(items);
    updateHeroCounts();
  }

  function resetFilters() {
    Object.assign(state, { query: "", country: "", category: "", page: 1 });
    el("searchInput").value = "";
    el("countryFilter").value = "";
    el("categoryFilter").value = "";
    render();
  }

  function showDetails(id) {
    const item = data.find(row => row._id === Number(id));
    if (!item) return;
    const safeUrl = /^https?:\/\//i.test(item.Link) ? item.Link.trim() : "#";
    el("dialogContent").innerHTML =
      '<div class="dialog-body">' +
        '<span class="dialog-country">' + (flags[item.Country] || "🌐") + " " + escapeHtml(localCountry(item.Country)) + " · " + escapeHtml(item._category) + '</span>' +
        '<h2>' + escapeHtml(item["Register / Portal"]) + '</h2>' +
        '<p class="dialog-authority">' + escapeHtml(item.Authority) + '</p>' +
        '<div class="dialog-grid">' +
          '<div class="detail-block"><span>Направление проверки</span><p>' + escapeHtml(item["Area of check"]) + '</p></div>' +
          '<div class="detail-block"><span>Тип источника</span><p>' + escapeHtml(item["Source type"]) + '</p></div>' +
          '<div class="detail-block full"><span>Что проверять</span><p>' + escapeHtml(item["What to verify"]) + '</p></div>' +
          '<div class="detail-block"><span>Параметры поиска</span><p>' + escapeHtml(item["Search by"]) + '</p></div>' +
          '<div class="detail-block"><span>Примечание</span><p>' + escapeHtml(item.Notes) + '</p></div>' +
        '</div>' +
        '<a class="dialog-link" href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer">Перейти к источнику <span>↗</span></a>' +
      '</div>';
    el("detailsDialog").showModal();
  }

  function exportCsv() {
    const items = filteredData();
    const headers = ["Country", "Area of check", "Source type", "Register / Portal", "Authority", "What to verify", "Search by", "Link", "Notes"];
    const quote = value => '"' + String(value || "").replace(/"/g, '""') + '"';
    const csv = "\uFEFF" + [headers.map(quote).join(";"), ...items.map(item => headers.map(header => quote(item[header])).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "registry-sources-filtered.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Экспортировано: " + items.length + " строк");
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    el("toast").textContent = message;
    el("toast").classList.add("show");
    toastTimer = setTimeout(() => el("toast").classList.remove("show"), 2800);
  }

  function refreshPage() {
    setDataStatus("Проверяем опубликованную версию…");
    window.location.reload();
  }

  el("searchInput").addEventListener("input", event => { state.query = event.target.value; state.page = 1; render(); });
  el("countryFilter").addEventListener("change", event => { state.country = event.target.value; state.page = 1; render(); });
  el("categoryFilter").addEventListener("change", event => { state.category = event.target.value; state.page = 1; render(); });
  el("sortFilter").addEventListener("change", event => { state.sort = event.target.value; state.page = 1; render(); });
  el("resetButton").addEventListener("click", resetFilters);
  el("emptyResetButton").addEventListener("click", resetFilters);
  el("exportButton").addEventListener("click", exportCsv);
  el("refreshButton").addEventListener("click", refreshPage);
  el("dialogClose").addEventListener("click", () => el("detailsDialog").close());
  el("detailsDialog").addEventListener("click", event => { if (event.target === el("detailsDialog")) el("detailsDialog").close(); });

  document.addEventListener("click", event => {
    const detail = event.target.closest(".detail-button");
    if (detail) showDetails(detail.dataset.id);
    const country = event.target.closest("[data-country]");
    if (country) {
      state.country = country.dataset.country;
      el("countryFilter").value = state.country;
      state.page = 1;
      render();
      el("registryTable").closest(".catalog").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const category = event.target.closest("[data-category]");
    if (category) {
      state.category = category.dataset.category;
      el("categoryFilter").value = state.category;
      state.page = 1;
      render();
    }
    const page = event.target.closest("[data-page]");
    if (page && !page.disabled) {
      state.page = Number(page.dataset.page);
      render();
      el("registryTable").closest(".catalog").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      el("searchInput").focus();
    }
  });

  refreshDerivedData();
  fillFilters();
  render();
  const updatedAt = window.REGISTRY_DATA_UPDATED_AT;
  setDataStatus(updatedAt ? "Данные синхронизированы: " + updatedAt : "Сохранённая версия данных", !updatedAt);
})();

