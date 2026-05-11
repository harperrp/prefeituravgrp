// Integração do painel-adm.html original com o banco de dados.
// Este arquivo NÃO muda o visual do painel. Ele apenas conecta os formulários originais às APIs PHP.

(function () {
  const API = window.PrefeituraAPI;
  if (!API) {
    console.warn('PrefeituraAPI não encontrado. Inclua assets/js/api-client.js antes deste arquivo.');
    return;
  }

  const state = {
    noticias: [],
    obras: [],
    licitacoes: [],
    imagemNoticiaAtual: '',
  };

  const norm = (txt) => String(txt || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[s]));

  const money = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('pt-BR');
  };

  function toast(text, type = 'ok') {
    let el = document.getElementById('painel-api-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'painel-api-toast';
      el.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:99999;max-width:360px;padding:14px 16px;border-radius:12px;font:600 13px Sora,Arial;background:#111711;color:#e2ebe2;border:1px solid #2a3a2a;box-shadow:0 16px 50px rgba(0,0,0,.45);display:none';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.borderColor = type === 'err' ? 'rgba(248,81,73,.6)' : 'rgba(46,204,64,.45)';
    el.style.color = type === 'err' ? '#ffb8b8' : '#b8ffc0';
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 4200);
  }

  function findModalByTitle(titleWords) {
    const modals = Array.from(document.querySelectorAll('.mo, .modal, [role="dialog"]'));
    return modals.find((m) => {
      const txt = norm(m.textContent);
      return titleWords.every((w) => txt.includes(norm(w))) && getComputedStyle(m).display !== 'none';
    }) || modals.find((m) => titleWords.every((w) => norm(m.textContent).includes(norm(w))));
  }

  function findField(container, names) {
    const fields = Array.from(container.querySelectorAll('input, textarea, select'));
    return fields.find((field) => {
      const name = norm(field.name || field.id || field.placeholder || field.getAttribute('aria-label'));
      const label = norm(field.closest('.fgrp, .field, div')?.querySelector('label')?.textContent || '');
      const combined = `${name} ${label}`;
      return names.some((n) => combined.includes(norm(n)));
    });
  }

  function findButton(container, words) {
    const buttons = Array.from(container.querySelectorAll('button, .btn, [role="button"]'));
    return buttons.find((btn) => words.some((w) => norm(btn.textContent).includes(norm(w))));
  }

  function visible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) !== 0;
  }

  async function uploadFileIfNeeded(container) {
    const fileInput = Array.from(container.querySelectorAll('input[type="file"]'))[0];
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const up = await API.upload(fileInput.files[0], 'noticias');
      state.imagemNoticiaAtual = up.url;
      return up.url;
    }
    return state.imagemNoticiaAtual || '';
  }

  function getNoticiaData(container, status) {
    const titulo = findField(container, ['titulo']);
    const categoria = findField(container, ['categoria']);
    const data = findField(container, ['data']);
    const resumo = findField(container, ['resumo']);
    const conteudo = findField(container, ['conteudo completo', 'conteudo']);

    return {
      titulo: titulo?.value || '',
      categoria: categoria?.value || '',
      data_publicacao: data?.value ? `${data.value} 09:00:00` : undefined,
      resumo: resumo?.value || '',
      conteudo: conteudo?.value || '',
      status,
      destaque: 1,
      imagem: state.imagemNoticiaAtual || '',
    };
  }

  async function saveNoticiaFromOriginalModal(status = 'publicado') {
    const modal = findModalByTitle(['nova', 'noticia']) || findModalByTitle(['editar', 'noticia']);
    if (!modal) return false;

    try {
      const imagem = await uploadFileIfNeeded(modal);
      const data = getNoticiaData(modal, status);
      data.imagem = imagem;

      if (!data.titulo.trim()) {
        toast('Informe o título da notícia.', 'err');
        return true;
      }

      await API.noticias.salvar(data);
      toast(status === 'rascunho' ? 'Rascunho salvo no banco.' : 'Notícia publicada no banco.');
      await loadNoticiasIntoOriginalPanel();
      await loadDashboardCounts();

      const close = modal.querySelector('.md-x, .close, [data-close]');
      if (close) close.click();
      else modal.classList.remove('open');
      return true;
    } catch (err) {
      toast(err.message || 'Erro ao salvar notícia.', 'err');
      return true;
    }
  }

  function bindOriginalNewsModal() {
    document.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button, .btn, [role="button"]');
      if (!btn) return;
      const text = norm(btn.textContent);

      if (text.includes('publicar')) {
        const modal = findModalByTitle(['noticia']);
        if (modal && modal.contains(btn)) {
          ev.preventDefault();
          ev.stopPropagation();
          await saveNoticiaFromOriginalModal('publicado');
        }
      }

      if (text.includes('salvar rascunho')) {
        const modal = findModalByTitle(['noticia']);
        if (modal && modal.contains(btn)) {
          ev.preventDefault();
          ev.stopPropagation();
          await saveNoticiaFromOriginalModal('rascunho');
        }
      }
    }, true);
  }

  function findNoticiasTableBody() {
    const tables = Array.from(document.querySelectorAll('table'));
    const table = tables.find((t) => /noticia|titulo|categoria|status/i.test(t.textContent));
    return table?.querySelector('tbody') || null;
  }

  async function loadNoticiasIntoOriginalPanel() {
    try {
      const res = await API.noticias.listar(false, 50);
      state.noticias = res.data || [];
      const tbody = findNoticiasTableBody();
      if (!tbody) return;

      tbody.innerHTML = state.noticias.map((n) => `
        <tr data-api-noticia-id="${esc(n.id)}">
          <td><span class="tc">${esc(n.titulo)}</span></td>
          <td>${esc(n.categoria || '-')}</td>
          <td>${esc(formatDate(n.data_publicacao))}</td>
          <td><span class="sp ${n.status === 'rascunho' ? 'sp-pend' : 'sp-ok'}">${esc(n.status)}</span></td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="btn btn-sm btn-d" data-api-del-noticia="${esc(n.id)}">🗑</button>
            </div>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="5">Nenhuma notícia cadastrada.</td></tr>';
    } catch (err) {
      console.warn('Erro ao carregar notícias no painel original:', err);
    }
  }

  function bindDeleteButtons() {
    document.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-api-del-noticia]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const id = btn.getAttribute('data-api-del-noticia');
      if (!confirm('Excluir esta notícia do banco?')) return;
      try {
        await API.noticias.excluir(id);
        toast('Notícia excluída.');
        await loadNoticiasIntoOriginalPanel();
        await loadDashboardCounts();
      } catch (err) {
        toast(err.message || 'Erro ao excluir notícia.', 'err');
      }
    }, true);
  }

  async function loadDashboardCounts() {
    try {
      const [n, o, l] = await Promise.all([
        API.noticias.listar(false, 50),
        API.obras.listar(),
        API.licitacoes.listar(),
      ]);
      const counts = {
        noticias: (n.data || []).length,
        obras: (o.data || []).length,
        licitacoes: (l.data || []).length,
      };

      Array.from(document.querySelectorAll('.scard, .stat, .card')).forEach((card) => {
        const txt = norm(card.textContent);
        const num = card.querySelector('.sc-num, strong, .num');
        if (!num) return;
        if (txt.includes('noticia')) num.textContent = counts.noticias;
        if (txt.includes('obra')) num.textContent = counts.obras;
        if (txt.includes('licit')) num.textContent = counts.licitacoes;
      });
    } catch (err) {
      console.warn('Erro ao atualizar contadores:', err);
    }
  }

  async function protectPanelIfLoggedOut() {
    try {
      await API.auth.me();
    } catch (err) {
      toast('Painel sem login ativo. Use o painel-db.html para entrar ou implemente a tela de login no painel original.', 'err');
    }
  }

  function observeModalFilePreview() {
    document.addEventListener('change', (ev) => {
      const input = ev.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.[0]) return;
      const modal = input.closest('.mo, .modal, [role="dialog"]');
      if (!modal || !norm(modal.textContent).includes('noticia')) return;

      const url = URL.createObjectURL(input.files[0]);
      state.imagemNoticiaAtual = '';

      const cover = Array.from(modal.querySelectorAll('*')).find((el) => norm(el.textContent).includes('imagem de capa'));
      const previewBox = modal.querySelector('[style*="background"], .preview, .dz') || cover;
      if (previewBox) {
        previewBox.style.backgroundImage = `url('${url}')`;
        previewBox.style.backgroundSize = 'cover';
        previewBox.style.backgroundPosition = 'center';
      }
    });
  }

  async function init() {
    bindOriginalNewsModal();
    bindDeleteButtons();
    observeModalFilePreview();
    await protectPanelIfLoggedOut();
    await loadNoticiasIntoOriginalPanel();
    await loadDashboardCounts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
