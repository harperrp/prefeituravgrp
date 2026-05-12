// Portal público: concursos + conteúdo editável de Prefeitura/Transparência.
// Correção: concursos é inserido antes do rodapé, junto das páginas internas do index.
(function(){
  const API=window.PrefeituraAPI; if(!API) return;
  const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v??'').replace(/[&<>'"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
  const fmt=d=>{if(!d)return '—';const x=new Date(String(d).replace(' ','T'));return isNaN(x)?d:x.toLocaleDateString('pt-BR')};
  const statusLabel=s=>({aberto:'Aberto',em_andamento:'Em andamento',concluido:'Concluído',cancelado:'Cancelado'}[s]||s||'Aberto');

  function styles(){
    if(document.getElementById('portal-cp-style'))return;
    const s=document.createElement('style');
    s.id='portal-cp-style';
    s.textContent=`
      #pg-concursos{background:#f4f6f4;min-height:640px}.concursos-table-wrap{max-width:1280px;margin:0 auto;padding:44px 28px 70px}.concursos-card{background:#fff;border-radius:12px;box-shadow:var(--s1,0 4px 20px rgba(0,60,0,.09));overflow:hidden}.concursos-card-head{padding:18px 22px;border-bottom:1px solid #eef2ee;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.concursos-card-title{font-family:'Barlow Condensed',Arial,sans-serif;font-weight:900;font-size:18px;text-transform:uppercase;letter-spacing:.7px;color:#102510}.concursos-public-table{width:100%;border-collapse:collapse}.concursos-public-table th{padding:10px 18px;font-size:9.5px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;color:#4a5e4a;text-align:left;background:#f8fcf8;border-bottom:1px solid #e8f0e8}.concursos-public-table td{padding:13px 18px;font-size:12.5px;color:#4a5e4a;border-bottom:1px solid #eef2ee;vertical-align:middle}.concursos-public-table tr:last-child td{border-bottom:0}.conc-title{font-weight:800;color:#152815}.conc-desc{display:block;margin-top:3px;color:#6a7d6a;font-size:11.5px;line-height:1.35}.conc-status{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;font-weight:900;font-size:11px}.conc-status.aberto{background:#dbeafe;color:#1e40af}.conc-status.em_andamento{background:#fef3c7;color:#78350f}.conc-status.concluido{background:#d1fae5;color:#065f46}.conc-status.cancelado{background:#fee2e2;color:#991b1b}.conc-edital{display:inline-flex;align-items:center;gap:5px;background:#0b6f16;color:#fff!important;text-decoration:none;border-radius:6px;padding:7px 12px;font-weight:900;font-size:11px}.conc-edital:hover{background:#1a7a1a}.conc-empty{padding:28px;color:#4a5e4a}.mnl a[data-concursos-link].act{color:#f5c518;border-bottom-color:#f5c518}@media(max-width:850px){.concursos-card{overflow:auto}.concursos-public-table{min-width:760px}}
    `;
    document.head.appendChild(s);
  }

  function getFooter(){
    return document.querySelector('footer') || document.querySelector('.footer') || document.querySelector('#footer');
  }

  function getPagesHost(){
    const pg=document.querySelector('.pg');
    if(pg && pg.parentElement) return pg.parentElement;
    const site=document.querySelector('#site');
    return site || document.body;
  }

  function placeBeforeFooter(pg){
    const footer=getFooter();
    const host=getPagesHost();
    if(footer && footer.parentElement){
      footer.parentElement.insertBefore(pg, footer);
      return;
    }
    host.appendChild(pg);
  }

  function ensureConcursosPage(){
    styles();
    let pg=document.getElementById('pg-concursos');
    if(pg){
      const footer=getFooter();
      if(footer && pg.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_PRECEDING){
        placeBeforeFooter(pg);
      }
      return pg;
    }
    pg=document.createElement('section');
    pg.id='pg-concursos';
    pg.className='pg';
    pg.innerHTML=`
      <div class="inner-hero">
        <div class="ih-in">
          <button class="ih-back" type="button" data-voltar-transparencia>← Voltar para Transparência</button>
          <h1 class="ih-title">Concursos <em>Públicos</em></h1>
          <p class="ih-desc">Editais, andamento, inscrições, vagas e nomeações dos concursos públicos municipais.</p>
          <div class="ih-pills"><span class="ih-pill g">C.5 da LAI</span><span class="ih-pill">Editais</span><span class="ih-pill">Andamento</span><span class="ih-pill">Nomeações</span></div>
        </div>
      </div>
      <div class="concursos-table-wrap">
        <div class="concursos-card">
          <div class="concursos-card-head"><div class="concursos-card-title">Concursos publicados</div></div>
          <table class="concursos-public-table">
            <thead><tr><th>Concurso</th><th>Publicação</th><th>Vagas</th><th>Etapa</th><th>Status</th><th>Edital</th></tr></thead>
            <tbody id="concursosPublicTbody"><tr><td colspan="6">Carregando concursos...</td></tr></tbody>
          </table>
        </div>
      </div>`;
    placeBeforeFooter(pg);
    return pg;
  }

  function setActivePage(){
    const pg=ensureConcursosPage();
    document.querySelectorAll('.pg').forEach(p=>p.classList.remove('act'));
    pg.classList.add('act');
    document.querySelectorAll('.mnl a').forEach(a=>a.classList.remove('act'));
    const menuConc=document.querySelector('.mnl a[data-concursos-link]');
    if(menuConc) menuConc.classList.add('act');
  }

  function markConcursosCard(){
    document.querySelectorAll('a,button,.mod,.card,article').forEach(el=>{
      const tx=norm(el.textContent||'');
      if(tx.includes('concursos publicos')||tx.includes('concursos públicos')){
        if(el.matches('a')) el.setAttribute('href','#concursos');
        el.setAttribute('data-concursos-link','1');
      }
    });
  }

  async function renderConcursos(){
    const pg=ensureConcursosPage();
    setActivePage();
    const tbody=pg.querySelector('#concursosPublicTbody');
    try{
      const res=await API.concursos.listar(true);
      const rows=res.data||[];
      tbody.innerHTML=rows.length?rows.map(c=>`<tr><td><span class="conc-title">${esc(c.titulo)}</span><span class="conc-desc">${esc(c.descricao||'')}</span></td><td>${esc(fmt(c.publicacao))}</td><td>${esc(c.vagas||0)}</td><td>${esc(c.etapa||'')}</td><td><span class="conc-status ${esc(c.status)}">${esc(statusLabel(c.status))}</span></td><td>${c.edital?`<a class="conc-edital" target="_blank" href="${esc(c.edital)}">📄 Edital</a>`:'—'}</td></tr>`).join(''):'<tr><td colspan="6"><div class="conc-empty">Nenhum concurso publicado.</div></td></tr>';
    }catch(err){
      tbody.innerHTML='<tr><td colspan="6"><div class="conc-empty">Não foi possível carregar os concursos.</div></td></tr>';
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function voltarTransparencia(){
    if(typeof window.navTo==='function'){
      window.navTo('transparencia');
    }else{
      document.querySelectorAll('.pg').forEach(pg=>pg.classList.remove('act'));
      const trans=document.getElementById('pg-transparencia')||document.querySelector('[id*="transparencia"].pg');
      if(trans) trans.classList.add('act');
      location.hash='transparencia';
    }
  }

  document.addEventListener('click',function(e){
    const back=e.target.closest('[data-voltar-transparencia]');
    if(back){e.preventDefault();voltarTransparencia();return;}

    const link=e.target.closest('a,button,.mod,.card,article');
    if(!link || link.closest('#pg-concursos')) return;
    const txt=norm(link.textContent||'');
    const href=(link.getAttribute && (link.getAttribute('href')||'')) || '';
    const isConcursos=txt.includes('concursos publicos')||txt.includes('concursos públicos')||href==='#concursos'||href.includes('concursos');
    if(isConcursos){
      e.preventDefault();
      e.stopImmediatePropagation();
      history.replaceState(null,'','#concursos');
      renderConcursos();
    }
  },true);

  window.addEventListener('hashchange',()=>{ if(location.hash==='#concursos') setTimeout(renderConcursos,80); });

  function boot(){
    styles();
    markConcursosCard();
    ensureConcursosPage();
    if(location.hash==='#concursos') setTimeout(renderConcursos,250);
    setTimeout(markConcursosCard,800);
    setTimeout(markConcursosCard,1800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
