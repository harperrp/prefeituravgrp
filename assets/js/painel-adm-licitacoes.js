// Integração do módulo Licitações e Contratos do painel original.
// Mantém a janela original e conecta criar, editar, status e edital PDF à API real.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.licitacoes) return;

  const state = { items: [], editingId: 0, editingDocumento: '' };

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = (value) => {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  };
  const dateInput = (value) => {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toISOString().slice(0, 10);
  };

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

  function visible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0;
  }

  function findLicModal() {
    const modals = Array.from(document.querySelectorAll('.mo, .modal, [role="dialog"]'));
    return modals.find((modal) => {
      const t = norm(modal.textContent);
      return visible(modal) && t.includes('processo licitatorio');
    }) || modals.find((modal) => norm(modal.textContent).includes('processo licitatorio'));
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

  async function uploadEdital(modal) {
    const file = Array.from(modal.querySelectorAll('input[type="file"]'))[0];
    if (file?.files?.[0]) {
      const up = await API.upload(file.files[0], 'licitacoes');
      return up.url;
    }
    return state.editingDocumento || '';
  }

  function getData(modal) {
    const processo = findField(modal, ['numero do processo', 'processo']);
    const modalidade = findField(modal, ['modalidade'], 'select, input');
    const objeto = findField(modal, ['objeto'], 'textarea, input');
    const valor = findField(modal, ['valor estimado', 'valor'], 'input');
    const abertura = findField(modal, ['data de abertura', 'abertura', 'data'], 'input');
    const justificativa = findField(modal, ['justificativa'], 'textarea, input');
    const status = findField(modal, ['status inicial', 'status'], 'select, input');

    return {
      id: state.editingId || undefined,
      processo: processo?.value || '',
      modalidade: modalidade?.value || '',
      objeto: objeto?.value || '',
      valor: valor?.value || '',
      abertura: abertura?.value || '',
      justificativa: justificativa?.value || '',
      status: normalizeStatus(status?.value || 'aberto'),
      documento: '',
    };
  }

  function normalizeStatus(value) {
    const v = norm(value).replace(/\s+/g, '_');
    if (v.includes('andamento') || v.includes('processo') || v.includes('julgamento')) return 'em_andamento';
    if (v.includes('homolog')) return 'homologado';
    if (v.includes('encerr') || v.includes('conclu')) return 'encerrado';
    if (v.includes('cancel')) return 'cancelado';
    return 'aberto';
  }

  function statusLabel(status) {
    return ({ aberto: 'Aberto', em_andamento: 'Em andamento', homologado: 'Homologado', encerrado: 'Encerrado', cancelado: 'Cancelado' }[status] || status || 'Aberto');
  }

  function statusClass(status) {
    if (status === 'homologado' || status === 'encerrado') return 'sp-ok';
    if (status === 'em_andamento') return 'sp-pend';
    if (status === 'cancelado') return 'sp-err';
    return 'sp-info';
  }

  async function saveFromModal() {
    const modal = findLicModal();
    if (!modal) return false;

    try {
      const data = getData(modal);
      if (!data.processo.trim()) {
        toast('Informe o número do processo.', 'err');
        return true;
      }
      if (!data.objeto.trim()) {
        toast('Informe o objeto da licitação.', 'err');
        return true;
      }

      data.documento = await uploadEdital(modal);
      await API.licitacoes.salvar(data);
      toast(state.editingId ? 'Processo atualizado com sucesso.' : 'Processo licitatório publicado com sucesso.');
      state.editingId = 0;
      state.editingDocumento = '';
      await renderPainelList();

      const close = modal.querySelector('.md-x, .close, [data-close]');
      if (close) close.click();
      else modal.classList.remove('open');
      return true;
    } catch (error) {
      toast(error.message || 'Erro ao salvar processo licitatório.', 'err');
      return true;
    }
  }

  function findLicTableBody() {
    const tables = Array.from(document.querySelectorAll('table'));
    const table = tables.find((t) => /processos 2025|n.? processo|objeto|modalidade|valor est/i.test(t.textContent));
    return table?.querySelector('tbody') || null;
  }

  function findNewProcessButton() {
    return Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find((btn) => norm(btn.textContent).includes('novo processo'));
  }

  function openEditModal(item) {
    state.editingId = Number(item.id || 0);
    state.editingDocumento = item.documento || '';
    const btn = findNewProcessButton();
    if (btn) btn.click();
    setTimeout(() => fillModal(item), 250);
  }

  function fillModal(item) {
    const modal = findLicModal();
    if (!modal) return;
    const title = modal.querySelector('h1,h2,h3,.md-title,.modal-title');
    if (title && norm(title.textContent).includes('novo')) title.textContent = 'EDITAR PROCESSO LICITATÓRIO';

    setField(modal, ['numero do processo', 'processo'], item.processo || '');
    setField(modal, ['modalidade'], item.modalidade || '', 'select, input');
    setField(modal, ['objeto'], item.objeto || '', 'textarea, input');
    setField(modal, ['valor estimado', 'valor'], item.valor || '', 'input');
    setField(modal, ['data de abertura', 'abertura', 'data'], dateInput(item.abertura), 'input');
    setField(modal, ['justificativa'], item.justificativa || '', 'textarea, input');
    setField(modal, ['status inicial', 'status'], item.status || 'aberto', 'select, input');

    if (item.documento && !modal.querySelector('#editalAtualInfo')) {
      const file = Array.from(modal.querySelectorAll('input[type="file"]'))[0];
      if (file) {
        const info = document.createElement('div');
        info.id = 'editalAtualInfo';
        info.style.cssText = 'font-size:12px;color:#8fbf8f;margin-top:6px;font-weight:700';
        info.innerHTML = `Edital atual: <a href="${esc(item.documento)}" target="_blank" style="color:#2ecc40">abrir PDF</a>. Envie novo arquivo apenas se quiser substituir.`;
        file.insertAdjacentElement('afterend', info);
      }
    }
  }

  async function updateStatus(id, status) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!item) return;
    try {
      await API.licitacoes.salvar({ ...item, status });
      toast('Status atualizado.');
      await renderPainelList();
    } catch (error) {
      toast(error.message || 'Erro ao atualizar status.', 'err');
    }
  }

  async function renderPainelList() {
    try {
      const res = await API.licitacoes.listar();
      state.items = res.data || [];
      const tbody = findLicTableBody();
      if (!tbody) return;

      tbody.innerHTML = state.items.map((l) => `
        <tr data-api-licitacao-id="${esc(l.id)}">
          <td class="tc mono">${esc(l.processo)}</td>
          <td>${esc(l.objeto)}</td>
          <td>${esc(l.modalidade || '')}</td>
          <td>${money(l.valor)}</td>
          <td>${esc(date(l.abertura))}</td>
          <td><span class="sp ${statusClass(l.status)}">${esc(statusLabel(l.status))}</span></td>
          <td>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              ${l.documento ? `<a class="btn btn-sm" href="${esc(l.documento)}" target="_blank">📄 Edital</a>` : ''}
              <button class="btn btn-sm" data-lic-edit="${esc(l.id)}">✏️ Editar</button>
              <select data-lic-status="${esc(l.id)}" style="background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:7px;font-weight:700">
                <option value="aberto" ${l.status === 'aberto' ? 'selected' : ''}>Aberto</option>
                <option value="em_andamento" ${l.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
                <option value="homologado" ${l.status === 'homologado' ? 'selected' : ''}>Homologado</option>
                <option value="encerrado" ${l.status === 'encerrado' ? 'selected' : ''}>Encerrado</option>
                <option value="cancelado" ${l.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
            </div>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="7">Nenhum processo licitatório cadastrado.</td></tr>';
    } catch (error) {
      console.warn('Erro ao carregar licitações no painel:', error);
    }
  }

  function bindModalSave() {
    document.addEventListener('click', async (event) => {
      const btn = event.target.closest('button, .btn, [role="button"]');
      if (!btn) return;

      const editId = btn.getAttribute('data-lic-edit');
      if (editId) {
        event.preventDefault();
        event.stopPropagation();
        const item = state.items.find((x) => Number(x.id) === Number(editId));
        if (item) openEditModal(item);
        return;
      }

      const text = norm(btn.textContent);
      const modal = findLicModal();
      if (!modal || !modal.contains(btn)) return;

      if (text.includes('publicar') || text.includes('salvar')) {
        event.preventDefault();
        event.stopPropagation();
        await saveFromModal();
      }
    }, true);

    document.addEventListener('change', async (event) => {
      const sel = event.target.closest('select[data-lic-status]');
      if (!sel) return;
      await updateStatus(sel.getAttribute('data-lic-status'), sel.value);
    }, true);

    document.addEventListener('click', (event) => {
      const btn = event.target.closest('button, .btn, [role="button"]');
      if (btn && norm(btn.textContent).includes('novo processo')) {
        state.editingId = 0;
        state.editingDocumento = '';
      }
    }, true);
  }

  function init() {
    bindModalSave();
    renderPainelList();
    window.addEventListener('painel-auth-ok', renderPainelList);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
