const API_ROOT = "https://www.dnd5eapi.co";
const API_BASE = "/api/2014/";

/* had to use a LOT of searching and overview for this.... */

const titleEl = document.getElementById("view-title");
const backBtn = document.getElementById("btn-back");
const topBtn = document.getElementById("btn-top");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const contentEl = document.getElementById("db-content");
const statusEl = document.getElementById("db-status");
const viewEl = document.getElementById("db-view");

let currentRoute = readRoute();
let currentList = [];
let onListView = false;
let renderId = 0;


/* ---------------- GETTING DATA ---------------- */

const cache = new Map();

function getJSON(path) {
  if (!cache.has(path)) {
    const request = fetch(API_ROOT + path).then((response) => {
      if (!response.ok) throw new Error("the API answered with status " + response.status);
      return response.json();
    });
    request.catch(() => cache.delete(path));
    cache.set(path, request);
  }
  return cache.get(path);
}


/* ---------------- ROUTES (the part after #) ---------------- */

function readRoute() {
  let raw = location.hash.slice(1);
  try { raw = decodeURIComponent(raw); } catch { } //IM NOT SURE OF THIS PART!
  raw = raw.replace(/^\/+|\/+$/g, "");

  if (raw === "") return { type: "home" };
  if (raw.startsWith("search/")) return { type: "search", query: raw.slice("search/".length) };
  return { type: "page", path: raw };
}

// "/api/2014/classes/bard" -> "#classes/bard"
function hrefFor(apiUrl) {
  return "#" + apiUrl.replace(/^\/api\/(2014\/)?/, "");
}

function parentHash(route) {
  if (route.type !== "page") return "#";
  const parts = route.path.split("/");
  parts.pop();
  return "#" + parts.join("/");
}

function depth() {
  return (history.state && history.state.depth) || 0;
}

history.replaceState({ depth: depth() }, "");
let lastDepth = depth();

window.addEventListener("hashchange", () => {
  if (!history.state || history.state.depth === undefined) {
    history.replaceState({ depth: lastDepth + 1 }, ""); // a new page was opened
  }
  lastDepth = depth();
  render(true);
});


/* ---------------- SHOWING A VIEW ---------------- */

async function render(moveFocus = false) {
  const id = ++renderId;
  const route = readRoute();
  currentRoute = route;
  currentList = [];
  onListView = false;

  const onHome = route.type === "home";
  backBtn.hidden = onHome;
  topBtn.hidden = onHome;

  if (onHome) setTitle("D&Database");
  else if (route.type === "search") setTitle("Search");
  else setTitle(titleCase(route.path.split("/").pop()));

  viewEl.innerHTML = "";
  showStatus("Loading…");
  contentEl.scrollTop = 0;
  window.scrollTo(0, 0);

  try {
    if (onHome) await showHome(id);
    else if (route.type === "search") await showSearch(route.query, id);
    else await showPage(route.path, id);

    if (moveFocus && id === renderId) titleEl.focus({ preventScroll: true });
  } catch (error) {
    if (id !== renderId) return;
    showStatus(`Sorry, this part of the database could not be loaded (${error.message}).`, true);
  }
}

// HOME
async function showHome(id) {
  showSearchBar(true, "Enter keywords...");
  searchInput.value = "";

  const root = await getJSON(API_BASE.slice(0, -1));
  if (id !== renderId) return;

  const categories = Object.keys(root).sort().map((key) => ({
    name: titleCase(key),
    href: "#" + key,
  }));
  viewEl.innerHTML = tileGrid(categories);
  showStatus("");
}

// LIST or DETAIL
async function showPage(path, id) {
  const data = await getJSON(API_BASE + path);
  if (id !== renderId) return;

  const items = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : null;

  if (items) {
    const title = listTitle(path);
    setTitle(title);
    showSearchBar(true, `Search ${title.toLowerCase()}...`);
    searchInput.value = "";
    onListView = true;
    currentList = items
      .map((item) => ({ name: itemName(item), href: item.url ? hrefFor(item.url) : null }))
      .filter((item) => item.name);
    renderList();
  } else {
    setTitle(data.name || titleCase(path.split("/").pop()));
    showSearchBar(false);
    viewEl.innerHTML = renderDetail(data);
    showStatus("");
  }
}

