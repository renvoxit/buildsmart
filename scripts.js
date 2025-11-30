document.querySelectorAll('[data-modal]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent =
      btn.dataset.modal === 'ideen' ? 'Idee hochladen' : 'Schaden melden';
    modal.classList.remove('hidden');
  });
});

function closeModal(msg){
  document.getElementById('modal').classList.add('hidden');
  if(msg) setTimeout(()=>alert(msg), 50); 
}

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href');
    if(id.length>1){
      e.preventDefault();
      document.querySelector(id).scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
});

(() => {
  let currentKind = 'ideen'; 

  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentKind = btn.dataset.modal === 'reparieren' ? 'reparieren' : 'ideen';
    });
  });

  const modal = document.getElementById('modal');
  const form  = modal.querySelector('form');

  const inputs = form.querySelectorAll('input');
  const titleInput = inputs[0];          // Titel
  const placeInput = inputs[1];          // Ort
  const dateInput  = inputs[2];          // Datum (type=date)
  const descArea   = form.querySelector('textarea');
  const fileInput  = form.querySelector('input[type="file"]');

  const ideasWrap = document.querySelector('#ideen .cards');
  const fixWrap   = document.querySelector('#reparieren .cards');

  const KEY = 'buildsmart-v1';
  const data = JSON.parse(localStorage.getItem(KEY) || '{"ideen":[],"reparieren":[]}');

  function save(){ localStorage.setItem(KEY, JSON.stringify(data)); }

  function fileToDataURL(file){
    return new Promise(res => {
      if(!file){ res(null); return; }
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(file);
    });
  }

  function makeCard(item){
    const art = document.createElement('article');
    art.className = 'card';

    if (item.img){
      const img = document.createElement('img');
      img.className = 'card-thumb';
      img.src = item.img;
      img.alt = 'Bild';
      art.appendChild(img);
    }

    const h3 = document.createElement('h3');
    h3.textContent = item.title || '—';
    const p  = document.createElement('p');
    p.textContent = item.sub || '—';

    art.appendChild(h3);
    art.appendChild(p);
    return art;
  }

  function appendCard(kind, item){
    (kind === 'reparieren' ? fixWrap : ideasWrap).appendChild(makeCard(item));
  }

  [...data.ideen].forEach(it => appendCard('ideen', it));
  [...data.reparieren].forEach(it => appendCard('reparieren', it));

  form.addEventListener('submit', async () => {
    const img = await fileToDataURL(fileInput.files[0]);

    const item = (currentKind === 'ideen')
      ? {
          title: titleInput.value.trim(),
          sub:   (descArea.value || '').trim(),
          img
        }
      : {
          title: titleInput.value.trim(),
          sub:   `${(placeInput.value || 'Ort unbekannt').trim()} — ${dateInput.value || 'Datum fehlt'}`,
          img
        };

    data[currentKind].push(item);
    save();
    appendCard(currentKind, item);
    form.reset();
  });
})();
/* === IMPROVED SECTION REVEAL === */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.25,
  rootMargin: "0px 0px -10% 0px"
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));



