const API = "http://localhost:5000"; // потом заменишь на адрес деплоя

async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  });
  children.forEach(c => n.append(c));
  return n;
}

function renderPost(p) {
  const badge = p.category === "vorschlag" ? "Vorschlag" : "Anmerkung";
  const wrap = el("div", { class: "post" });

  const head = el("div", { class: "postHead" }, [
    el("div", {}, [
      el("div", { class: "badge" }, [document.createTextNode(badge)]),
      el("h3", { style: "margin:10px 0 6px" }, [document.createTextNode(p.title)]),
      el("div", { class: "small" }, [document.createTextNode(p.created_at)])
    ]),
    el("div", { class: "actions" }, [
      el("button", { class: "voteBtn", onClick: async () => {
        const res = await fetchJSON(`${API}/api/posts/${p.id}/vote`, { method: "POST" });
        votesNode.textContent = `👍 ${res.votes}`;
      }}, [document.createTextNode("👍 Vote")]),
      (function(){
        const n = el("span", { class:"small" }, [document.createTextNode(`👍 ${p.votes}`)]);
        return n;
      })()
    ])
  ]);

  // маленький хак, чтобы обновлять счетчик
  const votesNode = head.querySelector(".actions .small");

  wrap.append(head);
  wrap.append(el("p", {}, [document.createTextNode(p.description)]));

  if (p.image_path) {
    wrap.append(el("img", { src: `${API}/uploads/${p.image_path}`, alt: "upload" }));
  }

  // comments
  const commentsBox = el("div", { class:"card", style:"margin-top:12px; background:var(--card)" });
  const commentsList = el("div", { style:"display:grid; gap:10px; margin-top:10px" });

  const form = el("form", {}, [
    el("label", {}, [document.createTextNode("Kommentar (ohne E-Mail)")]),
    el("textarea", { name:"text", required:"", placeholder:"Schreib einen Kommentar..." }),
    el("label", {}, [document.createTextNode("Datei (optional)")]),
    el("input", { type:"file", name:"file" }),
    el("div", { class:"row", style:"margin-top:10px" }, [
      el("button", { class:"btn", type:"submit" }, [document.createTextNode("Senden")]),
      el("span", { class:"small" }, [])
    ])
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = form.querySelector(".small");
    status.textContent = "Sende…";
    const fd = new FormData(form);
    try {
      await fetchJSON(`${API}/api/posts/${p.id}/comments`, { method:"POST", body: fd });
      form.reset();
      await loadComments(p.id, commentsList);
      status.textContent = "Gesendet.";
    } catch (err) {
      status.textContent = err.message;
    }
  });

  commentsBox.append(el("h3", { style:"margin:0" }, [document.createTextNode("Kommentare")]));
  commentsBox.append(commentsList);
  commentsBox.append(form);
  wrap.append(commentsBox);

  loadComments(p.id, commentsList);
  return wrap;
}

async function loadComments(postId, container) {
  container.innerHTML = "";
  const items = await fetchJSON(`${API}/api/posts/${postId}/comments`);
  if (!items.length) {
    container.append(el("div", { class:"small" }, [document.createTextNode("Noch keine Kommentare.")]));
    return;
  }
  for (const c of items) {
    const row = el("div", { class:"card", style:"padding:12px; background:#fff" }, [
      el("div", { class:"small" }, [document.createTextNode(c.created_at)]),
      el("div", {}, [document.createTextNode(c.text)])
    ]);
    if (c.file_path) {
      const a = el("a", { href: `${API}/uploads/${c.file_path}`, target:"_blank" }, [document.createTextNode("📎 Datei öffnen")]);
      a.style.display = "inline-block";
      a.style.marginTop = "8px";
      row.append(a);
    }
    container.append(row);
  }
}

async function submitForm(formId, statusId) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sende…";
    const fd = new FormData(form);
    try {
      await fetchJSON(`${API}/api/posts`, { method:"POST", body: fd });
      form.reset();
      status.textContent = "Gesendet.";
      await loadFeed();
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

async function loadFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
  const posts = await fetchJSON(`${API}/api/posts`);
  for (const p of posts) feed.append(renderPost(p));
}

submitForm("formVorschlag", "vorschlagStatus");
submitForm("formAnmerkung", "anmerkungStatus");
loadFeed();
