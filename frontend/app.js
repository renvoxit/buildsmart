const API = location.origin;
const CLIENT_TOKEN_KEY = "buildsmart_client_token";
const DEMO_POSTS = {
  vorschlag: [
    {
      id: "demo-v1",
      demo: true,
      category: "vorschlag",
      address: "Marktplatz 4",
      description: "Neue Fahrradständer neben dem Eingang würden den Platz ordentlicher machen und den Gehweg freihalten.",
      image_url: "./assets/building.jpg",
      votes: 18,
      status: "In Prüfung",
      comments: [
        { text: "Gute Idee, dort stehen oft Fahrräder direkt am Schaufenster.", created_at: "Demo" },
        { text: "Vielleicht mit zwei zusätzlichen Bäumen kombinieren.", created_at: "Demo" }
      ]
    },
    {
      id: "demo-v2",
      demo: true,
      category: "vorschlag",
      address: "Schulstraße 12",
      description: "Mehr Sitzplätze und ein kleiner Schattenbereich würden den Weg zur Schule angenehmer machen.",
      image_url: "./assets/box-sketch.jpg",
      votes: 11,
      status: "Neu",
      comments: [
        { text: "Das wäre besonders im Sommer hilfreich.", created_at: "Demo" }
      ]
    }
  ],
  anmerkung: [
    {
      id: "demo-a1",
      demo: true,
      category: "anmerkung",
      address: "Parkweg 8",
      description: "Die Beleuchtung am Weg ist abends sehr schwach. Bitte prüfen, ob die Laterne repariert werden kann.",
      image_url: "./assets/hero-city.png",
      votes: 24,
      status: "Geplant",
      comments: [
        { text: "Ich laufe dort jeden Abend vorbei, das Problem besteht seit Wochen.", created_at: "Demo" }
      ]
    },
    {
      id: "demo-a2",
      demo: true,
      category: "anmerkung",
      address: "Bahnhofstraße 21",
      description: "Der Gehweg ist an einer Stelle beschädigt und für Kinderwagen schwer zu passieren.",
      image_url: "./assets/building.jpg",
      votes: 15,
      status: "Neu",
      comments: [
        { text: "Bitte auch für Rollstühle prüfen.", created_at: "Demo" }
      ]
    }
  ]
};

function getClientToken(){
  let token = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (!token){
    token = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(CLIENT_TOKEN_KEY, token);
  }
  return token;
}

async function fetchJSON(url, opts = {}) {
  try {
    const headers = new Headers(opts.headers || {});
    headers.set("X-Client-Token", getClientToken());
    const r = await fetch(url, { ...opts, headers });
    if (!r.ok) {
      let message = await r.text();
      try {
        message = JSON.parse(message).error || message;
      } catch {}
      throw new Error(message);
    }
    return await r.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
}

function openModal(id){
  document.getElementById(id).style.display = "flex";
}
function closeModal(id){
  document.getElementById(id).style.display = "none";
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatText(s){
  const escaped = escapeHtml(s);
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a class="inlineLink" href="$1" target="_blank" rel="noopener">$1</a>'
  );
  return linked.replace(/\n/g, "<br>");
}

document.addEventListener("click", async (e) => {
  const dpost = e.target.closest("[data-delete-post]");
if (dpost){
  const id = dpost.getAttribute("data-delete-post");
  if (!confirm("Post wirklich löschen?")) return;

  try{
    await fetchJSON(`${API}/api/posts/${id}`, { method:"DELETE" });
    dpost.closest(".postCard")?.remove();
  }catch(err){
    alert("Du kannst nur eigene Posts löschen.");
  }

  return;
}
const dcom = e.target.closest("[data-delete-comment]");
if (dcom){
  const id = dcom.getAttribute("data-delete-comment");
  if (!confirm("Kommentar löschen?")) return;

  try{
    await fetchJSON(`${API}/api/comments/${id}`, { method:"DELETE" });
    dcom.closest(".commentItem")?.remove();
  }catch(err){
    alert("Du kannst nur eigene Kommentare löschen.");
  }

  return;
}
  const btn = e.target.closest("[data-close]");
  if (btn) closeModal(btn.getAttribute("data-close"));
  if (e.target.classList.contains("modalBack")) e.target.style.display = "none";
});

const btnGo = document.getElementById("goToPosts");
if (btnGo){
  btnGo.addEventListener("click", () => openModal("shareModal"));
}

const shareOpenV = document.getElementById("shareOpenV");
const shareOpenA = document.getElementById("shareOpenA");

if (shareOpenV){
  shareOpenV.addEventListener("click", () => {
    closeModal("shareModal");
    openModal("modalV");
  });
}
if (shareOpenA){
  shareOpenA.addEventListener("click", () => {
    closeModal("shareModal");
    openModal("modalA");
  });
}

function postItemHTML(p){
  const img = p.image_path
  ? `${API}/uploads/${encodeURIComponent(p.image_path)}`
  : p.image_url;
  const label = p.category === "vorschlag" ? "Idee" : "Anmerkung";
  const status = p.status ? `<span class="statusPill">${escapeHtml(p.status)}</span>` : "";
  const demoLabel = p.demo ? `<span class="demoPill">Beispiel</span>` : "";
  const deleteButton = p.can_delete
    ? `<button class="voteBtn dangerBtn" data-delete-post="${p.id}" title="Löschen">Delete</button>`
    : "";
  const voteButton = p.demo
    ? `<button class="voteBtn" type="button" title="Demo-Beitrag">Like</button>`
    : `<button class="voteBtn" data-vote="${p.id}" title="Vote">Like</button>`;
  const media = img
    ? `<div class="postMedia"><img class="postImg" src="${img}" alt="Beitragsbild"/></div>`
    : "";
  const comments = p.demo
    ? (p.comments || []).map(c => `
      <div class="commentItem">
        <div class="commentText">${formatText(c.text)}</div>
        <div class="commentMeta"><span>${escapeHtml(c.created_at)}</span></div>
      </div>
    `).join("")
    : "";
  const commentForm = p.demo ? "" : `
        <form class="commentForm" data-comment-form="${p.id}">
          <textarea class="input" name="text" required
            placeholder="Kommentar schreiben (ohne E-Mail)…"></textarea>

          <div class="commentRow">
            <input class="input" type="file" name="file"/>
            <button class="btn" type="submit">Senden</button>
          </div>

          <div class="status" id="cstatus-${p.id}"></div>
        </form>
  `;
  return `
    <div class="postCard">
      <div class="postTop">
        <div class="postMeta">
          <div class="postAddress">${escapeHtml(p.address)}</div>
          <div class="postType">${escapeHtml(label)} ${status} ${demoLabel}</div>
        </div>
        <div class="postVotes">
          ${voteButton}
          <span class="voteCount">${p.votes}</span>
        </div>
      </div>

      <div class="postBody">
        <div class="postText">${formatText(p.description)}</div>
        ${media}
      </div>

      <div class="postActions">
  <button class="commentToggle" data-toggle-comments="${p.id}">Kommentare</button>
  ${deleteButton}
</div>

      <div class="commentsBox" id="comments-${p.id}" style="display:none;">
        <div class="commentsList" id="commentsList-${p.id}">${comments}</div>
        ${commentForm}
      </div>
    </div>
  `;
}

async function loadLists(){
  const lv = document.getElementById("listVorschlag");
  const la = document.getElementById("listAnmerkung");
  if (!lv || !la) return;

  const v = await fetchJSON(`${API}/api/posts?category=vorschlag`);
  const a = await fetchJSON(`${API}/api/posts?category=anmerkung`);

  lv.innerHTML = v.length ? v.map(postItemHTML).join("") : DEMO_POSTS.vorschlag.map(postItemHTML).join("");
  la.innerHTML = a.length ? a.map(postItemHTML).join("") : DEMO_POSTS.anmerkung.map(postItemHTML).join("");
}

async function submitPost(formId, statusId, modalId){
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sende…";
    const fd = new FormData(form);
    try{
      await fetchJSON(`${API}/api/posts`, { method:"POST", body: fd });
      form.reset();
      status.textContent = "Gesendet.";
      closeModal(modalId);
      await loadLists();
    }catch(err){
      status.textContent = err.message;
    }
  });
}

