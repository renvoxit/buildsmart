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
