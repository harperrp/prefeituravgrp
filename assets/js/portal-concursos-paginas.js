// Portal público: concursos + conteúdo editável de Prefeitura/Transparência.
// Correção: card "Concursos Públicos" agora abre a área pública de concursos.
(function(){
  const API=window.PrefeituraAPI; if(!API) return;
  const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v??'').replace(/[&<>'"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
  function visible(el){if(!el)return false;const st=getComputedStyle(el),r=el.getBoundingClientRect();return st.display!=='none'&&st.visibility!=='hidden'&&r.width>0&&r.height>0}
  function title(){return Array.from(document.querySelectorAll('h1,h2,.section-title,.page-title')).filter(visible).map(el=>norm(el.textContent)).join(' | ')}
  function page(){const t=title()+ ' '+norm(location.hash); if(t.includes('concursos publicos')||t.includes('concursos públicos')||location.hash.includes('concursos'))return'concursos'; if(t.includes('a prefeitura')||location.hash.includes('prefeitura'))return'prefeitura'; if(t.includes('portal da transparencia')||t.includes('portal da transparência')||location.hash.includes('transparencia'))return'transparencia'; return''}
  function root(){const titles=Array.from(document.querySelectorAll('h1,h2,.section-title,.page-title')).filter(visible); const el=titles[0]; return el?.closest('main,section,.page,.content')||document.querySelector('main')||document.body}
  function fmt(d){if(!d)return '—';const x=new Date(String(d).replace(' ','T'));return isNaN(x)?d:x.toLocaleDateString('pt-BR')}
  function statusLabel(s){return {aberto:'Aberto',em_andamento:'Em andamento',concluido:'Concluído',cancelado:'Cancelado'}[s]||s||'Aberto'}

  function styles(){
    if(document.getElementById('portal-cp-style'))return;
    const s=document.createElement('style');
    s.id='portal-cp-style';
    s.textContent=`
      .portal-conc-hero{background:#002b08;color:#fff;padding:86px 0 70px;border-bottom:4px solid #19aa2a}.portal-conc-hero-inner{max-width:1180px;margin:0 auto}.portal-conc-back{color:#7bcf80;text-decoration:none;font:800 12px Sora,Arial;letter-spacing:.12em;text-transform:uppercase}.portal-conc-hero h1{margin:28px 0 12px;font:900 clamp(38px,6vw,72px) Sora,Arial;text-transform:uppercase;letter-spacing:.04em}.portal-conc-hero h1 span{color:#21c037}.portal-conc-hero p{max-width:680px;color:#b8cbb8;font:500 16px Sora,Arial;line-height:1.55}.portal-conc-wrap{max-width:1180px;margin:44px auto;background:#fff;border-radius:14px;box-shadow:0 16px 42px rgba(0,0,0,.08);overflow:hidden}.portal-conc-head{padding:22px 26px;border-bottom:1px solid #eef3ee}.portal-conc-head h3{margin:0;font:900 18px Sora,Arial;text-transform:uppercase;color:#102510}.portal-conc-table{width:100%;border-collapse:collapse}.portal-conc-table th{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#5a735a;text-align:left;padding:14px 18px;background:#f7faf7}.portal-conc-table td{padding:14px 18px;border-top:1px solid #edf2ed;color:#526852;font-size:13px}.portal-conc-title{font-weight:900;color:#203520}.portal-conc-status{display:inline-flex;border-radius:999px;padding:5px 10px;font-weight:900;font-size:12px}.portal-conc-status.aberto{background:#e5f1ff;color:#1264b0}.portal-conc-status.em_andamento{background:#fff4c2;color:#7a5a00}.portal-conc-status.concluido{background:#dff8e4;color:#087a16}.portal-conc-status.cancelado{background:#ffe2e2;color:#9b1c1c}.portal-conc-btn{display:inline-flex;text-decoration:none;background:#087a16;color:#fff;border-radius:8px;padding:8px 12px;font-weight:900;font-size:12px}.portal-page-grid{max-width:1180px;margin:40px auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.portal-page-card{background:#fff;border-radius:14px;box-shadow:0 16px 42px rgba(0,0,0,.08);border-top:5px solid #12851f;padding:22px}.portal-page-card h3{margin:0 0 12px;font:900 18px Sora,Arial;text-transform:uppercase;color:#152815}.portal-page-card p{white-space:pre-line;line-height:1.55;color:#526852;font-size:14px}.portal-page-card a{color:#087a16;font-weight:900;text-decoration:none}.portal-trans-list{max-width:1180px;margin:40px auto;background:#062b0d;border-radius:14px;padding:28px;display:grid;grid-template-columns:1fr;gap:12px}.portal-trans-item{display:flex;justify-content:space-between;align-items:center;gap:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:14px 18px;color:#e7ffe7;text-decoration:none}.portal-trans-item strong{color:#fff}.portal-trans-item span{color:#aee6ae;font-size:13px}@media(max-width:900px){.portal-page-grid{grid-template-columns:1fr}.portal-conc-wrap{overflow:auto}.portal-conc-hero{padding-left:20px;padding-right:20px}}
    `;
    document.head.appendChild(s)
  }

  function hideMainSectionsExceptConcursos(){
    const main = document.querySelector('main') || document.body;
    Array.from(main.children).forEach(el=>{
      if(el.id==='portalConcursosPage') return;
      if(el.tagName==='SCRIPT' || el.tagName==='STYLE') return;
      el.setAttribute('data-concursos-hidden','1');
      el.style.display='none';
    });
  }

  function restoreSections(){
    document.querySelectorAll('[data-concursos-hidden="1"]').forEach(el=>{
      el.style.display='';
      el.removeAttribute('data-concursos-hidden');
    });
  }

  async function renderConcursos(){
    if(!API.concursos)return;
    styles();
    hideMainSectionsExceptConcursos();
    const main = document.querySelector('main') || document.body;
    let pageEl=document.getElementById('portalConcursosPage');
    if(!pageEl){
      pageEl=document.createElement('section');
      pageEl.id='portalConcursosPage';
      pageEl.innerHTML=`
        <div class="portal-conc-hero"><div class="portal-conc-hero-inner">
          <a href="#transparencia" class="portal-conc-back">← Voltar para Transparência</a>
          <h1>Concursos <span>Públicos</span></h1>
          <p>Editais, andamento, inscrições, vagas e nomeações dos concursos públicos municipais.</p>
        </div></div>
        <div id="portalConcursosReal" class="portal-conc-wrap">
          <div class="portal-conc-head"><h3>Concursos publicados</h3></div>
          <table class="portal-conc-table"><thead><tr><th>Concurso</th><th>Publicação</th><th>Vagas</th><th>Etapa</th><th>Status</th><th>Edital</th></tr></thead><tbody></tbody></table>
        </div>`;
      main.appendChild(pageEl);
    }
    pageEl.style.display='block';
    const res=await API.concursos.listar(true);
    pageEl.querySelector('tbody').innerHTML=(res.data||[]).map(c=>`<tr><td><span class="portal-conc-title">${esc(c.titulo)}</span><br><small>${esc(c.descricao||'')}</small></td><td>${esc(fmt(c.publicacao))}</td><td>${esc(c.vagas||0)}</td><td>${esc(c.etapa||'')}</td><td><span class="portal-conc-status ${esc(c.status)}">${esc(statusLabel(c.status))}</span></td><td>${c.edital?`<a class="portal-conc-btn" target="_blank" href="${esc(c.edital)}">📄 Edital</a>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum concurso publicado.</td></tr>';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function renderPrefeitura(){
    restoreSections();
    document.getElementById('portalConcursosPage')?.remove();
    if(!API.paginas)return;
    const res=await API.paginas.listar('prefeitura',true);
    let grid=document.getElementById('portalPrefeituraEditavel');
    if(!grid){grid=document.createElement('div');grid.id='portalPrefeituraEditavel';grid.className='portal-page-grid';root().appendChild(grid)}
    grid.innerHTML=(res.data||[]).map(b=>`<article class="portal-page-card"><h3>${esc(b.titulo)}</h3>${b.subtitulo?`<strong>${esc(b.subtitulo)}</strong>`:''}<p>${esc(b.conteudo||'')}</p>${b.link_url?`<a href="${esc(b.link_url)}">${esc(b.link_texto||'Acessar')} →</a>`:''}</article>`).join('')
  }

  async function renderTransparencia(){
    restoreSections();
    document.getElementById('portalConcursosPage')?.remove();
    if(!API.paginas)return;
    const res=await API.paginas.listar('transparencia',true);
    let list=document.getElementById('portalTransparenciaEditavel');
    if(!list){list=document.createElement('div');list.id='portalTransparenciaEditavel';list.className='portal-trans-list';root().appendChild(list)}
    list.innerHTML=(res.data||[]).map(b=>`<a class="portal-trans-item" href="${esc(b.link_url||'#')}"><div><strong>${esc(b.titulo)}</strong><br><span>${esc(b.conteudo||'')}</span></div><span>${esc(b.link_texto||'Acessar')} ↗</span></a>`).join('')
  }

  async function refresh(){
    styles();
    const p=page();
    if(p==='concursos') return renderConcursos();
    if(p==='prefeitura') return renderPrefeitura();
    if(p==='transparencia') return renderTransparencia();
  }

  document.addEventListener('click',function(e){
    const link=e.target.closest('a,button,.card,article,div');
    if(!link) return;
    const txt=norm(link.textContent||'');
    const href=(link.getAttribute && (link.getAttribute('href')||'')) || '';
    const isConcursos = txt.includes('concursos publicos') || txt.includes('concursos públicos') || href.includes('concursos');
    if(isConcursos && !link.closest('#portalConcursosPage')){
      e.preventDefault();
      e.stopPropagation();
      location.hash='concursos';
      setTimeout(renderConcursos,120);
    }
  },true);

  window.addEventListener('hashchange',()=>setTimeout(refresh,250));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(refresh,500);setTimeout(refresh,1500)});else{setTimeout(refresh,500);setTimeout(refresh,1500)}
})();
