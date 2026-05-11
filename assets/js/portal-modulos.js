// Módulos dinâmicos do portal: Secretarias, Legislação, Diárias e Emendas.
// Preserva o layout atual e troca o conteúdo fake por dados vindos do banco.

(function () {
  const API = window.PrefeituraAPI;
  if (!API) return;

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[s]));

  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const date = (value) => {
    if (!value) return '';
    const raw = String(value).slice(0, 10);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  };

  function findTableByText(words) {
    const tables = Array.from(document.querySelectorAll('table'));
    return tables.find((table) => words.every((w) => table.textContent.toLowerCase().includes(w.toLowerCase())));
  }

  function tipoStyle(tipo) {
    const t = String(tipo || '').toLowerCase();
    if (t.includes('complement')) return 'color:#7c3aed;font-weight:900';
    if (t.includes('decreto')) return 'color:#0969da;font-weight:900';
    if (t.includes('portaria')) return 'color:#d97706;font-weight:900';
    if (t.includes('resolu')) return 'color:#0f766e;font-weight:900';
    return 'color:#0b7a20;font-weight:900';
  }

  function numeroStyle(tipo) {
    const t = String(tipo || '').toLowerCase();
    if (t.includes('complement')) return 'color:#7c3aed;font-weight:900';
    if (t.includes('decreto')) return 'color:#0969da;font-weight:900';
    if (t.includes('portaria')) return 'color:#d97706;font-weight:900';
    if (t.includes('resolu')) return 'color:#0f766e;font-weight:900';
    return 'color:#0b7a20;font-weight:900';
  }

  function situacaoBadge(situacao) {
    const s = String(situacao || 'vigente').toLowerCase();
    if (s.includes('revog')) return '<span class="sp" style="background:#fff3cd;color:#9a6700;border-radius:999px;padding:5px 12px;font-weight:900;font-size:12px">● Revogada</span>';
    if (s.includes('alter')) return '<span class="sp" style="background:#ffe3e3;color:#c92a2a;border-radius:999px;padding:5px 12px;font-weight:900;font-size:12px">● Alterada</span>';
    return '<span class="sp" style="background:#d9f8d9;color:#08720b;border-radius:999px;padding:5px 12px;font-weight:900;font-size:12px">● Vigente</span>';
  }

  function ensureLegStyle() {
    if (document.getElementById('leg-table-polish')) return;
    const style = document.createElement('style');
    style.id = 'leg-table-polish';
    style.textContent = `
      .leg-ver-btn{display:inline-flex;align-items:center;gap:7px;background:#075d08;color:#fff!important;border-radius:7px;padding:10px 15px;font-weight:900;text-decoration:none;border:0;cursor:pointer;line-height:1;box-shadow:0 6px 14px rgba(7,93,8,.12)}
      .leg-ver-btn:hover{background:#08720b;transform:translateY(-1px)}
      .leg-table-polida tbody tr td{vertical-align:middle}
      .leg-table-polida tbody tr:hover{background:#f7fbf7}
      .leg-ementa-cell{line-height:1.45;color:#324532;max-width:680px}
    `;
    document.head.appendChild(style);
  }

  async function renderSecretarias() {
    try {
      const res = await API.secretarias.listar();
      const items = res.data || [];
      const grid = document.querySelector('.sec-grid');
      if (!grid) return;

      grid.innerHTML = items.map((s) => `
        <div class="sc">
          <div class="sc-bar" style="background:${esc(s.cor || '#2ecc40')}"></div>
          <div class="sc-body">
            <div class="sc-nome">${esc(s.nome)}</div>
            <div class="sc-row">👤 <span><strong>Responsável:</strong> ${esc(s.responsavel || '-')}</span></div>
            <div class="sc-row">📍 <span>${esc(s.endereco || '-')}</span></div>
            <div class="sc-row">☎️ <span>${esc(s.telefone || '-')}</span></div>
            <div class="sc-row">🕒 <span>Seg–Sex · 08h–17h</span></div>
            ${s.descricao ? `<div class="sc-row" style="margin-top:10px">✒️ <span><strong>Competências:</strong> ${esc(s.descricao)}</span></div>` : ''}
          </div>
        </div>
      `).join('') || '<p>Nenhuma secretaria cadastrada.</p>';
    } catch (error) {
      console.error('Erro ao carregar secretarias:', error);
    }
  }

  async function renderLegislacao() {
    try {
      const res = await API.legislacao.listar(true);
      const items = res.data || [];
      const table = findTableByText(['número', 'ementa']) || findTableByText(['instrumentos', 'normativos']);
      const tbody = table?.querySelector('tbody');
      if (!tbody) return;

      ensureLegStyle();
      table.classList.add('leg-table-polida');

      const thead = table.querySelector('thead');
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Número</th>
            <th>Tipo</th>
            <th>Data</th>
            <th>Ementa</th>
            <th>Situação</th>
            <th>Texto</th>
          </tr>
        `;
      }

      tbody.innerHTML = items.map((l) => `
        <tr data-leg-row="${esc(l.id)}">
          <td class="tc mono" style="${numeroStyle(l.tipo)}">${esc(l.numero)}</td>
          <td style="${tipoStyle(l.tipo)}">${esc(l.tipo)}</td>
          <td style="white-space:nowrap;color:#536653">${esc(date(l.data_publicacao))}</td>
          <td class="leg-ementa-cell">${esc(l.ementa)}</td>
          <td style="white-space:nowrap">${situacaoBadge(l.situacao)}</td>
          <td style="white-space:nowrap">
            <button type="button" class="leg-ver-btn" data-leg-view="${esc(l.id)}">📄 Ver Lei</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="6">Nenhum instrumento normativo cadastrado.</td></tr>';
    } catch (error) {
      console.error('Erro ao carregar legislação:', error);
    }
  }

  async function renderDiarias() {
    try {
      const res = await API.diarias.listar(true);
      const items = res.data || [];
      const table = findTableByText(['beneficiário', 'destino']) || findTableByText(['diárias', 'valor total']);
      const tbody = table?.querySelector('tbody');
      if (!tbody) return;

      tbody.innerHTML = items.map((d) => `
        <tr>
          <td class="tc">${esc(d.beneficiario)}</td>
          <td>${esc(d.cargo || '')}</td>
          <td>${esc(d.destino || '')}</td>
          <td>${esc(d.atividade || '')}</td>
          <td>${esc(d.periodo || '')}</td>
          <td>${esc(d.quantidade || '')}</td>
          <td class="tc">${money(d.valor_total)}</td>
          <td>${esc(d.base_legal || '')}</td>
        </tr>
      `).join('') || '<tr><td colspan="8">Nenhuma diária cadastrada.</td></tr>';
    } catch (error) {
      console.error('Erro ao carregar diárias:', error);
    }
  }

  async function renderEmendas() {
    try {
      const res = await API.emendas.listar(true);
      const items = res.data || [];
      const table = findTableByText(['parlamentar', 'finalidade']) || findTableByText(['emendas', 'valor']);
      const tbody = table?.querySelector('tbody');
      if (!tbody) return;

      tbody.innerHTML = items.map((e) => `
        <tr>
          <td class="tc">${esc(e.parlamentar)}</td>
          <td>${esc(e.esfera || '')}</td>
          <td>${esc(e.finalidade)}</td>
          <td class="tc">${money(e.valor)}</td>
          <td><span class="sp sp-info">${esc(e.status_execucao || 'Aguardando')}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="5">Nenhuma emenda cadastrada.</td></tr>';

      const total = items.reduce((sum, item) => sum + Number(item.valor || 0), 0);
      Array.from(document.querySelectorAll('.tc, .sc-num, .stnum, .card, .ih-title, .dtlbl')).forEach((el) => {
        if (/R\$\s*2|emendas/i.test(el.textContent) && el.textContent.includes('R$')) {
          el.textContent = money(total);
        }
      });
    } catch (error) {
      console.error('Erro ao carregar emendas:', error);
    }
  }

  function normalizeHash(hash) {
    return String(hash || '').replace('#', '').replace('/', '').trim().toLowerCase();
  }

  function activatePageByHash() {
    const hash = normalizeHash(location.hash || 'inicio');
    const aliases = {
      'home': 'inicio',
      'noticias': 'inicio',
      'transparencia': 'transparencia',
      'licitacoes': 'licitacoes',
      'prefeitura': 'prefeitura',
      'a-prefeitura': 'prefeitura',
      'emendas': 'emendas',
      'legislacao': 'legislacao',
      'obras': 'obras',
      'diarias': 'diarias',
      'ouvidoria': 'ouvidoria',
      'sic': 'ouvidoria',
      'ouvidoria-sic': 'ouvidoria'
    };
    const target = aliases[hash] || hash || 'inicio';

    const pages = Array.from(document.querySelectorAll('.pg'));
    let page = document.getElementById(target) || document.querySelector(`[data-page="${target}"]`);
    if (!page) page = pages.find((p) => p.id && p.id.toLowerCase() === target);
    if (!page) return;

    pages.forEach((p) => p.classList.remove('act'));
    page.classList.add('act');

    document.querySelectorAll('.mnl a').forEach((a) => {
      const href = normalizeHash(a.getAttribute('href') || '');
      const txt = a.textContent.toLowerCase();
      const active = href === target || txt.includes(target.replace('-', ' '));
      a.classList.toggle('act', active);
    });

    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 20);
  }

  function bindPortalRouting() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"], a[href^="/#"]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (!href.includes('#')) return;

      const hash = href.split('#')[1];
      if (!hash) return;

      if (location.pathname !== '/' && !location.pathname.endsWith('/index.html')) return;
      event.preventDefault();
      location.hash = hash;
      activatePageByHash();
    });

    window.addEventListener('hashchange', activatePageByHash);
  }

  async function init() {
    bindPortalRouting();
    await Promise.allSettled([
      renderSecretarias(),
      renderLegislacao(),
      renderDiarias(),
      renderEmendas()
    ]);
    activatePageByHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
