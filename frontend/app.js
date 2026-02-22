const API = location.origin;

async function fetchJSON(url, opts = {}) {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(await r.text());
    return await r.json();
  } catch (e) {
    alert("Backend error");
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

document.addEventListener("click", (e) => {
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
  : "./assets/placeholder-thumb.jpg";
  const label = p.category === "vorschlag" ? "Idee" : "Anmerkung";

  return `
    <div class="postCard">
      <div class="postTop">
        <div class="postMeta">
          <div class="postAddress">${escapeHtml(p.address)}</div>
          <div class="postType">${escapeHtml(label)}</div>
        </div>
        <div class="postVotes">
          <button class="voteBtn" data-vote="${p.id}" title="Vote">👍</button>
          <span class="voteCount">${p.votes}</span>
        </div>
      </div>

      <div class="postBody">
        <div class="postText">${escapeHtml(p.description)}</div>
        <div class="postMedia">
          <img class="postImg" src="${img}" alt="image"/>
        </div>
      </div>

      <div class="postActions">
        <button class="commentToggle" data-toggle-comments="${p.id}">Kommentare</button>
      </div>

      <div class="commentsBox" id="comments-${p.id}" style="display:none;">
        <div class="commentsList" id="commentsList-${p.id}"></div>

        <form class="commentForm" data-comment-form="${p.id}">
          <textarea class="input" name="text" required
            placeholder="Kommentar schreiben (ohne E-Mail)…"></textarea>

          <div class="commentRow">
            <input class="input" type="file" name="file"/>
            <button class="btn" type="submit">Senden</button>
          </div>

          <div class="status" id="cstatus-${p.id}"></div>
        </form>
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

  lv.innerHTML = v.length ? v.map(postItemHTML).join("") : `<div class="emptyState">Noch keine Vorschläge.</div>`;
  la.innerHTML = a.length ? a.map(postItemHTML).join("") : `<div class="emptyState">Noch keine Anmerkungen.</div>`;
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
    if (!open) await loadComments(id);
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
? `<a class="fileLink" href="${API}/uploads/${encodeURIComponent(c.file_path)}" target="_blank">📎 Datei</a>`      : "";
    return `
      <div class="commentItem">
        <div class="commentText">${escapeHtml(c.text)}</div>
        <div class="commentMeta">
          <span>${escapeHtml(c.created_at)}</span>
          ${file}
        </div>
      </div>
    `;
  }).join("");
}

loadLists();
