// Integração do módulo Diárias de Viagem do painel original.
// Conecta Registrar Diária ao banco real, mantendo o layout original.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.diarias) return;

  const state = { items: [], editingId: 0 };

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function visible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0 && rect.width > 0 && rect.height > 0;
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

  function isDiariasPageActive() {
    const titles = Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title'))
      .filter(visible)
      .map((el) => norm(el.textContent));
    return titles.some((t) => t.includes('diarias de viagem') || t.includes('diárias de viagem'));
  }

  function findDiariaModal() {
    return Array.from(document.querySelectorAll('.mo, .modal, [role="dialog"]')).find((modal) => {
      const t = norm(modal.textContent);
      return visible(modal) && (t.includes('registrar diaria') || t.includes('registrar diária') || t.includes('diaria de viagem') || t.includes('diária de viagem'));
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

  function statusLabel(status) {
    return ({ publicado: 'Publicado', rascunho: 'Revisão', arquivado: 'Arquivado' }[status] || status || 'Publicado');
  }

  function statusClass(status) {
    if (status === 'publicado') return 'sp-ok';
    if (status === 'rascunho') return 'sp-pend';
    return 'sp-err';
  }

  function formatPeriodo(dataInicio, dataRetorno, fallback) {
    if (dataInicio || dataRetorno) {
      const fmt = (v) => {
        if (!v) return '';
        const d = new Date(String(v).replace(' ', 'T'));
        return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };
      return [fmt(dataInicio), fmt(dataRetorno)].filter(Boolean).join(' - ');
    }
    return fallback || '';
  }

  function splitPeriodo(periodo) {
    const parts = String(periodo || '').split(/\s*-\s*/);
    return { inicio: parts[0] || '', retorno: parts[1] || '' };
  }

  function getData(modal) {
    const inicio = findField(modal, ['data de inicio', 'data de início', 'inicio', 'início'], 'input')?.value || '';
    const retorno = findField(modal, ['data de retorno', 'retorno'], 'input')?.value || '';
    const quantidade = findField(modal, ['n de diarias', 'nº de diarias', 'n diarias', 'diarias'], 'input')?.value || 1;
    const valorTotal = findField(modal, ['valor total'], 'input')?.value || '';
    const valorDiaria = findField(modal, ['valor da diaria', 'valor da diária'], 'input')?.value || '';

    return {
      id: state.editingId || undefined,
      beneficiario: findField(modal, ['nome do beneficiario', 'nome do beneficiário', 'beneficiario', 'beneficiário'])?.value || '',
      cargo: findField(modal, ['cargo'])?.value || '',
      destino: findField(modal, ['destino'])?.value || '',
      atividade: findField(modal, ['atividade'], 'textarea, input')?.value || '',
      periodo: formatPeriodo(inicio, retorno, ''),
      quantidade,
      valor_total: valorTotal || (Number(String(valorDiaria).replace(',', '.')) * Number(quantidade || 0)),
      base_legal: findField(modal, ['base legal'])?.value || '',
      status: 'publicado'
    };
  }

  async function saveFromModal() {
    const modal = findDiariaModal();
    if (!modal) return false;

    try {
      const data = getData(modal);
      if (!data.beneficiario.trim()) {
        toast('Informe o nome do beneficiário.', 'err');
        return true;
      }
      if (!data.cargo.trim()) {
        toast('Informe o cargo do beneficiário.', 'err');
        return true;
      }
      if (!data.destino.trim()) {
        toast('Informe o destino da diária.', 'err');
        return true;
      }
      if (!data.atividade.trim()) {
        toast('Informe a atividade.', 'err');
        return true;
      }

      await API.diarias.salvar(data);
      toast(state.editingId ? 'Diária atualizada com sucesso.' : 'Diária publicada com sucesso.');
      state.editingId = 0;
      await renderPainelList(true);

      const close = modal.querySelector('.md-x, .close, [data-close]');
      if (close) close.click();
      else modal.classList.remove('open');
      return true;
    } catch (error) {
      toast(error.message || 'Erro ao salvar diária.', 'err');
      return true;
    }
  }

  function findDiariasTableBody() {
    if (!isDiariasPageActive()) return null;
    const table = Array.from(document.querySelectorAll('table')).filter(visible).find((t) => {
      const tx = norm(t.textContent);
      return tx.includes('beneficiario') && tx.includes('cargo') && tx.includes('destino') && tx.includes('valor total');
    });
    return table?.querySelector('tbody') || null;
  }

  function findNewButton() {
    if (!isDiariasPageActive()) return null;
    return Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find((btn) => {
      const t = norm(btn.textContent);
      return t.includes('nova diaria') || t.includes('nova diária') || t.includes('registrar diaria') || t.includes('registrar diária');
    });
  }

  function openEditModal(item) {
    state.editingId = Number(item.id || 0);
    const btn = findNewButton();
    if (btn) btn.click();
    setTimeout(() => fillModal(item), 250);
  }

  function fillModal(item) {
    const modal = findDiariaModal();
    if (!modal) return;
    const title = modal.querySelector('h1,h2,h3,.md-title,.modal-title');
    if (title) title.textContent = 'EDITAR DIÁRIA DE VIAGEM';

    const periodo = splitPeriodo(item.periodo);
    setField(modal, ['nome do beneficiario', 'nome do beneficiário', 'beneficiario', 'beneficiário'], item.beneficiario || '');
    setField(modal, ['cargo'], item.cargo || '');
    setField(modal, ['destino'], item.destino || '');
    setField(modal, ['atividade'], item.atividade || '', 'textarea, input');
    setField(modal, ['data de inicio', 'data de início', 'inicio', 'início'], periodo.inicio, 'input');
    setField(modal, ['data de retorno', 'retorno'], periodo.retorno, 'input');
    setField(modal, ['n de diarias', 'nº de diarias', 'n diarias', 'diarias'], item.quantidade || 1, 'input');
    setField(modal, ['valor total'], item.valor_total || '', 'input');
    setField(modal, ['base legal'], item.base_legal || '', 'input');
  }

  async function updateStatus(id, status) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!item) return;
    try {
      await API.diarias.salvar({ ...item, status });
      toast('Status da diária atualizado.');
      await renderPainelList(true);
    } catch (error) {
      toast(error.message || 'Erro ao atualizar status.', 'err');
    }
  }

  async function deleteDiaria(id) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    const ok = confirm(`Excluir a diária de ${item?.beneficiario || id}?\n\nEla será removida do site público.`);
    if (!ok) return;
    try {
      await API.diarias.excluir(id);
      toast('Diária excluída com sucesso.');
      await renderPainelList(true);
    } catch (error) {
      toast(error.message || 'Erro ao excluir diária.', 'err');
    }
  }

  async function renderPainelList(force = false) {
    if (!force && !isDiariasPageActive()) return;
    const tbody = findDiariasTableBody();
    if (!tbody) return;

    try {
      const res = await API.diarias.listar(false);
      state.items = res.data || [];
      tbody.innerHTML = state.items.map((d) => `
        <tr data-api-diaria-id="${esc(d.id)}">
          <td><strong>${esc(d.beneficiario)}</strong></td>
          <td>${esc(d.cargo || '')}</td>
          <td>${esc(d.destino || '')}</td>
          <td>${esc(d.periodo || '')}</td>
          <td>${esc(d.quantidade || '')}</td>
          <td>${money(d.valor_total)}</td>
          <td><span class="sp ${statusClass(d.status)}">${esc(statusLabel(d.status))}</span></td>
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
    } catch (error) {
      console.warn('Erro ao carregar diárias no painel:', error);
    }
  }

  function bindEvents() {
    document.addEventListener('click', async (event) => {
      const btn = event.target.closest('button, .btn, [role="button"], a');
      if (!btn) return;

      setTimeout(() => renderPainelList(false), 300);
      setTimeout(() => renderPainelList(false), 900);

      const editId = btn.getAttribute('data-diaria-edit');
      if (editId) {
        event.preventDefault();
        event.stopPropagation();
        const item = state.items.find((x) => Number(x.id) === Number(editId));
        if (item) openEditModal(item);
        return;
      }

      const delId = btn.getAttribute('data-diaria-delete');
      if (delId) {
        event.preventDefault();
        event.stopPropagation();
        await deleteDiaria(delId);
        return;
      }

      const modal = findDiariaModal();
      const text = norm(btn.textContent);
      if (modal && modal.contains(btn) && (text.includes('publicar') || text.includes('salvar') || text.includes('registrar'))) {
        event.preventDefault();
        event.stopPropagation();
        await saveFromModal();
      }

      if (text.includes('nova diaria') || text.includes('nova diária') || text.includes('registrar diaria') || text.includes('registrar diária')) {
        state.editingId = 0;
      }
    }, true);

    document.addEventListener('change', async (event) => {
      if (!isDiariasPageActive()) return;
      const status = event.target.closest('select[data-diaria-status]');
      if (status) await updateStatus(status.getAttribute('data-diaria-status'), status.value);
    }, true);
  }

  function init() {
    bindEvents();
    setTimeout(() => renderPainelList(false), 300);
    window.addEventListener('painel-auth-ok', () => renderPainelList(false));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
