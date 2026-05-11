// Integração do painel administrativo com Ouvidoria / SIC.
// Lista manifestações, permite responder, alterar status e arquivar.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.ouvidoria) return;

  const state = { items: [], filter: { tipo: '', status: '' }, timer: null };

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));

  function visible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0 && r.width > 0 && r.height > 0;
  }

  function toast(text, type = 'ok') {
    let el = document.getElementById('painel-api-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'painel-api-toast';
      el.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:99999;max-width:420px;padding:14px 16px;border-radius:12px;font:700 13px Sora,Arial;background:#111711;color:#e2ebe2;border:1px solid #2a3a2a;box-shadow:0 16px 50px rgba(0,0,0,.45);display:none';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.borderColor = type === 'err' ? 'rgba(248,81,73,.6)' : 'rgba(46,204,64,.45)';
    el.style.color = type === 'err' ? '#ffb8b8' : '#b8ffc0';
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 4500);
  }

  function isPageActive() {
    const text = Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title,.breadcrumb,*[class*="title"]'))
      .filter(visible)
      .map((el) => norm(el.textContent))
      .join(' | ');
    return text.includes('ouvidoria') || text.includes('sic') || text.includes('manifestacao') || text.includes('manifestação');
  }

  function ensureStyles() {
    if (document.getElementById('painel-ouvidoria-style')) return;
    const style = document.createElement('style');
    style.id = 'painel-ouvidoria-style';
    style.textContent = `
      .ouv-wrap{border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;background:rgba(7,18,7,.72);margin-top:24px}.ouv-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07)}.ouv-head h3{margin:0;color:#fff;font:900 18px Sora,Arial;letter-spacing:.04em}.ouv-filters{display:flex;gap:10px;flex-wrap:wrap}.ouv-filters select,.ouv-filters input{background:#101d10;color:#e8f5e8;border:1px solid #254825;border-radius:8px;padding:10px;font:700 12px Sora,Arial}.ouv-table{width:100%;border-collapse:collapse}.ouv-table th{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#7fac7f;text-align:left;padding:14px 18px;background:rgba(255,255,255,.025)}.ouv-table td{padding:14px 18px;border-top:1px solid rgba(255,255,255,.06);color:#bdd5bd;font-size:13px;vertical-align:top}.ouv-protocolo{font-weight:900;color:#2ecc40}.ouv-assunto{font-weight:900;color:#e8f5e8}.ouv-small{display:block;color:#7fa47f;font-size:12px;margin-top:4px}.ouv-actions{display:flex;gap:7px;flex-wrap:wrap}.ouv-btn{border:1px solid #315831;background:#122512;color:#dff5df;border-radius:8px;padding:8px 10px;font-weight:900;font-size:12px;cursor:pointer}.ouv-btn.primary{background:#0b7d12;border-color:#0b7d12;color:#fff}.ouv-btn.red{background:rgba(248,81,73,.14);border-color:rgba(248,81,73,.35);color:#ffb8b8}.ouv-select{background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:8px;font-weight:700}.ouv-status{display:inline-flex;border-radius:999px;padding:5px 9px;font-weight:900;font-size:12px}.ouv-status.novo{background:#073763;color:#8cc8ff}.ouv-status.em_analise{background:#4a3b00;color:#ffe066}.ouv-status.respondido{background:#064f16;color:#9bff9b}.ouv-status.arquivado{background:#4a1111;color:#ffb8b8}.ouv-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.74);z-index:99990;display:none;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(4px)}.ouv-modal-bg.open{display:flex}.ouv-modal{width:min(820px,96vw);max-height:92vh;overflow:auto;background:#0d1a0d;border:1px solid #234523;border-radius:14px;box-shadow:0 28px 90px rgba(0,0,0,.55);color:#e8f5e8}.ouv-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.08)}.ouv-modal-head h3{margin:0;font:900 23px Sora,Arial;color:#fff}.ouv-close{background:transparent;border:0;color:#8fbf8f;font-size:24px;font-weight:900;cursor:pointer}.ouv-modal-body{padding:22px 24px}.ouv-box{background:#111f11;border:1px solid #254825;border-radius:10px;padding:14px;margin:12px 0;color:#d7ead7;line-height:1.55}.ouv-textarea{width:100%;min-height:160px;background:#111f11;border:1px solid #254825;color:#e8f5e8;border-radius:10px;padding:12px;font:700 13px Sora,Arial;resize:vertical}.ouv-modal-actions{display:flex;gap:10px;justify-content:flex-end;padding:18px 24px;border-top:1px solid rgba(255,255,255,.08)}
    `;
    document.head.appendChild(style);
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  }

  function statusLabel(status) {
    return ({ novo: 'Novo', em_analise: 'Em análise', respondido: 'Respondido', arquivado: 'Arquivado' }[status] || status || 'Novo');
  }

  function tipoLabel(tipo) {
    return tipo === 'sic' ? 'SIC / Pedido de Informação' : 'Ouvidoria / Manifestação';
  }

  function findContentRoot() {
    const titles = Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title')).filter(visible);
    const title = titles.find((el) => norm(el.textContent).includes('ouvidoria') || norm(el.textContent).includes('sic')) || titles[0];
    return title?.closest('main, .content, .page, section, .main, .app-main') || title?.parentElement || document.body;
  }

  function ensurePanel() {
    ensureStyles();
    if (!isPageActive()) return null;
    let wrap = document.getElementById('painelOuvidoriaWrap');
    if (wrap) return wrap;
    const root = findContentRoot();
    wrap = document.createElement('div');
    wrap.id = 'painelOuvidoriaWrap';
    wrap.className = 'ouv-wrap';
    wrap.innerHTML = `
      <div class="ouv-head">
        <h3>ATENDIMENTOS REGISTRADOS</h3>
        <div class="ouv-filters">
          <select id="ouvTipoFilter"><option value="">Todos os tipos</option><option value="sic">SIC</option><option value="ouvidoria">Ouvidoria</option></select>
          <select id="ouvStatusFilter"><option value="">Todos os status</option><option value="novo">Novo</option><option value="em_analise">Em análise</option><option value="respondido">Respondido</option><option value="arquivado">Arquivado</option></select>
        </div>
      </div>
      <table class="ouv-table">
        <thead><tr><th>Protocolo</th><th>Solicitante</th><th>Assunto</th><th>Tipo</th><th>Prazo</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody id="ouvTbody"><tr><td colspan="7">Carregando...</td></tr></tbody>
      </table>`;
    root.appendChild(wrap);
    wrap.querySelector('#ouvTipoFilter').addEventListener('change', (e) => { state.filter.tipo = e.target.value; load(); });
    wrap.querySelector('#ouvStatusFilter').addEventListener('change', (e) => { state.filter.status = e.target.value; load(); });
    return wrap;
  }

  function ensureModal() {
    ensureStyles();
    let bg = document.getElementById('ouvRespostaModal');
    if (bg) return bg;
    bg = document.createElement('div');
    bg.id = 'ouvRespostaModal';
    bg.className = 'ouv-modal-bg';
    bg.innerHTML = `<div class="ouv-modal"><div class="ouv-modal-head"><div><h3 id="ouvModalTitle">Responder atendimento</h3><span class="ouv-small" id="ouvModalSub"></span></div><button class="ouv-close" type="button">×</button></div><div class="ouv-modal-body"><div class="ouv-box" id="ouvMensagemBox"></div><label style="font-weight:900;color:#8fbf8f;font-size:12px;text-transform:uppercase;letter-spacing:.12em">Resposta da prefeitura</label><textarea id="ouvRespostaText" class="ouv-textarea" placeholder="Digite a resposta oficial..."></textarea></div><div class="ouv-modal-actions"><button class="ouv-btn" type="button" data-ouv-modal-close>Cancelar</button><button class="ouv-btn primary" type="button" id="ouvSalvarResposta">Salvar resposta</button></div></div>`;
    document.body.appendChild(bg);
    bg.querySelector('.ouv-close').addEventListener('click', () => bg.classList.remove('open'));
    bg.querySelector('[data-ouv-modal-close]').addEventListener('click', () => bg.classList.remove('open'));
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('open'); });
    return bg;
  }

  function render() {
    const wrap = ensurePanel();
    if (!wrap) return;
    const tbody = wrap.querySelector('#ouvTbody');
    if (!tbody) return;
    tbody.innerHTML = state.items.map((item) => `
      <tr data-ouv-id="${esc(item.id)}">
        <td><span class="ouv-protocolo">${esc(item.protocolo)}</span><span class="ouv-small">${fmtDate(item.criado_em)}</span></td>
        <td><strong>${esc(item.nome || 'Não informado')}</strong><span class="ouv-small">${esc(item.email || '')} ${esc(item.telefone || '')}</span></td>
        <td><span class="ouv-assunto">${esc(item.assunto)}</span><span class="ouv-small">${esc(item.categoria || '')}</span></td>
        <td>${esc(tipoLabel(item.tipo))}</td>
        <td>${item.tipo === 'sic' ? esc(fmtDate(item.prazo_resposta)) : '—'}</td>
        <td><span class="ouv-status ${esc(item.status)}">${esc(statusLabel(item.status))}</span></td>
        <td><div class="ouv-actions"><button class="ouv-btn primary" data-ouv-responder="${esc(item.id)}">Responder</button><select class="ouv-select" data-ouv-status="${esc(item.id)}"><option value="novo" ${item.status === 'novo' ? 'selected' : ''}>Novo</option><option value="em_analise" ${item.status === 'em_analise' ? 'selected' : ''}>Em análise</option><option value="respondido" ${item.status === 'respondido' ? 'selected' : ''}>Respondido</option><option value="arquivado" ${item.status === 'arquivado' ? 'selected' : ''}>Arquivado</option></select><button class="ouv-btn red" data-ouv-delete="${esc(item.id)}">Arquivar</button></div></td>
      </tr>
    `).join('') || '<tr><td colspan="7">Nenhum atendimento registrado.</td></tr>';
  }

  async function load() {
    if (!isPageActive()) return;
    ensurePanel();
    try {
      const res = await API.ouvidoria.listar(state.filter.tipo, state.filter.status);
      state.items = res.data || [];
      render();
    } catch (e) {
      console.warn('Erro ao carregar Ouvidoria/SIC:', e);
      toast(e.message || 'Erro ao carregar Ouvidoria/SIC.', 'err');
    }
  }

  function openResposta(id) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!item) return;
    const modal = ensureModal();
    modal.querySelector('#ouvModalTitle').textContent = `${item.protocolo} — ${item.assunto}`;
    modal.querySelector('#ouvModalSub').textContent = `${tipoLabel(item.tipo)} · ${item.nome || 'Solicitante não informado'}`;
    modal.querySelector('#ouvMensagemBox').innerHTML = `<strong>Mensagem recebida:</strong><br>${esc(item.mensagem).replace(/\n/g, '<br>')}`;
    const text = modal.querySelector('#ouvRespostaText');
    text.value = item.resposta || '';
    modal.querySelector('#ouvSalvarResposta').onclick = async () => {
      try {
        await API.ouvidoria.responder({ id: item.id, resposta: text.value, status: text.value.trim() ? 'respondido' : 'em_analise' });
        toast('Resposta salva com sucesso.');
        modal.classList.remove('open');
        await load();
      } catch (e) { toast(e.message || 'Erro ao salvar resposta.', 'err'); }
    };
    modal.classList.add('open');
  }

  async function updateStatus(id, status) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!item) return;
    try {
      await API.ouvidoria.responder({ id: item.id, resposta: item.resposta || '', status });
      toast('Status atualizado.');
      await load();
    } catch (e) { toast(e.message || 'Erro ao atualizar status.', 'err'); }
  }

  async function arquivar(id) {
    if (!confirm('Arquivar este atendimento?')) return;
    try {
      await API.ouvidoria.excluir(id);
      toast('Atendimento arquivado.');
      await load();
    } catch (e) { toast(e.message || 'Erro ao arquivar.', 'err'); }
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-ouv-responder],[data-ouv-delete]');
    if (!btn) {
      setTimeout(load, 350);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const responder = btn.getAttribute('data-ouv-responder');
    const del = btn.getAttribute('data-ouv-delete');
    if (responder) openResposta(responder);
    if (del) arquivar(del);
  }, true);

  document.addEventListener('change', (event) => {
    const sel = event.target.closest('[data-ouv-status]');
    if (!sel) return;
    updateStatus(sel.getAttribute('data-ouv-status'), sel.value);
  }, true);

  function boot() {
    ensureStyles();
    setTimeout(load, 400);
    setTimeout(load, 1300);
    setInterval(() => { if (isPageActive()) load(); }, 9000);
    window.addEventListener('painel-auth-ok', load);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
