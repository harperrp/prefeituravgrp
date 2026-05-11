// Configuração operacional das APIs/portais de Emendas no painel ADM.
// Ativa os cards existentes de Emendas (APIs Gov): editar, testar e sincronizar.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.integracoes) return;

  const state = { items: [] };

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const cardMatchers = {
    emendas_pix_federal: ['emendas pix', 'pix federal', 'portal federal', 'api.portaldatransparencia'],
    saude_fns: ['saude', 'saúde', 'fns', 'opendatasus'],
    estaduais_mg: ['estaduais', 'mg', 'portal mg', 'transparencia.mg'],
    assist_social_mds: ['assist', 'social', 'mds', 'aplicacoes.mds'],
    convenios_transferegov: ['convenios', 'convênios', 'transferegov', 'api.transferegov']
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
      el.style.cssText = 'position:fixed;right:22px;bottom:22px;z-index:99999;max-width:420px;padding:14px 16px;border-radius:12px;font:700 13px Sora,Arial;background:#111711;color:#e2ebe2;border:1px solid #2a3a2a;box-shadow:0 16px 50px rgba(0,0,0,.45);display:none';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.borderColor = type === 'err' ? 'rgba(248,81,73,.6)' : 'rgba(46,204,64,.45)';
    el.style.color = type === 'err' ? '#ffb8b8' : '#b8ffc0';
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 5200);
  }

  function isPageActive() {
    const titles = Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title'))
      .filter(visible)
      .map((el) => norm(el.textContent));
    return titles.some((t) => t.includes('emendas parlamentares') || t.includes('apis') || t.includes('api'));
  }

  function ensureStyles() {
    if (document.getElementById('emendas-api-style')) return;
    const style = document.createElement('style');
    style.id = 'emendas-api-style';
    style.textContent = `
      .api-config-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99990;display:none;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px)}
      .api-config-backdrop.open{display:flex}
      .api-config-modal{width:min(760px,96vw);max-height:90vh;overflow:auto;background:#0d1a0d;border:1px solid #234523;border-radius:14px;box-shadow:0 28px 90px rgba(0,0,0,.55);color:#e8f5e8}
      .api-config-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.08)}
      .api-config-head h3{margin:0;font:900 24px Sora,Arial;color:#fff;letter-spacing:.04em}.api-config-head p{margin:8px 0 0;color:#8fbf8f;font-size:13px;line-height:1.45}.api-config-close{background:transparent;border:0;color:#8fbf8f;font-size:24px;font-weight:900;cursor:pointer}
      .api-config-body{padding:22px 24px}.api-config-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.api-config-field{display:flex;flex-direction:column;gap:7px}.api-config-field.full{grid-column:1/-1}.api-config-field label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#7fab7f;font-weight:900}.api-config-field input,.api-config-field textarea{background:#111f11;border:1px solid #254825;color:#e8f5e8;border-radius:8px;padding:12px;font:700 13px Sora,Arial}.api-config-field textarea{min-height:80px;resize:vertical}.api-config-actions{display:flex;gap:10px;justify-content:flex-end;padding:18px 24px;border-top:1px solid rgba(255,255,255,.08)}.api-btn{border:1px solid #315831;background:#122512;color:#dff5df;border-radius:9px;padding:11px 14px;font-weight:900;cursor:pointer}.api-btn.primary{background:#0b7d12;border-color:#0b7d12;color:#fff}.api-btn.blue{background:#0b3d78;border-color:#1767c2;color:#fff}
      .api-card-tools{display:flex!important;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center}.api-mini-btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#e8f5e8;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:900;cursor:pointer}.api-mini-btn.green{background:#0b7d12;border-color:#0b7d12}.api-mini-btn.blue{background:#0b4d8f;border-color:#1767c2}.api-status-line{font-size:12px;color:#8fbf8f;flex-basis:100%;margin-top:2px}.api-card-patched{outline:1px solid rgba(46,204,64,.18);outline-offset:-1px}
      @media(max-width:700px){.api-config-grid{grid-template-columns:1fr}.api-config-actions{justify-content:stretch;flex-direction:column}.api-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    let box = document.getElementById('apiEmendasConfigModal');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'apiEmendasConfigModal';
    box.className = 'api-config-backdrop';
    box.innerHTML = `<div class="api-config-modal"><div class="api-config-head"><div><h3>Configurar API</h3><p>Informe o endpoint público/URL de exportação da fonte oficial. Depois use Testar Conexão e Sincronizar para importar os registros para a tabela de emendas do portal.</p></div><button class="api-config-close" type="button">×</button></div><form id="apiConfigForm"><div class="api-config-body"><input type="hidden" name="id"><input type="hidden" name="tipo" value="emendas"><div class="api-config-grid"><div class="api-config-field"><label>Nome da integração</label><input name="nome" required></div><div class="api-config-field"><label>Slug técnico</label><input name="slug" required></div><div class="api-config-field full"><label>Endpoint da API / URL de exportação JSON ou CSV</label><input name="endpoint" placeholder="https://..." ></div><div class="api-config-field"><label>Portal público</label><input name="portal_url" placeholder="https://..."></div><div class="api-config-field"><label>Fonte exibida</label><input name="fonte" placeholder="api.portaldatransparencia.gov.br"></div><div class="api-config-field full"><label>Configuração avançada / observações</label><textarea name="config_json"></textarea></div></div></div><div class="api-config-actions"><button type="button" class="api-btn" data-api-testar>Testar conexão</button><button type="button" class="api-btn blue" data-api-sync>Sincronizar agora</button><button type="submit" class="api-btn primary">Salvar configuração</button></div></form></div>`;
    document.body.appendChild(box);
    box.querySelector('.api-config-close').addEventListener('click', () => box.classList.remove('open'));
    box.addEventListener('click', (e) => { if (e.target === box) box.classList.remove('open'); });
    box.querySelector('#apiConfigForm').addEventListener('submit', saveForm);
    box.querySelector('[data-api-testar]').addEventListener('click', testarAtual);
    box.querySelector('[data-api-sync]').addEventListener('click', sincronizarAtual);
    return box;
  }

  function openModal(item) {
    const box = ensureModal();
    const form = box.querySelector('#apiConfigForm');
    form.id.value = item.id || '';
    form.tipo.value = item.tipo || 'emendas';
    form.nome.value = item.nome || '';
    form.slug.value = item.slug || '';
    form.endpoint.value = item.endpoint || '';
    form.portal_url.value = item.portal_url || '';
    form.fonte.value = item.fonte || '';
    form.config_json.value = item.config_json || '{}';
    box.classList.add('open');
  }

  async function saveForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const dados = {
        id: Number(form.id.value || 0) || undefined,
        tipo: form.tipo.value || 'emendas',
        nome: form.nome.value,
        slug: form.slug.value,
        endpoint: form.endpoint.value,
        portal_url: form.portal_url.value,
        fonte: form.fonte.value,
        ativo: 1,
        config_json: form.config_json.value || '{}'
      };
      await API.integracoes.salvar(dados);
      toast('Configuração da API salva.');
      document.getElementById('apiEmendasConfigModal')?.classList.remove('open');
      await loadAndPatch();
    } catch (e) {
      toast(e.message || 'Erro ao salvar integração.', 'err');
    }
  }

  async function testarAtual() {
    const id = Number(document.querySelector('#apiConfigForm [name="id"]')?.value || 0);
    if (!id) return toast('Salve a configuração antes de testar.', 'err');
    try {
      const res = await API.integracoes.testar(id);
      toast(`${res.message} Registros detectados: ${res.data?.count ?? 0}`);
      await loadAndPatch();
    } catch (e) { toast(e.message || 'Falha no teste da API.', 'err'); }
  }

  async function sincronizarAtual() {
    const id = Number(document.querySelector('#apiConfigForm [name="id"]')?.value || 0);
    if (!id) return toast('Salve a configuração antes de sincronizar.', 'err');
    await sincronizar(id);
  }

  async function sincronizar(id) {
    try {
      const res = await API.integracoes.sincronizar(id);
      toast(res.message || 'Sincronização concluída.');
      await loadAndPatch();
    } catch (e) { toast(e.message || 'Falha na sincronização.', 'err'); }
  }

  function statusText(item) {
    if (item.ultimo_status === 'sincronizado') return 'Sincronizado';
    if (item.ultimo_status === 'ok') return 'Conexão OK';
    if (item.ultimo_status === 'erro') return 'Erro';
    return 'Pendente';
  }

  function findBestCard(item) {
    const selectors = ['.card', '.api-card', '.dash-card', '.integration-card', '.st-card', 'article', 'section > div', 'main > div > div', '.content div'];
    const candidates = Array.from(document.querySelectorAll(selectors.join(','))).filter(visible);
    const keywords = cardMatchers[item.slug] || [item.nome, item.fonte, item.slug];

    const scored = candidates.map((el) => {
      const t = norm(el.textContent);
      let score = 0;
      keywords.forEach((k) => { if (k && t.includes(norm(k))) score += 4; });
      if (t.includes(norm(item.nome))) score += 6;
      if (item.fonte && t.includes(norm(item.fonte))) score += 5;
      if (t.includes('portal') || t.includes('sync') || t.includes('api')) score += 1;
      const r = el.getBoundingClientRect();
      if (r.width > 260 && r.width < 700 && r.height > 90 && r.height < 320) score += 2;
      return { el, score, area: r.width * r.height };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.area - b.area);

    return scored[0]?.el || null;
  }

  function patchOneCard(item) {
    const card = findBestCard(item);
    if (!card) return false;
    card.classList.add('api-card-patched');
    if (card.querySelector(`[data-api-tools-for="${item.id}"]`)) return true;

    const tools = document.createElement('div');
    tools.className = 'api-card-tools';
    tools.setAttribute('data-api-tools-for', item.id);
    tools.innerHTML = `
      <button type="button" class="api-mini-btn" data-api-config-id="${esc(item.id)}">⚙ Editar API</button>
      <button type="button" class="api-mini-btn green" data-api-sync-id="${esc(item.id)}">↻ Sincronizar</button>
      <button type="button" class="api-mini-btn blue" data-api-test-id="${esc(item.id)}">✓ Testar</button>
      <div class="api-status-line">Status: <strong>${esc(statusText(item))}</strong>${item.ultimo_sync ? ` · Último sync: ${esc(item.ultimo_sync)}` : ''}</div>
    `;

    const portalBtn = Array.from(card.querySelectorAll('a,button')).find((el) => norm(el.textContent).includes('portal') || norm(el.textContent).includes('mds') || norm(el.textContent).includes('transferegov'));
    if (portalBtn) portalBtn.insertAdjacentElement('afterend', tools);
    else card.appendChild(tools);
    return true;
  }

  function patchNewButton() {
    const addBtn = Array.from(document.querySelectorAll('button, .btn, [role="button"]')).find((b) => norm(b.textContent).includes('configurar api'));
    if (!addBtn || addBtn.getAttribute('data-api-new-bound')) return;
    addBtn.setAttribute('data-api-new-bound', '1');
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal({ tipo: 'emendas', nome: 'Nova integração', slug: `integracao_${Date.now()}`, config_json: '{}' });
    }, true);
  }

  function patchCards() {
    if (!isPageActive()) return;
    state.items.forEach(patchOneCard);
    patchNewButton();
  }

  async function loadAndPatch() {
    try {
      const res = await API.integracoes.listar('emendas');
      state.items = res.data || [];
      document.querySelectorAll('[data-api-tools-for]').forEach((el) => el.remove());
      patchCards();
    } catch (e) { console.warn('Erro ao carregar integrações de API:', e); }
  }

  document.addEventListener('click', async (event) => {
    const config = event.target.closest('[data-api-config-id]');
    if (config) {
      event.preventDefault();
      event.stopPropagation();
      const item = state.items.find((x) => Number(x.id) === Number(config.getAttribute('data-api-config-id')));
      if (item) openModal(item);
      return;
    }
    const sync = event.target.closest('[data-api-sync-id]');
    if (sync) {
      event.preventDefault();
      event.stopPropagation();
      await sincronizar(sync.getAttribute('data-api-sync-id'));
      return;
    }
    const test = event.target.closest('[data-api-test-id]');
    if (test) {
      event.preventDefault();
      event.stopPropagation();
      try {
        const res = await API.integracoes.testar(test.getAttribute('data-api-test-id'));
        toast(`${res.message} Registros detectados: ${res.data?.count ?? 0}`);
        await loadAndPatch();
      } catch (e) { toast(e.message || 'Falha no teste da API.', 'err'); }
    }
  }, true);

  function init() {
    ensureStyles();
    setTimeout(loadAndPatch, 300);
    setTimeout(loadAndPatch, 1200);
    setTimeout(loadAndPatch, 2600);
    setInterval(() => { if (isPageActive()) patchCards(); }, 1800);
    window.addEventListener('painel-auth-ok', loadAndPatch);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
