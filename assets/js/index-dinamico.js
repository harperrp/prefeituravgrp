// Integração do index.html com o banco de dados.
// Mantém o visual original e troca notícias, obras e licitações por dados vindos da API.

(function () {
  const API = window.PrefeituraAPI;
  if (!API) {
    console.warn('PrefeituraAPI não encontrado. Inclua assets/js/api-client.js antes deste arquivo.');
    return;
  }

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[s]));

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  };

  const money = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });

  function renderNoticias(noticias) {
    const grid = document.querySelector('.ngrid');
    if (!grid || !Array.isArray(noticias) || noticias.length === 0) return;

    const destaque = noticias[0];
    const laterais = noticias.slice(1, 5);
    const imgHtml = destaque.imagem
      ? `<div class="nfimg"><div class="nfthumb" style="background-image:url('${esc(destaque.imagem)}')"></div><div class="ntag">${esc(destaque.categoria || 'Notícia')}</div></div>`
      : '';

    grid.innerHTML = `
      <a class="nfeat" href="#" data-noticia-id="${esc(destaque.id)}">
        ${imgHtml}
        <div class="nbody">
          <div class="ndate">${esc(formatDate(destaque.data_publicacao))} · ${esc(destaque.categoria || 'Institucional')}</div>
          <div class="ntit">${esc(destaque.titulo)}</div>
          <div class="nexc">${esc(destaque.resumo || destaque.conteudo || '')}</div>
        </div>
      </a>
      <div class="nside">
        ${laterais.map((n) => `
          <a class="nsm" href="#" data-noticia-id="${esc(n.id)}">
            <div class="nsmi">📰</div>
            <div class="nsmb">
              <div class="nsmdt">${esc(formatDate(n.data_publicacao))}</div>
              <div class="nsmtt">${esc(n.titulo)}</div>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  function renderObras(obras) {
    const grid = document.querySelector('.obras-grid');
    if (!grid || !Array.isArray(obras)) return;

    grid.innerHTML = obras.slice(0, 12).map((o) => {
      const progresso = Math.max(0, Math.min(100, Number(o.progresso || 0)));
      return `
        <div class="oc">
          <div class="oc-bar" style="background:${progresso >= 100 ? '#2ecc40' : '#f5c518'}"></div>
          <div class="oc-body">
            <div class="oc-header">
              <div class="oc-nome">${esc(o.nome)}</div>
              <span class="sp sp-info">${esc(o.status || 'em andamento')}</span>
            </div>
            <div class="oc-desc">${esc(o.descricao || '')}</div>
            <div class="oc-prog-row"><span class="oc-prog-lbl">Execução</span><span class="oc-prog-val">${progresso}%</span></div>
            <div class="oc-track"><div class="oc-fill" style="width:${progresso}%;background:#2ecc40"></div></div>
            <div class="oc-meta"><span>${esc(o.secretaria || '')}</span><span>${money(o.valor)}</span></div>
          </div>
        </div>
      `;
    }).join('') || '<p>Nenhuma obra cadastrada no momento.</p>';
  }

  function renderLicitacoes(licitacoes) {
    if (!Array.isArray(licitacoes)) return;
    const tables = Array.from(document.querySelectorAll('table'));
    const table = tables.find((t) => /processo|objeto|modalidade/i.test(t.textContent));
    if (!table) return;

    let tbody = table.querySelector('tbody');
    if (!tbody) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }

    tbody.innerHTML = licitacoes.slice(0, 20).map((l) => `
      <tr>
        <td class="tc mono">${esc(l.processo)}</td>
        <td>${esc(l.objeto)}</td>
        <td>${esc(l.modalidade || '')}</td>
        <td>${money(l.valor)}</td>
        <td>${esc(formatDate(l.abertura))}</td>
        <td><span class="sp sp-ok">${esc(l.status || 'aberto')}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="6">Nenhuma licitação cadastrada no momento.</td></tr>';
  }

  function updateCounters(noticias, obras, licitacoes) {
    document.querySelectorAll('.st').forEach((item) => {
      const txt = item.textContent.toLowerCase();
      const num = item.querySelector('.stnum');
      if (!num) return;
      if (txt.includes('not')) num.textContent = noticias.length;
      if (txt.includes('obra')) num.textContent = obras.length;
      if (txt.includes('licita')) num.textContent = licitacoes.length;
    });
  }

  async function loadPortalData() {
    try {
      const [noticiasRes, obrasRes, licitacoesRes] = await Promise.all([
        API.noticias.listar(true, 10),
        API.obras.listar(),
        API.licitacoes.listar(),
      ]);

      const noticias = noticiasRes.data || [];
      const obras = obrasRes.data || [];
      const licitacoes = licitacoesRes.data || [];

      renderNoticias(noticias);
      renderObras(obras);
      renderLicitacoes(licitacoes);
      updateCounters(noticias, obras, licitacoes);
    } catch (error) {
      console.error('Erro ao carregar dados dinâmicos do portal:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPortalData);
  } else {
    loadPortalData();
  }
})();
