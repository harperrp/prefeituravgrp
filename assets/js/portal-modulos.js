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
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  };

  function findPageByText(words) {
    const pages = Array.from(document.querySelectorAll('.pg'));
    return pages.find((page) => words.every((w) => page.textContent.toLowerCase().includes(w.toLowerCase())));
  }

  function findTableByText(words) {
    const tables = Array.from(document.querySelectorAll('table'));
    return tables.find((table) => words.every((w) => table.textContent.toLowerCase().includes(w.toLowerCase())));
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

      tbody.innerHTML = items.map((l) => `
        <tr>
          <td class="tc mono">${esc(l.numero)}</td>
          <td><strong>${esc(l.tipo)}</strong></td>
          <td>${esc(date(l.data_publicacao))}</td>
          <td>${esc(l.ementa)}</td>
          <td><span class="sp sp-ok">${esc(l.situacao || 'vigente')}</span></td>
          <td>${l.arquivo ? `<a class="btn btn-sm" href="${esc(l.arquivo)}" target="_blank">Ver Lei</a>` : '<span class="sp sp-info">Texto</span>'}</td>
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

    const navLinks = Array.from(document.querySelectorAll('.mnl a, .tbn a, .hchip, .mod, .st'));
    const pages = Array.from(document.querySelectorAll('.pg'));

    let page = document.getElementById(target) || document.querySelector(`[data-page="${target}"]`);
    if (!page) {
      page = pages.find((p) => p.id && p.id.toLowerCase() === target);
    }
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
