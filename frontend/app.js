const API = "http://localhost:5000"; // потом заменишь на URL деплоя

async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function openModal(id){
  document.getElementById(id).style.display = "flex";
}
function closeModal(id){
  document.getElementById(id).style.display = "none";
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-close]");
  if (btn) closeModal(btn.getAttribute("data-close"));
  // клик по фону модалки
  const back = e.target.classList.contains("modalBack");
  if (back) e.target.style.display = "none";
});

const openVorschlag = document.getElementById("openVorschlag");
const openAnmerkung = document.getElementById("openAnmerkung");
const openMainShare = document.getElementById("openMainShare");
if (openVorschlag) openVorschlag.addEventListener("click", () => openModal("modalV"));
if (openAnmerkung) openAnmerkung.addEventListener("click", () => openModal("modalA"));
if (openMainShare) openMainShare.addEventListener("click", () => openModal("modalV")); // кнопка “Teilen” открывает Vorschlag

function postItemHTML(p){
  const img = p.image_path ? `${API}/uploads/${p.image_path}` : "./assets/placeholder-thumb.jpg";
  const label = p.category === "vorschlag" ? "Idee" : "Anmerkung";
  return `
    <div class="item">
      <img class="thumb" src="${img}" alt="thumb"/>
      <div class="itemText">
        <div><b>Adresse:</b> ${escapeHtml(p.address)}</div>
        <div><b>${label}:</b> ${escapeHtml(p.description)}</div>
        <div class="voteRow">
          <button class="voteBtn" data-vote="${p.id}">👍 Vote</button>
          <span style="color:#666;">${p.votes}</span>
          <button class="voteBtn" data-toggle-comments="${p.id}" style="margin-left:auto;">Kommentare</button>
        </div>

        <div id="comments-${p.id}" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid #ddd;">
          <div id="commentsList-${p.id}" style="display:grid; gap:8px;"></div>

          <form data-comment-form="${p.id}" style="margin-top:10px;">
            <div class="fieldLabel" style="margin:0 0 6px;">Nachricht*</div>
            <textarea class="input" name="text" required placeholder="Kommentar (ohne E-Mail)"></textarea>

            <div class="fieldLabel" style="margin:12px 0 6px;">Datei (optional)</div>
            <input class="input" type="file" name="file"/>

            <div class="modalActions">
              <button class="btn" type="submit">Senden</button>
              <span class="status" id="cstatus-${p.id}"></span>
            </div>
          </form>
        </div>

      </div>
    </div>
  `;
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function loadLists(){
  const lv = document.getElementById("listVorschlag");
  const la = document.getElementById("listAnmerkung");
  if (!lv || !la) return;

  const v = await fetchJSON(`${API}/api/posts?category=vorschlag`);
  const a = await fetchJSON(`${API}/api/posts?category=anmerkung`);

  lv.innerHTML = v.length ? v.map(postItemHTML).join("") : `<div style="color:#777;">Noch keine Vorschläge.</div>`;
  la.innerHTML = a.length ? a.map(postItemHTML).join("") : `<div style="color:#777;">Noch keine Anmerkungen.</div>`;
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
  // vote
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

  // toggle comments
  const tbtn = e.target.closest("[data-toggle-comments]");
  if (tbtn){
    const id = tbtn.getAttribute("data-toggle-comments");
    const box = document.getElementById(`comments-${id}`);
    if (!box) return;
    box.style.display = box.style.display === "none" ? "block" : "none";
    if (box.style.display === "block"){
      await loadComments(id);
    }
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
    list.innerHTML = `<div style="color:#777;">Noch keine Kommentare.</div>`;
    return;
  }
  list.innerHTML = items.map(c => {
    const file = c.file_path
      ? `<div><a href="${API}/uploads/${c.file_path}" target="_blank">📎 Datei öffnen</a></div>`
      : "";
    return `
      <div style="background:#fff; padding:10px; border:1px solid #ddd;">
        <div style="color:#777; font-size:13px;">${escapeHtml(c.created_at)}</div>
        <div style="margin-top:6px; color:#444;">${escapeHtml(c.text)}</div>
        ${file}
      </div>
    `;
  }).join("");
}

loadLists();