submitPost("formV", "statusV", "modalV");
submitPost("formA", "statusA", "modalA");

document.addEventListener("click", async (e) => {
  const vbtn = e.target.closest("[data-vote]");
  if (vbtn){
    const id = vbtn.getAttribute("data-vote");
    try{
      await fetchJSON(`${API}/api/posts/${id}/vote`, { method:"POST" });
      await loadLists();
    }catch(err){
      alert(err.message === "Already voted"
        ? "Du hast diesen Beitrag bereits bewertet."
        : "Bitte warte kurz, bevor du erneut bewertest.");
      console.error(err);
    }
  }

  const tbtn = e.target.closest("[data-toggle-comments]");
  if (tbtn){
    const id = tbtn.getAttribute("data-toggle-comments");
    const box = document.getElementById(`comments-${id}`);
    if (!box) return;

    const open = box.style.display === "block";
    box.style.display = open ? "none" : "block";
    if (!open && !id.startsWith("demo-")) await loadComments(id);
  }
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-comment-form]");
  if (!form) return;
  e.preventDefault();

  const postId = form.getAttribute("data-comment-form");
  const status = document.getElementById(`cstatus-${postId}`);
  status.textContent = "Sende…";

  const fd = new FormData(form);
  try{
    await fetchJSON(`${API}/api/posts/${postId}/comments`, { method:"POST", body: fd });
    form.reset();
    status.textContent = "Gesendet.";
    await loadComments(postId);
  }catch(err){
    status.textContent = err.message;
  }
});

async function loadComments(postId){
  const list = document.getElementById(`commentsList-${postId}`);
  if (!list) return;

  const items = await fetchJSON(`${API}/api/posts/${postId}/comments`);

  if (!items.length){
    list.innerHTML = `<div class="emptyState">Noch keine Kommentare.</div>`;
    return;
  }

  list.innerHTML = items.map(c => {
    const file = c.file_path
      ? `<a class="fileLink" href="${API}/uploads/${encodeURIComponent(c.file_path)}" target="_blank">📎 Datei</a>`
      : "";
    const deleteButton = c.can_delete
      ? `<button class="voteBtn dangerBtn" data-delete-comment="${c.id}">Delete</button>`
      : "";

    return `
      <div class="commentItem">
        <div class="commentText">${formatText(c.text)}</div>
        <div class="commentMeta">
          <span>${escapeHtml(c.created_at)}</span>
          ${file}
          ${deleteButton}
        </div>
      </div>
    `;
  }).join("");
}

loadLists();
