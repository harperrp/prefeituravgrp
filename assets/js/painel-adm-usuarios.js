// Gerenciamento visual de usuários e permissões no Painel ADM.
// Cadastrar, editar, ativar/desativar e alterar senha.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.usuarios) return;

  const state = { items: [], editing: null };

  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));

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
    el._t = setTimeout(() => { el.style.display = 'none'; }, 4500);
  }

  function isPageActive() {
    const text = Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title,.breadcrumb,*[class*="title"]'))
      .filter(visible)
      .map((el) => norm(el.textContent))
      .join(' | ');
    return text.includes('usuarios') || text.includes('usuários') || text.includes('permissoes') || text.includes('permissões');
  }

  function ensureStyles() {
    if (document.getElementById('usuarios-style')) return;
    const style = document.createElement('style');
    style.id = 'usuarios-style';
    style.textContent = `
      .usr-wrap{border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;background:rgba(7,18,7,.72);margin-top:24px}.usr-head{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07)}.usr-head h3{margin:0;color:#fff;font:900 18px Sora,Arial;letter-spacing:.04em}.usr-btn{border:1px solid #315831;background:#122512;color:#dff5df;border-radius:8px;padding:9px 12px;font-weight:900;font-size:12px;cursor:pointer}.usr-btn.primary{background:#0b7d12;border-color:#0b7d12;color:#fff}.usr-btn.red{background:rgba(248,81,73,.14);border-color:rgba(248,81,73,.35);color:#ffb8b8}.usr-table{width:100%;border-collapse:collapse}.usr-table th{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#7fac7f;text-align:left;padding:14px 18px;background:rgba(255,255,255,.025)}.usr-table td{padding:14px 18px;border-top:1px solid rgba(255,255,255,.06);color:#bdd5bd;font-size:13px;vertical-align:middle}.usr-name{font-weight:900;color:#e8f5e8}.usr-small{display:block;color:#7fa47f;font-size:12px;margin-top:4px}.usr-status{display:inline-flex;border-radius:999px;padding:5px 10px;font-weight:900;font-size:12px}.usr-status.on{background:#064f16;color:#9bff9b}.usr-status.off{background:#4a1111;color:#ffb8b8}.usr-profile{display:inline-flex;border-radius:999px;padding:5px 10px;font-weight:900;font-size:12px;background:#0d2f50;color:#8cc8ff}.usr-actions{display:flex;gap:7px;flex-wrap:wrap}.usr-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.74);z-index:99990;display:none;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(4px)}.usr-modal-bg.open{display:flex}.usr-modal{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#0d1a0d;border:1px solid #234523;border-radius:14px;box-shadow:0 28px 90px rgba(0,0,0,.55);color:#e8f5e8}.usr-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.08)}.usr-modal-head h3{margin:0;font:900 24px Sora,Arial;color:#fff}.usr-close{background:transparent;border:0;color:#8fbf8f;font-size:24px;font-weight:900;cursor:pointer}.usr-modal-body{padding:22px 24px}.usr-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.usr-field{display:flex;flex-direction:column;gap:7px}.usr-field.full{grid-column:1/-1}.usr-field label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#7fab7f;font-weight:900}.usr-field input,.usr-field select{background:#111f11;border:1px solid #254825;color:#e8f5e8;border-radius:8px;padding:12px;font:700 13px Sora,Arial}.usr-help{font-size:12px;color:#8fbf8f;line-height:1.45;margin-top:12px}.usr-modal-actions{display:flex;gap:10px;justify-content:flex-end;padding:18px 24px;border-top:1px solid rgba(255,255,255,.08)}@media(max-width:700px){.usr-grid{grid-template-columns:1fr}.usr-modal-actions{flex-direction:column}.usr-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function findContentRoot() {
    const titles = Array.from(document.querySelectorAll('h1,h2,.page-title,.content-title')).filter(visible);
    const title = titles.find((el) => norm(el.textContent).includes('usuario') || norm(el.textContent).includes('usuário') || norm(el.textContent).includes('permiss')) || titles[0];
    return title?.closest('main, .content, .page, section, .main, .app-main') || title?.parentElement || document.body;
  }

  function ensurePanel() {
    ensureStyles();
    if (!isPageActive()) return null;
    let wrap = document.getElementById('painelUsuariosWrap');
    if (wrap) return wrap;
    const root = findContentRoot();
    wrap = document.createElement('div');
    wrap.id = 'painelUsuariosWrap';
    wrap.className = 'usr-wrap';
    wrap.innerHTML = `<div class="usr-head"><h3>USUÁRIOS DO PAINEL</h3><button class="usr-btn primary" data-usr-new>+ Novo Usuário</button></div><table class="usr-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Último login</th><th>Ações</th></tr></thead><tbody id="usrTbody"><tr><td colspan="5">Carregando...</td></tr></tbody></table>`;
    root.appendChild(wrap);
    return wrap;
  }

  function ensureModal() {
    ensureStyles();
    let bg = document.getElementById('usrModal');
    if (bg) return bg;
    bg = document.createElement('div');
    bg.id = 'usrModal';
    bg.className = 'usr-modal-bg';
    bg.innerHTML = `<div class="usr-modal"><div class="usr-modal-head"><h3 id="usrModalTitle">Novo Usuário</h3><button class="usr-close" type="button">×</button></div><form id="usrForm"><div class="usr-modal-body"><input type="hidden" name="id"><div class="usr-grid"><div class="usr-field"><label>Nome</label><input name="nome" required></div><div class="usr-field"><label>E-mail</label><input name="email" type="email" required></div><div class="usr-field"><label>Telefone</label><input name="telefone"></div><div class="usr-field"><label>Perfil</label><select name="perfil"><option value="administrador">Administrador</option><option value="editor">Editor</option><option value="visualizador">Visualizador</option></select></div><div class="usr-field"><label>Status</label><select name="ativo"><option value="1">Ativo</option><option value="0">Inativo</option></select></div><div class="usr-field"><label>Senha</label><input name="senha" type="password" placeholder="Nova senha ou deixe vazio ao editar"></div></div><div class="usr-help"><strong>Perfis:</strong> Administrador gerencia tudo. Editor cadastra e edita conteúdos. Visualizador apenas acompanha informações do painel.</div></div><div class="usr-modal-actions"><button type="button" class="usr-btn" data-usr-cancel>Cancelar</button><button type="submit" class="usr-btn primary">Salvar Usuário</button></div></form></div>`;
    document.body.appendChild(bg);
    bg.querySelector('.usr-close').addEventListener('click', () => bg.classList.remove('open'));
    bg.querySelector('[data-usr-cancel]').addEventListener('click', () => bg.classList.remove('open'));
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('open'); });
    bg.querySelector('#usrForm').addEventListener('submit', save);
    return bg;
  }

  function profileLabel(perfil) {
    return ({ administrador: 'Administrador', admin: 'Administrador', editor: 'Editor', visualizador: 'Visualizador' }[perfil] || perfil || 'Editor');
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('pt-BR');
  }

  function render() {
    const wrap = ensurePanel();
    if (!wrap) return;
    const tbody = wrap.querySelector('#usrTbody');
    tbody.innerHTML = state.items.map((u) => `
      <tr data-usr-id="${esc(u.id)}">
        <td><span class="usr-name">${esc(u.nome)}</span><span class="usr-small">${esc(u.email)} ${u.telefone ? '· ' + esc(u.telefone) : ''}</span></td>
        <td><span class="usr-profile">${esc(profileLabel(u.perfil))}</span></td>
        <td><span class="usr-status ${Number(u.ativo) ? 'on' : 'off'}">${Number(u.ativo) ? 'Ativo' : 'Inativo'}</span></td>
        <td>${esc(fmtDate(u.ultimo_login))}</td>
        <td><div class="usr-actions"><button class="usr-btn" data-usr-edit="${esc(u.id)}">✏️ Editar</button><button class="usr-btn red" data-usr-delete="${esc(u.id)}">Desativar</button></div></td>
      </tr>
    `).join('') || '<tr><td colspan="5">Nenhum usuário cadastrado.</td></tr>';
  }

  async function load() {
    if (!isPageActive()) return;
    ensurePanel();
    try {
      const res = await API.usuarios.listar();
      state.items = res.data || [];
      render();
    } catch (e) {
      toast(e.message || 'Erro ao carregar usuários.', 'err');
    }
  }

  function openUser(user = null) {
    const bg = ensureModal();
    const form = bg.querySelector('#usrForm');
    form.reset();
    state.editing = user;
    bg.querySelector('#usrModalTitle').textContent = user ? 'Editar Usuário' : 'Novo Usuário';
    form.id.value = user?.id || '';
    form.nome.value = user?.nome || '';
    form.email.value = user?.email || '';
    form.telefone.value = user?.telefone || '';
    form.perfil.value = user?.perfil === 'admin' ? 'administrador' : (user?.perfil || 'editor');
    form.ativo.value = String(Number(user?.ativo ?? 1));
    form.senha.value = '';
    bg.classList.add('open');
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      data.id = Number(data.id || 0) || undefined;
      data.ativo = Number(data.ativo || 0);
      await API.usuarios.salvar(data);
      toast(data.id ? 'Usuário atualizado.' : 'Usuário cadastrado.');
      document.getElementById('usrModal')?.classList.remove('open');
      await load();
    } catch (e) { toast(e.message || 'Erro ao salvar usuário.', 'err'); }
  }

  async function desativar(id) {
    const user = state.items.find((x) => Number(x.id) === Number(id));
    if (!confirm(`Desativar usuário ${user?.nome || id}?`)) return;
    try {
      await API.usuarios.excluir(id);
      toast('Usuário desativado.');
      await load();
    } catch (e) { toast(e.message || 'Erro ao desativar usuário.', 'err'); }
  }

  document.addEventListener('click', (event) => {
    const newBtn = event.target.closest('[data-usr-new]');
    const editBtn = event.target.closest('[data-usr-edit]');
    const delBtn = event.target.closest('[data-usr-delete]');
    if (newBtn) { event.preventDefault(); openUser(); return; }
    if (editBtn) { event.preventDefault(); const user = state.items.find((x) => Number(x.id) === Number(editBtn.getAttribute('data-usr-edit'))); openUser(user); return; }
    if (delBtn) { event.preventDefault(); desativar(delBtn.getAttribute('data-usr-delete')); return; }
    setTimeout(load, 350);
  }, true);

  function boot() {
    ensureStyles();
    setTimeout(load, 400);
    setTimeout(load, 1300);
    setInterval(() => { if (isPageActive()) load(); }, 10000);
    window.addEventListener('painel-auth-ok', load);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
