// Integração do módulo Obras Públicas do painel original.
// Conecta criar, editar, progresso, status, imagem e excluir à API real.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.obras) return;

  const state = { items: [], editingId: 0, editingImagem: '' };

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

  function findObraModal() {
    const modals = Array.from(document.querySelectorAll('.mo, .modal, [role="dialog"]'));
    return modals.find((modal) => {
      const t = norm(modal.textContent);
      return visible(modal) && (t.includes('nova obra') || t.includes('obra publica') || t.includes('obra pública'));
    }) || modals.find((modal) => {
      const t = norm(modal.textContent);
      return t.includes('obra') && (t.includes('progresso') || t.includes('secretaria') || t.includes('valor'));
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

  function normalizeStatus(value) {
    const v = norm(value).replace(/\s+/g, '_');
    if (v.includes('planej')) return 'planejada';
    if (v.includes('conclu')) return 'concluida';
    if (v.includes('paralis')) return 'paralisada';
    return 'em_andamento';
  }

  function statusLabel(status) {
    return ({ planejada: 'Planejada', em_andamento: 'Em andamento', concluida: 'Concluída', paralisada: 'Paralisada' }[status] || status || 'Em andamento');
  }

  function statusClass(status) {
    if (status === 'concluida') return 'sp-ok';
    if (status === 'paralisada') return 'sp-err';
    if (status === 'planejada') return 'sp-info';
    return 'sp-pend';
  }

  async function uploadImagem(modal) {
    const file = Array.from(modal.querySelectorAll('input[type="file"]'))[0];
    if (file?.files?.[0]) {
      const up = await API.upload(file.files[0], 'obras');
      return up.url;
    }
    return state.editingImagem || '';
  }

  function getData(modal) {
    const nome = findField(modal, ['nome da obra', 'titulo', 'título', 'nome']);
    const secretaria = findField(modal, ['secretaria'], 'select, input');
    const descricao = findField(modal, ['descricao', 'descrição', 'objeto'], 'textarea, input');
    const valor = findField(modal, ['valor'], 'input');
    const inicio = findField(modal, ['inicio', 'início'], 'input');
    const previsao = findField(modal, ['previsao', 'previsão', 'entrega'], 'input');
    const progresso = findField(modal, ['progresso', 'execucao', 'execução'], 'input, select');
    const status = findField(modal, ['status'], 'select, input');
    const localizacao = findField(modal, ['localizacao', 'localização', 'endereco', 'endereço'], 'input, textarea');

    return {
      id: state.editingId || undefined,
      nome: nome?.value || '',
      secretaria: secretaria?.value || '',
      descricao: descricao?.value || '',
      valor: valor?.value || '',
      inicio: inicio?.value || '',
      previsao_entrega: previsao?.value || '',
      progresso: progresso?.value || 0,
      status: normalizeStatus(status?.value || 'em_andamento'),
      localizacao: localizacao?.value || '',
      imagem: '',
    };
  }

  async function saveFromModal() {
    const modal = findObraModal();
    if (!modal) return false;

    try {
      const data = getData(modal);
      if (!data.nome.trim()) {
        toast('Informe o nome da obra.', 'err');
        return true;
      }

      data.imagem = await uploadImagem(modal);
      await API.obras.salvar(data);
      toast(state.editingId ? 'Obra atualizada com sucesso.' : 'Obra cadastrada com sucesso.');
      state.editingId = 0;
      state.editingImagem = '';
      await renderPainelList();

      const close = modal.querySelector('.md-x, .close, [data-close]');
      if (close) close.click();
      else modal.classList.remove('open');
      return true;
    } catch (error) {
      toast(error.message || 'Erro ao salvar obra.', 'err');
      return true;
    }
  }

  function findObrasTableBody() {
    const tables = Array.from(document.querySelectorAll('table'));
    const table = tables.find((t) => /obra|progresso|execu|secretaria/i.test(t.textContent));
    return table?.querySelector('tbody') || null;
  }

  function findNewObraButton() {
    return Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find((btn) => {
      const t = norm(btn.textContent);
      return t.includes('nova obra') || t.includes('adicionar obra') || t.includes('nova');
    });
  }

  function openEditModal(item) {
    state.editingId = Number(item.id || 0);
    state.editingImagem = item.imagem || '';
    const btn = findNewObraButton();
    if (btn) btn.click();
    setTimeout(() => fillModal(item), 250);
  }

  function fillModal(item) {
    const modal = findObraModal();
    if (!modal) return;
    const title = modal.querySelector('h1,h2,h3,.md-title,.modal-title');
    if (title && norm(title.textContent).includes('nova')) title.textContent = 'EDITAR OBRA PÚBLICA';

    setField(modal, ['nome da obra', 'titulo', 'título', 'nome'], item.nome || '');
    setField(modal, ['secretaria'], item.secretaria || '', 'select, input');
    setField(modal, ['descricao', 'descrição', 'objeto'], item.descricao || '', 'textarea, input');
    setField(modal, ['valor'], item.valor || '', 'input');
    setField(modal, ['inicio', 'início'], item.inicio || '', 'input');
    setField(modal, ['previsao', 'previsão', 'entrega'], item.previsao_entrega || '', 'input');
    setField(modal, ['progresso', 'execucao', 'execução'], item.progresso || 0, 'input, select');
    setField(modal, ['status'], item.status || 'em_andamento', 'select, input');
    setField(modal, ['localizacao', 'localização', 'endereco', 'endereço'], item.localizacao || '', 'input, textarea');

    if (item.imagem && !modal.querySelector('#obraImagemAtualInfo')) {
      const file = Array.from(modal.querySelectorAll('input[type="file"]'))[0];
      if (file) {
        const info = document.createElement('div');
        info.id = 'obraImagemAtualInfo';
        info.style.cssText = 'font-size:12px;color:#8fbf8f;margin-top:6px;font-weight:700';
        info.innerHTML = `Imagem atual: <a href="${esc(item.imagem)}" target="_blank" style="color:#2ecc40">abrir imagem</a>. Envie nova apenas se quiser substituir.`;
        file.insertAdjacentElement('afterend', info);
      }
    }
  }

  async function updateStatus(id, status) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!item) return;
    try {
      await API.obras.salvar({ ...item, status });
      toast('Status da obra atualizado.');
      await renderPainelList();
    } catch (error) {
      toast(error.message || 'Erro ao atualizar status.', 'err');
    }
  }

  async function updateProgress(id, progresso) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    if (!item) return;
    try {
      await API.obras.salvar({ ...item, progresso });
      toast('Progresso atualizado.');
      await renderPainelList();
    } catch (error) {
      toast(error.message || 'Erro ao atualizar progresso.', 'err');
    }
  }

  async function deleteObra(id) {
    const item = state.items.find((x) => Number(x.id) === Number(id));
    const ok = confirm(`Excluir a obra ${item?.nome || id}?\n\nEla será removida do banco e também sairá do site público.`);
    if (!ok) return;
    try {
      await API.obras.excluir(id);
      toast('Obra excluída com sucesso.');
      await renderPainelList();
    } catch (error) {
      toast(error.message || 'Erro ao excluir obra.', 'err');
    }
  }

  async function renderPainelList() {
    try {
      const res = await API.obras.listar();
      state.items = res.data || [];
      const tbody = findObrasTableBody();
      if (!tbody) return;

      tbody.innerHTML = state.items.map((o) => {
        const progresso = Math.max(0, Math.min(100, Number(o.progresso || 0)));
        return `
          <tr data-api-obra-id="${esc(o.id)}">
            <td><strong>${esc(o.nome)}</strong><br><small>${esc(o.localizacao || '')}</small></td>
            <td>${esc(o.secretaria || '')}</td>
            <td>${money(o.valor)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;min-width:130px">
                <input data-obra-progresso="${esc(o.id)}" type="number" min="0" max="100" value="${progresso}" style="width:68px;background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:7px;font-weight:700"> <span>%</span>
              </div>
            </td>
            <td><span class="sp ${statusClass(o.status)}">${esc(statusLabel(o.status))}</span></td>
            <td>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                ${o.imagem ? `<a class="btn btn-sm" href="${esc(o.imagem)}" target="_blank">🖼 Imagem</a>` : ''}
                <button class="btn btn-sm" data-obra-edit="${esc(o.id)}">✏️ Editar</button>
                <select data-obra-status="${esc(o.id)}" style="background:#111a11;color:#dff5df;border:1px solid #244024;border-radius:7px;padding:7px;font-weight:700">
                  <option value="planejada" ${o.status === 'planejada' ? 'selected' : ''}>Planejada</option>
                  <option value="em_andamento" ${o.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
                  <option value="concluida" ${o.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                  <option value="paralisada" ${o.status === 'paralisada' ? 'selected' : ''}>Paralisada</option>
                </select>
                <button class="btn btn-sm" data-obra-delete="${esc(o.id)}" style="background:rgba(248,81,73,.14);color:#ffb8b8;border:1px solid rgba(248,81,73,.35);border-radius:7px;padding:7px 10px;font-weight:800;cursor:pointer">🗑 Excluir</button>
              </div>
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="6">Nenhuma obra cadastrada.</td></tr>';
    } catch (error) {
      console.warn('Erro ao carregar obras no painel:', error);
    }
  }

  function bindEvents() {
    document.addEventListener('click', async (event) => {
      const btn = event.target.closest('button, .btn, [role="button"]');
      if (!btn) return;

      const editId = btn.getAttribute('data-obra-edit');
      if (editId) {
        event.preventDefault();
        event.stopPropagation();
        const item = state.items.find((x) => Number(x.id) === Number(editId));
        if (item) openEditModal(item);
        return;
      }

      const delId = btn.getAttribute('data-obra-delete');
      if (delId) {
        event.preventDefault();
        event.stopPropagation();
        await deleteObra(delId);
        return;
      }

      const modal = findObraModal();
      const text = norm(btn.textContent);
      if (modal && modal.contains(btn) && (text.includes('publicar') || text.includes('salvar') || text.includes('cadastrar'))) {
        event.preventDefault();
        event.stopPropagation();
        await saveFromModal();
      }

      if (text.includes('nova obra') || text.includes('adicionar obra')) {
        state.editingId = 0;
        state.editingImagem = '';
      }
    }, true);

    document.addEventListener('change', async (event) => {
      const status = event.target.closest('select[data-obra-status]');
      if (status) {
        await updateStatus(status.getAttribute('data-obra-status'), status.value);
        return;
      }
      const progresso = event.target.closest('input[data-obra-progresso]');
      if (progresso) {
        await updateProgress(progresso.getAttribute('data-obra-progresso'), progresso.value);
      }
    }, true);
  }

  function init() {
    bindEvents();
    renderPainelList();
    window.addEventListener('painel-auth-ok', renderPainelList);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
