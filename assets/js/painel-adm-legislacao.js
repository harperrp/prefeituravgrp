// Integração do módulo Legislação Municipal do painel original.
// Mantém o modal original e conecta cadastro, edição, PDF/texto, situação e arquivamento à API real.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.legislacao) return;

  const state = { items: [], editingId: 0, editingArquivo: '' };
  const tipos = ['Lei Ordinária', 'Lei Complementar', 'Decreto', 'Portaria', 'Resolução'];
  const situacoes = ['Vigente', 'Revogada', 'Alterada'];

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const date = (value) => {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  };
  const dateInput = (value) => {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toISOString().slice(0, 10);
  };

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
      el.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:99999;max-width:380px;padding:14px 16px;border-radius:12px;font:700 13px Sora,Arial;background:#111711;color:#e2ebe2;border:1px solid #2a3a2a;box-shadow:0 16px 50px rgba(0,0,0,.45);display:none';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.borderColor = type === 'err' ? 'rgba(248,81,73,.6)' : 'rgba(46,204,64,.45)';
    el.style.color = type === 'err' ? '#ffb8b8' : '#b8ffc0';
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 4200);
  }

  function isLegPageActive() {
    return Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title'))
      .filter(visible)
      .map((el) => norm(el.textContent))
      .some((t) => t.includes('legislacao municipal') || t.includes('legislação municipal'));
  }

  function findLegModal() {
    return Array.from(document.querySelectorAll('.mo, .modal, [role="dialog"]')).find((modal) => {
      const t = norm(modal.textContent);
      return visible(modal) && (t.includes('instrumento normativo') || t.includes('cadastrar') && (t.includes('lei') || t.includes('legislacao') || t.includes('legislação')));
    });
  }

  function findField(container, labels, selector = 'input, textarea, select') {
    const groups = Array.from(container.querySelectorAll('.fgrp, .field, div'));
    for (const group of groups) {
      const label = group.querySelector('label');
      const labelText = norm(label?.textContent || '');
      if (labels.some((l) => labelText.includes(norm(l)))) {
        const field = group.querySelector(selector);
        if (field) return field;
      }
    }
    return Array.from(container.querySelectorAll(selector)).find((field) => {
      const combined = norm(`${field.name || ''} ${field.id || ''} ${field.placeholder || ''} ${field.getAttribute('aria-label') || ''}`);
      return labels.some((l) => combined.includes(norm(l)));
    });
  }

  function setField(container, labels, value, selector = 'input, textarea, select') {
    const field = findField(container, labels, selector);
    if (!field) return;
    field.value = value ?? '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function ensureSelectOptions(modal) {
    const tipo = findField(modal, ['tipo'], 'select');
    if (tipo) {
      tipo.innerHTML = tipos.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    }
    const situacao = findField(modal, ['situacao', 'situação'], 'select');
    if (situacao) {
      situacao.innerHTML = situacoes.map((v) => `<option value="${norm(v).replace('ç','c')}">${esc(v)}</option>`).join('');
    }
  }

  async function uploadArquivo(modal) {
    const file = Array.from(modal.querySelectorAll('input[type="file"]'))[0];
    if (file?.files?.[0]) {
      const up = await API.upload(file.files[0], 'legislacao');
      return up.url;
    }
    return state.editingArquivo || '';
  }

  function normalizeSituacao(v) {
    v = norm(v);
    if (v.includes('revog')) return 'revogada';
    if (v.includes('alter')) return 'alterada';
    return 'vigente';
  }
  function situacaoLabel(v) { return ({ vigente: 'Vigente', alterada: 'Alterada', revogada: 'Revogada' }[v] || v || 'Vigente'); }
  function statusClass(v) { return v === 'vigente' ? 'sp-ok' : v === 'alterada' ? 'sp-info' : 'sp-err'; }

  function getData(modal) {
    const tipo = findField(modal, ['tipo'], 'select, input')?.value || '';
    const numero = findField(modal, ['numero', 'número', 'ano'], 'input')?.value || '';
    const situacao = normalizeSituacao(findField(modal, ['situacao', 'situação'], 'select, input')?.value || 'vigente');
    const vinculacoes = findField(modal, ['vinculacoes', 'vinculações'], 'input, textarea')?.value || '';
    const texto = findField(modal, ['texto da lei', 'editor', 'texto'], 'textarea, input')?.value || '';
    const ementa = findField(modal, ['ementa', 'descricao', 'descrição'], 'textarea, input')?.value || texto.slice(0, 220) || 'Instrumento normativo municipal.';
    const data = findField(modal, ['data', 'publicacao', 'publicação'], 'input')?.value || new Date().toISOString().slice(0, 10);
    return { id: state.editingId || undefined, numero, tipo, data_publicacao: data, ementa, situacao, vinculacoes, texto, arquivo: '', status: 'publicado' };
  }

  async function saveFromModal() {
    const modal = findLegModal();
    if (!modal) return false;
    try {
      const data = getData(modal);
      if (!data.tipo.trim()) return toast('Selecione o tipo.', 'err'), true;
      if (!data.numero.trim()) return toast('Informe o número/ano.', 'err'), true;
      if (!data.ementa.trim() && !data.texto.trim()) return toast('Informe o texto ou ementa da lei.', 'err'), true;
      data.arquivo = await uploadArquivo(modal);
      await API.legislacao.salvar(data);
      toast(state.editingId ? 'Legislação atualizada com sucesso.' : 'Legislação cadastrada com sucesso.');
      state.editingId = 0;
      state.editingArquivo = '';
      await renderPainelList(true);
      const close = modal.querySelector('.md-x, .close, [data-close]');
      if (close) close.click(); else modal.classList.remove('open');
      return true;
    } catch (e) {
      toast(e.message || 'Erro ao salvar legislação.', 'err');
      return true;
    }
  }

  function findLegTableBody() {
    if (!isLegPageActive()) return null;
    const table = Array.from(document.querySelectorAll('table')).filter(visible).find((t) => {
      const tx = norm(t.textContent);
      return (tx.includes('numero') || tx.includes('número')) && tx.includes('ementa');
    });
    return table?.querySelector('tbody') || null;
  }

  function findNewButton() {
    if (!isLegPageActive()) return null;
    return Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find((btn) => {
      const t = norm(btn.textContent);
      return t.includes('novo') || t.includes('cadastrar');
    });
  }

  function openEditModal(item) {
    state.editingId = Number(item.id || 0);
    state.editingArquivo = item.arquivo || '';
    const btn = findNewButton();
    if (btn) btn.click();
    setTimeout(() => fillModal(item), 250);
  }

  function fillModal(item) {
    const modal = findLegModal();
    if (!modal) return;
    ensureSelectOptions(modal);
    const title = modal.querySelector('h1,h2,h3,.md-title,.modal-title');
    if (title) title.textContent = 'EDITAR INSTRUMENTO NORMATIVO';
    setField(modal, ['tipo'], item.tipo || '', 'select, input');
    setField(modal, ['numero', 'número', 'ano'], item.numero || '', 'input');
    setField(modal, ['situacao', 'situação'], item.situacao || 'vigente', 'select, input');
    setField(modal, ['data', 'publicacao', 'publicação'], dateInput(item.data_publicacao), 'input');
    setField(modal, ['vinculacoes', 'vinculações'], item.vinculacoes || '', 'input, textarea');
    setField(modal, ['ementa', 'descricao', 'descrição'], item.ementa || '', 'textarea, input');
    setField(modal, ['texto da lei', 'editor', 'texto'], item.texto || item.ementa || '', 'textarea, input');
  }

  async function updateSituacao(id, situacao) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!item) return;
    await API.legislacao.salvar({ ...item, situacao });
    toast('Situação atualizada.');
    await renderPainelList(true);
  }

  async function deleteLeg(id) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!confirm(`Arquivar ${item?.numero || id}?\n\nEla sairá do site público.`)) return;
    await API.legislacao.excluir(id);
    toast('Legislação arquivada.');
    await renderPainelList(true);
  }

  async function renderPainelList(force = false) {
    if (!force && !isLegPageActive()) return;
    const tbody = findLegTableBody();
    if (!tbody) return;
    try {
      const res = await API.legislacao.listar(false);
      state.items = res.data || [];
      tbody.innerHTML = state.items.map((l) => `
        <tr data-api-leg-id="${esc(l.id)}">
          <td class="tc mono">${esc(l.numero)}</td>
          <td><strong>${esc(l.tipo)}</strong></td>
          <td>${esc(date(l.data_publicacao))}</td>
          <td>${esc(l.ementa)}</td>
          <td><span class="sp ${statusClass(l.situacao)}">${esc(situacaoLabel(l.situacao))}</span></td>
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
        </tr>`).join('') || '<tr><td colspan="6">Nenhum instrumento normativo cadastrado.</td></tr>';
    } catch (e) { console.warn('Erro ao carregar legislação:', e); }
  }

  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('button, .btn, [role="button"], a');
    if (!btn) return;
    setTimeout(() => { const m = findLegModal(); if (m) ensureSelectOptions(m); renderPainelList(false); }, 300);
    const editId = btn.getAttribute('data-leg-edit');
    if (editId) { event.preventDefault(); event.stopPropagation(); const item = state.items.find((x) => Number(x.id) === Number(editId)); if (item) openEditModal(item); return; }
    const delId = btn.getAttribute('data-leg-delete');
    if (delId) { event.preventDefault(); event.stopPropagation(); await deleteLeg(delId); return; }
    const modal = findLegModal();
    const text = norm(btn.textContent);
    if (modal && modal.contains(btn) && (text.includes('cadastrar') || text.includes('publicar') || text.includes('salvar'))) { event.preventDefault(); event.stopPropagation(); await saveFromModal(); }
    if (text.includes('novo') || text.includes('cadastrar')) { state.editingId = 0; state.editingArquivo = ''; }
  }, true);

  document.addEventListener('change', async (event) => {
    if (!isLegPageActive()) return;
    const situacao = event.target.closest('select[data-leg-situacao]');
    if (situacao) await updateSituacao(situacao.getAttribute('data-leg-situacao'), situacao.value);
  }, true);

  function init() {
    setTimeout(() => renderPainelList(false), 300);
    window.addEventListener('painel-auth-ok', () => renderPainelList(false));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
