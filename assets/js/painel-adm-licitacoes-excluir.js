// Botão Excluir para licitações no painel ADM original.
// Deve ser carregado depois de painel-adm-licitacoes.js.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.licitacoes) return;

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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

  function isLicPage() {
    return norm(document.body.textContent).includes('licitacoes e contratos') || norm(document.body.textContent).includes('licitações e contratos');
  }

  function injectDeleteButtons() {
    if (!isLicPage()) return;

    document.querySelectorAll('tr[data-api-licitacao-id]').forEach((row) => {
      const id = row.getAttribute('data-api-licitacao-id');
      if (!id || row.querySelector('[data-lic-delete]')) return;

      const actionsCell = row.querySelector('td:last-child');
      const actionsWrap = actionsCell?.querySelector('div') || actionsCell;
      if (!actionsWrap) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm';
      btn.setAttribute('data-lic-delete', id);
      btn.textContent = '🗑 Excluir';
      btn.style.cssText = 'background:rgba(248,81,73,.14);color:#ffb8b8;border:1px solid rgba(248,81,73,.35);border-radius:7px;padding:7px 10px;font-weight:800;cursor:pointer';
      actionsWrap.appendChild(btn);
    });
  }

  async function deleteLicitacao(id) {
    const row = document.querySelector(`tr[data-api-licitacao-id="${CSS.escape(String(id))}"]`);
    const processo = row?.querySelector('td')?.textContent?.trim() || `ID ${id}`;

    const ok = confirm(`Tem certeza que deseja excluir o processo ${processo}?\n\nEssa ação remove a licitação do banco e ela também some do site público.`);
    if (!ok) return;

    try {
      await API.licitacoes.excluir(id);
      toast('Licitação excluída com sucesso.');
      if (row) row.remove();
      setTimeout(injectDeleteButtons, 500);
    } catch (error) {
      toast(error.message || 'Erro ao excluir licitação.', 'err');
    }
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-lic-delete]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    deleteLicitacao(btn.getAttribute('data-lic-delete'));
  }, true);

  const observer = new MutationObserver(() => injectDeleteButtons());

  function init() {
    injectDeleteButtons();
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('painel-auth-ok', () => setTimeout(injectDeleteButtons, 600));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