function renderList() {
  const words = searchInput.value.trim().toLowerCase();
  const shown = currentList.filter((item) => item.name.toLowerCase().includes(words));

  viewEl.innerHTML = tileGrid(shown);
  if (shown.length) showStatus("");
  else if (words) showStatus(`Nothing here matches “${searchInput.value.trim()}”.`);
  else showStatus("This list is empty.");
}

// SEARCH
async function showSearch(query, id) {
  showSearchBar(true, "Enter keywords...");
  searchInput.value = query;

  const words = query.trim().toLowerCase();
  if (!words) {
    location.hash = "";
    return;
  }

  const root = await getJSON(API_BASE.slice(0, -1));
  const keys = Object.keys(root).sort();
  showStatus(`Searching ${keys.length} categories…`);

  const lists = await Promise.all(keys.map((key) =>
    getJSON(API_BASE + key)
      .then((data) => ({ key, items: data.results || [] }))
      .catch(() => ({ key, items: [] }))
  ));
  if (id !== renderId) return;

  const matches = [];
  for (const key of keys) {
    if (titleCase(key).toLowerCase().includes(words)) {
      matches.push({ name: titleCase(key), href: "#" + key, tag: "Category" });
    }
  }
  for (const { key, items } of lists) {
    for (const item of items) {
      if (item.name && item.url && item.name.toLowerCase().includes(words)) {
        matches.push({ name: item.name, href: hrefFor(item.url), tag: titleCase(key) });
      }
    }
  }

  const rank = (match) => {
    const name = match.name.toLowerCase();
    return name === words ? 0 : name.startsWith(words) ? 1 : 2;
  };
  matches.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  viewEl.innerHTML = tileGrid(matches);
  showStatus(matches.length
    ? `${matches.length} result${matches.length === 1 ? "" : "s"} for “${query.trim()}”`
    : `Nothing found for “${query.trim()}”. Try a different word.`);
}


/* ---------------- DETAIL PAGE (the cards) ---------------- */

const SKIP_KEYS = new Set(["index", "name", "url", "updated_at", "image"]);

const LABELS = {
  desc: "Description",
  higher_level: "At Higher Levels",
  proficiency_choices: "Proficiency Options",
  hit_die: "Hit Die",
  xp: "XP",
  dc: "DC",
  dc_type: "DC Type",
  dc_value: "DC",
  dc_success: "On a Success",
};

function renderDetail(data) {
  const found = newGroup();
  for (const [key, value] of Object.entries(data)) {
    if (!SKIP_KEYS.has(key)) addField(key, value, found);
  }

  const cards = [];
  if (data.image) {
    cards.push({
      kind: "image",
      body: `<img src="${esc(API_ROOT + data.image)}" alt="${esc(data.name || "")}" loading="lazy">`,
    });
  }
  if (found.facts.length) cards.push(listCard("Details", found.facts));
  cards.push(...found.desc, ...found.cards, ...found.text); // small cards before the wide ones

  if (!cards.length) return `<p class="db-status">There is nothing more to show for this entry.</p>`;
  return `<div class="db-cards">${cards.map(cardHtml).join("")}</div>`;
}

function newGroup() {
  return { facts: [], desc: [], cards: [], text: [] };
}

