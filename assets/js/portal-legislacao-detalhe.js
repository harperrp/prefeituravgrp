// Modal público "Ver Lei" para Legislação Municipal.
// Abre a legislação completa no mesmo padrão visual do protótipo original.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.legislacao) return;

  const state = { items: [] };

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const date = (value) => {
    if (!value) return '';
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
  };
  const label = (v) => ({ vigente: 'Vigente', alterada: 'Alterada', revogada: 'Revogada' }[v] || v || 'Vigente');

  function ensureStyles() {
    if (document.getElementById('leg-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'leg-modal-style';
    style.textContent = `
      .leg-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99990;display:none;align-items:flex-start;justify-content:center;padding:46px 18px;overflow:auto;backdrop-filter:blur(5px)}
      .leg-modal-backdrop.open{display:flex}
      .leg-modal{width:min(760px,96vw);background:#fff;border-radius:12px;box-shadow:0 30px 100px rgba(0,0,0,.45);overflow:hidden;color:#1d2b1d}
      .leg-head{background:#08670b;color:#fff;padding:22px 26px;position:relative;border-top:4px solid #b6e500}
      .leg-type{font:900 12px Barlow,Arial;letter-spacing:2px;text-transform:uppercase;color:#b8ffb8;margin-bottom:8px}
      .leg-title{font:900 28px 'Barlow Condensed',Arial;text-transform:none;line-height:1;margin:0 42px 8px 0;color:#fff}
      .leg-ementa{font-size:14px;line-height:1.45;color:#e7ffe7;max-width:640px}
      .leg-meta{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:14px;font-size:12px;color:#d6f5d6}
      .leg-status{background:#d9f8d9;color:#076407;border-radius:999px;padding:4px 12px;font-weight:900}
      .leg-close{position:absolute;right:18px;top:18px;border:0;background:rgba(255,255,255,.16);color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:20px;font-weight:900}
      .leg-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px 26px;background:#f4f8f4;border-bottom:1px solid #e4eee4;flex-wrap:wrap}
      .leg-btns{display:flex;gap:8px;flex-wrap:wrap}.leg-btn{border:1px solid #d7e8d7;background:#fff;color:#1b4f1b;border-radius:6px;padding:9px 16px;font-size:13px;font-weight:900;cursor:pointer;text-decoration:none}.leg-btn.primary{background:#08720b;color:#fff;border-color:#08720b}.leg-note{font-size:11px;color:#758775;font-style:italic}
      .leg-body{padding:28px 34px 34px;background:#fff;min-height:340px}.leg-sec-title{border-left:4px solid #18a318;padding-left:14px;font-size:12px;letter-spacing:2px;font-weight:900;color:#08720b;text-transform:uppercase;margin-bottom:10px}.leg-text{font-family:'Courier New',monospace;font-size:14px;line-height:1.8;white-space:pre-wrap;color:#111;max-height:58vh;overflow:auto;padding-right:8px}
      @media(max-width:700px){.leg-title{font-size:23px}.leg-body{padding:22px}.leg-actions{padding:12px 18px}.leg-head{padding:20px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    let box = document.getElementById('legPublicModal');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'legPublicModal';
    box.className = 'leg-modal-backdrop';
    box.innerHTML = '<div class="leg-modal" id="legModalContent"></div>';
    document.body.appendChild(box);
    box.addEventListener('click', (e) => { if (e.target === box) closeModal(); });
    return box;
  }

  function closeModal() {
    document.getElementById('legPublicModal')?.classList.remove('open');
  }

  function downloadTxt(item) {
    const blob = new Blob([item.texto || item.ementa || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(item.tipo || 'legislacao').replace(/\s+/g, '-')}-${String(item.numero || item.id).replace(/[\/\\]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyText(item) {
    try {
      await navigator.clipboard.writeText(item.texto || item.ementa || '');
      alert('Texto copiado.');
    } catch {
      alert('Não foi possível copiar automaticamente.');
    }
  }

  function openModal(item) {
    const box = ensureModal();
    const content = box.querySelector('#legModalContent');
    const titulo = `${item.tipo || 'Legislação'} Nº ${item.numero || ''}`;
    const texto = item.texto || item.ementa || 'Texto completo não informado. Use o arquivo PDF, se disponível.';
    content.innerHTML = `
      <div class="leg-head">
        <button class="leg-close" type="button" data-leg-close>×</button>
        <div class="leg-type">${esc(item.tipo || 'Legislação')}</div>
        <h2 class="leg-title">${esc(titulo)}</h2>
        <div class="leg-ementa">${esc(item.ementa || '')}</div>
        <div class="leg-meta">
          <span>📅 ${esc(date(item.data_publicacao))}</span>
          <span class="leg-status">● ${esc(label(item.situacao))}</span>
          <span>🏛 Município de Vargem Grande do Rio Pardo – MG</span>
        </div>
      </div>
      <div class="leg-actions">
        <div class="leg-btns">
          <button type="button" class="leg-btn primary" data-leg-print>🖨 Imprimir</button>
          <button type="button" class="leg-btn" data-leg-copy>📋 Copiar texto</button>
          ${item.arquivo ? `<a class="leg-btn" href="${esc(item.arquivo)}" target="_blank" rel="noopener">⬇️ Baixar PDF</a>` : '<button type="button" class="leg-btn" data-leg-download>⬇️ Baixar .txt</button>'}
        </div>
        <div class="leg-note">Dados inseridos pelo Painel Administrativo</div>
      </div>
      <div class="leg-body">
        <div class="leg-sec-title">Ementa</div>
        <p style="margin:0 0 24px 0;font-style:italic;line-height:1.6">${esc(item.ementa || '')}</p>
        <div class="leg-sec-title">Texto da lei</div>
        <div class="leg-text">${esc(texto)}</div>
      </div>
    `;
    content.querySelector('[data-leg-close]')?.addEventListener('click', closeModal);
    content.querySelector('[data-leg-print]')?.addEventListener('click', () => window.print());
    content.querySelector('[data-leg-copy]')?.addEventListener('click', () => copyText(item));
    content.querySelector('[data-leg-download]')?.addEventListener('click', () => downloadTxt(item));
    box.classList.add('open');
  }

  async function loadItems() {
    try {
      const res = await API.legislacao.listar(true);
      state.items = res.data || [];
    } catch (err) {
      console.warn('Erro ao carregar legislação para modal:', err);
    }
  }

  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-leg-view], a, button');
    if (!btn) return;
    const text = norm(btn.textContent);
    const row = btn.closest('tr');
    const explicit = btn.getAttribute('data-leg-view');
    const looksLikeVerLei = text.includes('ver lei') || text.includes('ver texto') || explicit;
    if (!looksLikeVerLei || !row) return;

    event.preventDefault();
    event.stopPropagation();

    if (!state.items.length) await loadItems();
    let item = explicit ? state.items.find((x) => Number(x.id) === Number(explicit)) : null;
    if (!item) {
      const numero = row.cells?.[0]?.textContent?.trim();
      item = state.items.find((x) => String(x.numero || '').trim() === numero);
    }
    if (item) openModal(item);
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadItems);
  else loadItems();
})();
