// Integração do módulo Licitações e Contratos do painel original.
// Mantém a janela original e conecta o botão Publicar à API real.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.licitacoes) return;

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = (value) => {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
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

  async function uploadEdital(modal) {
    const file = Array.from(modal.querySelectorAll('input[type="file"]'))[0];
    if (file?.files?.[0]) {
      const up = await API.upload(file.files[0], 'licitacoes');
      return up.url;
    }
    return '';
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
    if (v.includes('encerr')) return 'encerrado';
    if (v.includes('cancel')) return 'cancelado';
    return 'aberto';
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
      toast('Processo licitatório publicado com sucesso.');
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

  async function renderPainelList() {
    try {
      const res = await API.licitacoes.listar();
      const items = res.data || [];
      const tbody = findLicTableBody();
      if (!tbody) return;

      tbody.innerHTML = items.map((l) => `
        <tr data-api-licitacao-id="${esc(l.id)}">
          <td class="tc mono">${esc(l.processo)}</td>
          <td>${esc(l.objeto)}</td>
          <td>${esc(l.modalidade || '')}</td>
          <td>${money(l.valor)}</td>
          <td>${esc(date(l.abertura))}</td>
          <td><span class="sp ${l.status === 'homologado' ? 'sp-ok' : l.status === 'em_andamento' ? 'sp-pend' : 'sp-info'}">${esc(l.status || 'aberto')}</span></td>
          <td>${l.documento ? `<a class="btn btn-sm" href="${esc(l.documento)}" target="_blank">📄 Edital</a>` : ''}</td>
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
      const text = norm(btn.textContent);
      const modal = findLicModal();
      if (!modal || !modal.contains(btn)) return;

      if (text.includes('publicar') || text.includes('salvar')) {
        event.preventDefault();
        event.stopPropagation();
        await saveFromModal();
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