function addField(key, value, group) {
  if (value === null || value === undefined || value === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  const label = labelFor(key);

  if (key === "desc" || key === "higher_level") {
    group.desc.push(textCard(label, formatText(value)));
  } else if (isPrimitive(value)) {
    const shown = key === "challenge_rating" ? esc(challengeText(value)) : primitiveHtml(value);
    group.facts.push(fact(label, shown));
  } else if (isReference(value)) {
    group.facts.push(fact(label, refLink(value)));
  } else if (isChoice(value)) {
    group.cards.push(choiceCard(key, value));
  } else if (Array.isArray(value)) {
    addList(key, label, value, group);
  } else if (isNumberKeyed(value)) {
    group.cards.push(listCard(label, Object.entries(value).map(([level, amount]) => fact(`Level ${level}`, esc(amount)))));
  } else if (isSimpleObject(value)) {
    group.facts.push(fact(label, summarize(value)));
  } else {
    group.text.push(objectCard(label, value));
  }
}

function addList(key, label, list, group) {
  if (list.every(isChoice)) {
    list.forEach((choice) => group.cards.push(choiceCard(key, choice)));
  } else if (list.every(isPrimitive)) {
    const isLongText = list.some((item) => String(item).length > 80);
    if (isLongText) group.text.push(textCard(label, formatText(list)));
    else group.cards.push(listCard(label, list.map(primitiveHtml)));
  } else if (list.every(isReference)) {
    group.cards.push(listCard(label, list.map((ref) => refLink(ref))));
  } else if (list.every((item) => item && item.name && item.desc)) {
    group.text.push(textCard(label, namedBlocks(list)));
  } else {
    group.cards.push(listCard(label, list.map(summarize)));
  }
}

// A bigger object becomes one wide card with small headings inside
function objectCard(label, obj) {
  const inner = newGroup();
  for (const [key, value] of Object.entries(obj)) {
    if (!SKIP_KEYS.has(key)) addField(key, value, inner);
  }
  let body = inner.facts.length ? listHtml(inner.facts) : "";
  for (const card of [...inner.desc, ...inner.cards, ...inner.text]) {
    body += `<h3 class="db-subhead">${esc(card.title)}</h3>`;
    if (card.subtitle) body += `<p class="db-card-sub">${esc(card.subtitle)}</p>`;
    body += card.body;
  }
  return textCard(label, body);
}

// "Choose 3 from this list" objects
function choiceCard(key, choice) {
  const options = (choice.from && choice.from.options) || [];
  const desc = choice.desc || "";

  let prefix = "";
  const first = options[0] && options[0].item && options[0].item.name;
  const firstPrefix = first && first.includes(": ") ? first.split(": ")[0] : "";
  if (firstPrefix && options.every((option) =>
    option.option_type === "reference" && option.item.name.startsWith(firstPrefix + ": "))) {
    prefix = firstPrefix;
  }

  let title = labelFor(key);
  if (prefix) title = `${prefix} ${title}`;
  else if (key === "proficiency_choices" && /instrument/i.test(desc)) title = "Instrument Proficiency Options";
  else if (key === "proficiency_choices" && /tool/i.test(desc)) title = "Tool Proficiency Options";

  return {
    kind: "list",
    title,
    subtitle: desc || `Choose ${choice.choose}`,
    body: listHtml(optionsHtml(choice, prefix ? prefix + ": " : "")),
  };
}

function optionsHtml(choice, removeFromNames = "") {
  const from = choice.from || {};
  if (Array.isArray(from.options)) return from.options.map((option) => optionHtml(option, removeFromNames));
  if (from.equipment_category) return [`Any ${refLink(from.equipment_category)}`];
  if (from.resource_list_url) return [`<a href="${esc(hrefFor(from.resource_list_url))}">See the full list</a>`];
  return [];
}

function optionHtml(option, removeFromNames = "") {
  switch (option.option_type) {
    case "reference":
      return refLink(option.item, removeFromNames);
    case "counted_reference":
      return `${esc(option.count)} × ${refLink(option.of)}`;
    case "multiple":
      return (option.items || []).map((item) => optionHtml(item)).join(" + ");
    case "choice": {
      const inner = optionsHtml(option.choice);
      if (!inner.length) return esc(option.choice.desc || `Choose ${option.choice.choose}`);
      return option.choice.choose === 1 ? inner.join(" or ") : `Choose ${option.choice.choose}: ${inner.join(", ")}`;
    }
    case "string":
      return esc(option.string);
    case "ideal":
      return esc(option.desc);
    case "action":
      return esc(option.action_name + (option.count > 1 ? ` ×${option.count}` : ""));
    case "ability_bonus":
      return `${refLink(option.ability_score)} ${esc(signed(option.bonus))}`;
    default:
      return summarize(option);
  }
}

// Turns a small object into one short line
function summarize(item) {
  if (item === null || item === undefined) return "";
  if (isPrimitive(item)) return primitiveHtml(item);
  if (isReference(item)) return refLink(item);
  if (Array.isArray(item)) return item.map(summarize).join(", ");
  if (isChoice(item)) return esc(item.desc || `Choose ${item.choose}`);

  const o = item;
  const ref = Object.values(o).find(isReference);

  if (o.quantity !== undefined && o.unit) return esc(`${o.quantity} ${o.unit}`);
  if (o.quantity !== undefined && ref) return `${esc(o.quantity)} × ${refLink(ref)}`;
  if (o.proficiency && o.value !== undefined) return `${refLink(o.proficiency)} ${esc(signed(o.value))}`;
  if (o.bonus !== undefined && ref) return `${refLink(ref)} ${esc(signed(o.bonus))}`;
  if (o.minimum_score !== undefined && ref) return `${refLink(ref)} ${esc(o.minimum_score)} or higher`;
  if (o.damage_dice) return esc(o.damage_dice) + (o.damage_type ? " " + refLink(o.damage_type) : "");
  if (o.normal !== undefined && "long" in o) return esc(o.long ? `${o.normal}/${o.long} ft.` : `${o.normal} ft.`);
  if (o.base !== undefined && "dex_bonus" in o) {
    let text = String(o.base);
    if (o.dex_bonus) text += " + Dex modifier" + (o.max_bonus ? ` (max ${o.max_bonus})` : "");
    return esc(text);
  }
  if (o.size !== undefined && o.type) return esc(`${o.size}-foot ${o.type}`);
  if (o.value !== undefined && o.type) {
    const source = o.armor ? o.armor.map((armor) => refLink(armor)).join(", ") : esc(o.type);
    return `${esc(o.value)} (${source})`;
  }
  if (o.name) return o.url ? refLink(o) : esc(o.name);

  return Object.entries(o)
    .filter(([key, value]) => !SKIP_KEYS.has(key) && value !== null && value !== "" && !(Array.isArray(value) && !value.length))
    .map(([key, value]) => `${esc(labelFor(key))} ${summarize(value)}`)
    .join(", ");
}

// Lists of { name, desc }
function namedBlocks(list) {
  return list.map((item) => {
    const desc = Array.isArray(item.desc) ? item.desc : [item.desc];
    if (desc.length > 1) return `<h3 class="db-subhead">${esc(item.name)}</h3>${formatText(desc)}`;
    return `<p><strong><em>${esc(item.name)}.</em></strong> ${inline(desc[0])}</p>`;
  }).join("");
}


/* ---------------- SMALL HTML HELPERS ---------------- */

function tileGrid(items) {
  if (!items.length) return "";
  return `<ul class="db-grid">${items.map((item) => {
    const tag = item.tag ? `<span class="db-tile-tag">${esc(item.tag)}</span>` : "";
    return item.href
      ? `<li><a class="db-tile" href="${esc(item.href)}">${esc(item.name)}${tag}</a></li>`
      : `<li><span class="db-tile">${esc(item.name)}${tag}</span></li>`;
  }).join("")}</ul>`;
}

function listCard(title, items, subtitle = "") {
  return { kind: "list", title, subtitle, body: listHtml(items) };
}

function textCard(title, body) {
  return { kind: "text", title, body };
}

function cardHtml(card) {
  if (card.kind === "image") return `<section class="db-card db-card-image">${card.body}</section>`;
  return `
    <section class="db-card db-card-${card.kind}">
      <div class="db-card-head">
        <h2 class="db-card-title">${esc(card.title)}:</h2>
        ${card.subtitle ? `<p class="db-card-sub">${esc(card.subtitle)}</p>` : ""}
      </div>
      <div class="db-card-body">${card.body}</div>
    </section>`;
}

function listHtml(items) {
  return `<ul class="db-card-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function fact(label, valueHtml) {
  return `<span class="db-fact-label">${esc(label)}:</span> ${valueHtml}`;
}

function refLink(ref, removeFromName = "") {
  let name = ref.name;
  if (removeFromName && name.startsWith(removeFromName)) name = name.slice(removeFromName.length);
  return ref.url ? `<a href="${esc(hrefFor(ref.url))}">${esc(name)}</a>` : esc(name);
}

function primitiveHtml(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.startsWith("/api/")) return `<a href="${esc(hrefFor(value))}">See all</a>`;
  return esc(value);
}

function formatText(value) {
  const lines = (Array.isArray(value) ? value : [value])
    .flatMap((line) => String(line).split("\n"))
    .map((line) => line.trim());

  let html = "";
  let tableRows = [];
  let bullets = [];
  const flush = () => {
    if (tableRows.length) html += tableHtml(tableRows);
    if (bullets.length) html += `<ul>${bullets.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`;
    tableRows = [];
    bullets = [];
  };

  for (const line of lines) {
    if (line.startsWith("|")) {
      if (bullets.length) flush();
      tableRows.push(line);
    } else if (/^[-*•] /.test(line)) {
      if (tableRows.length) flush();
      bullets.push(line.slice(2));
    } else {
      flush();
      if (!line) continue;
      const heading = line.match(/^#{1,6}\s*(.+)$/);
      html += heading ? `<h3 class="db-subhead">${inline(heading[1])}</h3>` : `<p>${inline(line)}</p>`;
    }
  }
  flush();
  return html;
}

function tableHtml(rows) {
  const cells = rows
    .filter((row) => !/^\|?[\s:|-]+\|?$/.test(row))
    .map((row) => row.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
  if (!cells.length) return "";
  const [head, ...body] = cells;
  return `<div class="db-table-wrap"><table>
    <thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead>
    <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

function inline(text) {
  return esc(text)
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// Makes sure API doesn't break the page
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}


/* ---------------- SMALL TEXT HELPERS ---------------- */

function setTitle(text) {
  titleEl.textContent = text;
  titleEl.dataset.text = text;
  document.title = `${text} · D&D: Visionary`;
}

function showSearchBar(visible, placeholder = "Enter keywords...") {
  searchForm.hidden = !visible;
  searchInput.placeholder = placeholder;
}

function showStatus(message, withRetry = false) {
  statusEl.innerHTML = esc(message) +
    (withRetry ? ` <button type="button" class="db-tile db-retry" data-retry>Try again</button>` : "");
  statusEl.hidden = !message;
}

function titleCase(text) {
  return String(text).split(/[-_]/).filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function labelFor(key) {
  return LABELS[key] || titleCase(key);
}

function listTitle(path) {
  const parts = path.split("/");
  if (parts.length === 1) return titleCase(parts[0]);
  return `${titleCase(parts[parts.length - 2])} ${titleCase(parts[parts.length - 1])}`;
}

function itemName(item) {
  if (item.name) return item.name;
  if (item.level !== undefined) return `Level ${item.level}`;
  return item.index ? titleCase(item.index) : "";
}

function signed(number) {
  return number >= 0 ? `+${number}` : String(number);
}

function challengeText(cr) {
  return { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" }[cr] || String(cr);
}

function isPrimitive(value) {
  return value === null || typeof value !== "object";
}

function isReference(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && typeof value.url === "string" && typeof value.name === "string";
}

function isChoice(value) {
  return value && typeof value === "object" && !Array.isArray(value) && "choose" in value && "from" in value;
}

function isNumberKeyed(value) {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
}

function isSimpleObject(value) {
  return Object.values(value).every((v) => isPrimitive(v) || isReference(v));
}


/* ---------------- BUTTONS and SEARCH ---------------- */

backBtn.addEventListener("click", () => {
  if (depth() > 0) history.back();
  else location.hash = parentHash(currentRoute);
});

topBtn.addEventListener("click", () => {
  contentEl.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
});

searchInput.addEventListener("input", () => {
  if (onListView) renderList();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (onListView) {
    renderList();
    return;
  }
  const words = searchInput.value.trim();
  location.hash = words ? "search/" + encodeURIComponent(words) : "";
});

statusEl.addEventListener("click", (event) => {
  if (event.target.closest("[data-retry]")) render();
});

render();