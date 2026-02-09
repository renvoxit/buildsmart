const API = "http://127.0.0.1:5000";

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
  btnGo.addEventListener("click", async () => {
    const wrap = document.getElementById("postsWrap");
    const sec = document.getElementById("postsSection");
    if (!wrap || !sec) return;

    wrap.style.display = "block";
    await loadLists();

    // Upload-Dialog direkt öffnen
    selectShareTab("vorschlag");
    openModal("modalShare");

    sec.scrollIntoView({behavior:"smooth", block:"start"});
    sec.style.outline = "3px solid rgba(165,101,95,0.35)";
    setTimeout(() => sec.style.outline = "none", 900);
  });
}

const openVorschlag = document.getElementById("openVorschlag");
const openAnmerkung = document.getElementById("openAnmerkung");
if (openVorschlag) openVorschlag.addEventListener("click", () => {
  selectShareTab("vorschlag");
  openModal("modalShare");
});
if (openAnmerkung) openAnmerkung.addEventListener("click", () => {
  selectShareTab("anmerkung");
  openModal("modalShare");
});

// Tabs im Upload-Modal
function selectShareTab(tab){
  const tv = document.getElementById("tabV");
  const ta = document.getElementById("tabA");
  const fv = document.getElementById("tabFormV");
  const fa = document.getElementById("tabFormA");
  if (!tv || !ta || !fv || !fa) return;

  const isV = tab === "vorschlag";
  tv.classList.toggle("active", isV);
  ta.classList.toggle("active", !isV);
  fv.style.display = isV ? "block" : "none";
  fa.style.display = isV ? "none" : "block";
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-share-tab]");
  if (!t) return;
  selectShareTab(t.getAttribute("data-share-tab"));
});

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
            <div class="fieldLabel" style="margin:0 0 6px;">Kommentar*</div>
            <textarea class="input" name="text" required
                      placeholder="Schreibe deinen Kommentar hier (ohne E-Mail)…"></textarea>

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

submitPost("formV", "statusV", "modalShare");
submitPost("formA", "statusA", "modalShare");

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
    list.innerHTML = `<div style="color:#777;">Noch keine Kommentare.</div>`;
    return;
  }

  list.innerHTML = items.map(c => {
    const file = c.file_path
      ? `<div style="margin-top:6px;"><a href="${API}/uploads/${c.file_path}" target="_blank">📎 Datei öffnen</a></div>`
      : "";
    return `
      <div class="commentCard">
        <div style="color:#777; font-size:13px;">${escapeHtml(c.created_at)}</div>
        <div style="margin-top:6px; color:#444;">${escapeHtml(c.text)}</div>
        ${file}
      </div>
    `;
  }).join("");
}

// loadLists();
