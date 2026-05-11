// Correção geral de atualização automática do Painel ADM.
// Evita o "cache fantasma": Diárias, Obras e Legislação passam a carregar do banco
// ao entrar na aba, sem precisar clicar em Nova Diária/Nova Obra/Cadastrar.

(function () {
  const API = window.PrefeituraAPI;
  if (!API) return;

  const state = {
    timer: null,
    rendering: false,
    lastKey: {},
  };

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function visible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0 && r.width > 0 && r.height > 0;
  }

  function visibleTitle() {
    return Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title'))
      .filter(visible)
      .map((el) => norm(el.textContent))
      .join(' | ');
  }

  function currentModule() {
    const title = visibleTitle();
    if (title.includes('diarias de viagem') || title.includes('diárias de viagem')) return 'diarias';
    if (title.includes('obras publicas') || title.includes('obras públicas')) return 'obras';
    if (title.includes('legislacao municipal') || title.includes('legislação municipal')) return 'legislacao';
    return '';
  }

  function findVisibleTableBody(requiredWords) {
    const tables = Array.from(document.querySelectorAll('table')).filter(visible);
    const table = tables.find((t) => {
      const tx = norm(t.textContent);
      return requiredWords.every((w) => tx.includes(norm(w)));
    });
    return table?.querySelector('tbody') || null;
  }

  function statusDiariaLabel(status) {
    return ({ publicado: 'Publicado', rascunho: 'Revisão', arquivado: 'Arquivado' }[status] || status || 'Publicado');
  }
  function statusDiariaClass(status) {
    if (status === 'publicado') return 'sp-ok';
    if (status === 'rascunho') return 'sp-pend';
    return 'sp-err';
  }

  function statusObraLabel(status) {
    return ({ planejada: 'Planejada', em_andamento: 'Em andamento', concluida: 'Concluída', paralisada: 'Paralisada' }[status] || status || 'Em andamento');
  }
  function statusObraClass(status) {
    if (status === 'concluida') return 'sp-ok';
    if (status === 'paralisada') return 'sp-err';
    if (status === 'planejada') return 'sp-info';
    return 'sp-pend';
  }

  function statusLegLabel(status) {
    return ({ vigente: 'Vigente', alterada: 'Alterada', revogada: 'Revogada' }[status] || status || 'Vigente');
  }
  function statusLegClass(status) {
    if (status === 'vigente') return 'sp-ok';
    if (status === 'alterada') return 'sp-info';
    return 'sp-err';
  }

  function mesAno(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
  }

  function dateBR(value) {
    if (!value) return '';
    const raw = String(value).slice(0, 10);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  }

  async function renderDiarias() {
    if (!API.diarias) return;
    const tbody = findVisibleTableBody(['beneficiario', 'cargo', 'destino', 'valor total']) ||
                  findVisibleTableBody(['beneficiário', 'cargo', 'destino', 'valor total']);
    if (!tbody) return;

    const res = await API.diarias.listar(false);
    const items = res.data || [];
    const key = JSON.stringify(items.map((d) => [d.id, d.beneficiario, d.status, d.valor_total, d.periodo]));
    if (state.lastKey.diarias === key && tbody.querySelector('[data-api-diaria-id]')) return;
    state.lastKey.diarias = key;

    tbody.innerHTML = items.map((d) => `
      <tr data-api-diaria-id="${esc(d.id)}">
        <td><strong>${esc(d.beneficiario)}</strong></td>
        <td>${esc(d.cargo || '')}</td>
        <td>${esc(d.destino || '')}</td>
        <td>${esc(d.periodo || '')}</td>
        <td>${esc(d.quantidade || '')}</td>
        <td>${money(d.valor_total)}</td>
        <td><span class="sp ${statusDiariaClass(d.status)}">${esc(statusDiariaLabel(d.status))}</span></td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-sm" data-diaria-edit="${esc(d.id)}">✏️ Editar</button>
            <select data-diaria-status="${esc(d.id)}" style="background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:7px;font-weight:700">
              <option value="publicado" ${d.status === 'publicado' ? 'selected' : ''}>Publicado</option>
              <option value="rascunho" ${d.status === 'rascunho' ? 'selected' : ''}>Revisão</option>
              <option value="arquivado" ${d.status === 'arquivado' ? 'selected' : ''}>Arquivado</option>
            </select>
            <button class="btn btn-sm" data-diaria-delete="${esc(d.id)}" style="background:rgba(248,81,73,.14);color:#ffb8b8;border:1px solid rgba(248,81,73,.35);border-radius:7px;padding:7px 10px;font-weight:800;cursor:pointer">🗑 Excluir</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8">Nenhuma diária cadastrada.</td></tr>';
  }

  async function renderObras() {
    if (!API.obras) return;
    const tbody = findVisibleTableBody(['obra', 'secretaria', 'progresso', 'status']);
    if (!tbody) return;

    const res = await API.obras.listar();
    const items = res.data || [];
    const key = JSON.stringify(items.map((o) => [o.id, o.nome, o.status, o.progresso, o.valor]));
    if (state.lastKey.obras === key && tbody.querySelector('[data-api-obra-id]')) return;
    state.lastKey.obras = key;

    tbody.innerHTML = items.map((o) => {
      const progresso = Math.max(0, Math.min(100, Number(o.progresso || 0)));
      return `
        <tr data-api-obra-id="${esc(o.id)}">
          <td><strong>${esc(o.nome)}</strong><br><small>${esc(o.localizacao || o.descricao || '')}</small></td>
          <td>${esc(o.secretaria || '')}</td>
          <td>${money(o.valor)}</td>
          <td>${esc(mesAno(o.inicio))}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;min-width:150px">
              <div style="height:4px;background:#1d2b1d;border-radius:10px;flex:1;overflow:hidden"><div style="height:100%;width:${progresso}%;background:${progresso >= 100 ? '#2ecc40' : progresso > 60 ? '#f5c518' : '#388bfd'}"></div></div>
              <input data-obra-progresso="${esc(o.id)}" type="number" min="0" max="100" value="${progresso}" style="width:58px;background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:6px;font-weight:700">%
            </div>
          </td>
          <td><span class="sp ${statusObraClass(o.status)}">${esc(statusObraLabel(o.status))}</span></td>
          <td>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              ${o.imagem ? `<a class="btn btn-sm" href="${esc(o.imagem)}" target="_blank">🖼 Imagem</a>` : ''}
              <button class="btn btn-sm" data-obra-edit="${esc(o.id)}">✏️</button>
              <select data-obra-status="${esc(o.id)}" style="background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:7px;font-weight:700">
                <option value="planejada" ${o.status === 'planejada' ? 'selected' : ''}>Planejada</option>
                <option value="em_andamento" ${o.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
                <option value="concluida" ${o.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                <option value="paralisada" ${o.status === 'paralisada' ? 'selected' : ''}>Paralisada</option>
              </select>
              <button class="btn btn-sm" data-obra-delete="${esc(o.id)}" style="background:rgba(248,81,73,.14);color:#ffb8b8;border:1px solid rgba(248,81,73,.35);border-radius:7px;padding:7px 10px;font-weight:800;cursor:pointer">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('') || '<tr><td colspan="7">Nenhuma obra cadastrada.</td></tr>';
  }

  async function renderLegislacao() {
    if (!API.legislacao) return;
    const tbody = findVisibleTableBody(['numero', 'ementa']) || findVisibleTableBody(['número', 'ementa']);
    if (!tbody) return;

    const res = await API.legislacao.listar(false);
    const items = res.data || [];
    const key = JSON.stringify(items.map((l) => [l.id, l.numero, l.tipo, l.situacao, l.status]));
    if (state.lastKey.legislacao === key && tbody.querySelector('[data-api-leg-id]')) return;
    state.lastKey.legislacao = key;

    tbody.innerHTML = items.map((l) => `
      <tr data-api-leg-id="${esc(l.id)}">
        <td class="tc mono">${esc(l.numero)}</td>
        <td><strong>${esc(l.tipo)}</strong></td>
        <td>${esc(dateBR(l.data_publicacao))}</td>
        <td>${esc(l.ementa)}</td>
        <td><span class="sp ${statusLegClass(l.situacao)}">${esc(statusLegLabel(l.situacao))}</span></td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${l.arquivo ? `<a class="btn btn-sm" href="${esc(l.arquivo)}" target="_blank">📄 PDF</a>` : ''}
            <button class="btn btn-sm" data-leg-edit="${esc(l.id)}">✏️ Editar</button>
            <select data-leg-situacao="${esc(l.id)}" style="background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:7px;font-weight:700">
              <option value="vigente" ${l.situacao === 'vigente' ? 'selected' : ''}>Vigente</option>
              <option value="alterada" ${l.situacao === 'alterada' ? 'selected' : ''}>Alterada</option>
              <option value="revogada" ${l.situacao === 'revogada' ? 'selected' : ''}>Revogada</option>
            </select>
            <button class="btn btn-sm" data-leg-delete="${esc(l.id)}" style="background:rgba(248,81,73,.14);color:#ffb8b8;border:1px solid rgba(248,81,73,.35);border-radius:7px;padding:7px 10px;font-weight:800;cursor:pointer">🗑 Arquivar</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6">Nenhum instrumento normativo cadastrado.</td></tr>';
  }

  async function refreshNow() {
    if (state.rendering) return;
    const module = currentModule();
    if (!module) return;

    state.rendering = true;
    try {
      if (module === 'diarias') await renderDiarias();
      if (module === 'obras') await renderObras();
      if (module === 'legislacao') await renderLegislacao();
    } catch (error) {
      console.warn('Auto refresh do painel falhou:', error);
    } finally {
      state.rendering = false;
    }
  }

  function scheduleRefresh(delay = 450) {
    clearTimeout(state.timer);
    state.timer = setTimeout(refreshNow, delay);
  }

  function bind() {
    document.addEventListener('click', () => {
      scheduleRefresh(250);
      setTimeout(refreshNow, 900);
      setTimeout(refreshNow, 1600);
    }, true);

    document.addEventListener('change', () => {
      setTimeout(refreshNow, 700);
      setTimeout(refreshNow, 1400);
    }, true);

    const observer = new MutationObserver(() => {
      if (state.rendering) return;
      scheduleRefresh(350);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

    window.addEventListener('painel-auth-ok', () => scheduleRefresh(300));
    window.addEventListener('focus', () => scheduleRefresh(300));

    setTimeout(refreshNow, 400);
    setTimeout(refreshNow, 1200);
    setTimeout(refreshNow, 2400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
