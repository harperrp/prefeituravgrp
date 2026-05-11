// Integração pública de Ouvidoria / SIC.
// Liga botões do portal a formulários reais com protocolo automático.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.ouvidoria) return;

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]));
  const norm = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  function ensureStyles() {
    if (document.getElementById('portal-ouv-style')) return;
    const style = document.createElement('style');
    style.id = 'portal-ouv-style';
    style.textContent = `
      .portal-ouv-bg{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99990;display:none;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(4px)}.portal-ouv-bg.open{display:flex}.portal-ouv-modal{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 28px 90px rgba(0,0,0,.42);color:#243024}.portal-ouv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:24px 26px;background:#064b12;color:#fff;border-radius:14px 14px 0 0}.portal-ouv-head h3{margin:0;font:900 28px Sora,Arial;text-transform:uppercase;letter-spacing:.04em}.portal-ouv-head p{margin:8px 0 0;color:#cbf5cb;line-height:1.45}.portal-ouv-close{background:rgba(255,255,255,.13);border:0;color:#fff;border-radius:999px;width:34px;height:34px;font-size:22px;font-weight:900;cursor:pointer}.portal-ouv-body{padding:24px 26px}.portal-ouv-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.portal-ouv-field{display:flex;flex-direction:column;gap:7px}.portal-ouv-field.full{grid-column:1/-1}.portal-ouv-field label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#237a2d;font-weight:900}.portal-ouv-field input,.portal-ouv-field textarea,.portal-ouv-field select{border:1px solid #dce8dc;background:#f8fbf8;color:#1d2a1d;border-radius:9px;padding:12px;font:700 13px Sora,Arial}.portal-ouv-field textarea{min-height:130px;resize:vertical}.portal-ouv-actions{display:flex;gap:10px;justify-content:flex-end;padding:18px 26px;border-top:1px solid #edf2ed}.portal-ouv-btn{border:1px solid #dce8dc;background:#f8fbf8;color:#174d1d;border-radius:9px;padding:12px 15px;font-weight:900;cursor:pointer}.portal-ouv-btn.primary{background:#087a16;border-color:#087a16;color:#fff}.portal-ouv-result{background:#f0fff2;border-left:4px solid #0b8f1a;border-radius:10px;padding:16px;margin-top:16px;line-height:1.6}.portal-ouv-prot{font-size:22px;font-weight:900;color:#087a16}.portal-ouv-status{display:inline-flex;border-radius:999px;padding:4px 9px;background:#e8f7e8;color:#087a16;font-weight:900}.portal-ouv-error{background:#fff0f0;border-left:4px solid #c62828;color:#8a1d1d;border-radius:10px;padding:14px;margin-top:14px;font-weight:800}@media(max-width:700px){.portal-ouv-grid{grid-template-columns:1fr}.portal-ouv-actions{flex-direction:column}.portal-ouv-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    let bg = document.getElementById('portalOuvModal');
    if (bg) return bg;
    bg = document.createElement('div');
    bg.id = 'portalOuvModal';
    bg.className = 'portal-ouv-bg';
    bg.innerHTML = `<div class="portal-ouv-modal"><div class="portal-ouv-head"><div><h3 id="portalOuvTitle">Ouvidoria / SIC</h3><p id="portalOuvDesc">Registre sua manifestação ou pedido de informação.</p></div><button type="button" class="portal-ouv-close">×</button></div><form id="portalOuvForm"><div class="portal-ouv-body"><input type="hidden" name="tipo" value="ouvidoria"><div class="portal-ouv-grid"><div class="portal-ouv-field"><label>Nome</label><input name="nome" placeholder="Nome completo"></div><div class="portal-ouv-field"><label>E-mail</label><input name="email" type="email" placeholder="seuemail@exemplo.com"></div><div class="portal-ouv-field"><label>Telefone</label><input name="telefone" placeholder="(00) 00000-0000"></div><div class="portal-ouv-field"><label>Documento</label><input name="documento" placeholder="CPF ou CNPJ opcional"></div><div class="portal-ouv-field"><label>Categoria</label><select name="categoria"><option value="Pedido de informação">Pedido de informação</option><option value="Denúncia">Denúncia</option><option value="Reclamação">Reclamação</option><option value="Sugestão">Sugestão</option><option value="Elogio">Elogio</option><option value="Outros">Outros</option></select></div><div class="portal-ouv-field"><label>Assunto</label><input name="assunto" required placeholder="Resumo do pedido"></div><div class="portal-ouv-field full"><label>Mensagem</label><textarea name="mensagem" required placeholder="Descreva sua solicitação com detalhes..."></textarea></div></div><div id="portalOuvFeedback"></div></div><div class="portal-ouv-actions"><button type="button" class="portal-ouv-btn" data-consultar-protocolo>Consultar protocolo</button><button type="submit" class="portal-ouv-btn primary">Enviar solicitação</button></div></form></div>`;
    document.body.appendChild(bg);
    bg.querySelector('.portal-ouv-close').addEventListener('click', () => bg.classList.remove('open'));
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('open'); });
    bg.querySelector('#portalOuvForm').addEventListener('submit', enviar);
    bg.querySelector('[data-consultar-protocolo]').addEventListener('click', consultarPrompt);
    return bg;
  }

  function openForm(tipo) {
    const bg = ensureModal();
    const form = bg.querySelector('#portalOuvForm');
    form.reset();
    form.tipo.value = tipo;
    bg.querySelector('#portalOuvFeedback').innerHTML = '';
    if (tipo === 'sic') {
      bg.querySelector('#portalOuvTitle').textContent = 'Pedido de Informação — SIC';
      bg.querySelector('#portalOuvDesc').textContent = 'Solicite informações públicas. O prazo legal será calculado automaticamente.';
      form.categoria.value = 'Pedido de informação';
    } else {
      bg.querySelector('#portalOuvTitle').textContent = 'Ouvidoria Municipal';
      bg.querySelector('#portalOuvDesc').textContent = 'Registre denúncia, reclamação, sugestão, elogio ou manifestação.';
      form.categoria.value = 'Sugestão';
    }
    bg.classList.add('open');
  }

  async function enviar(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = document.getElementById('portalOuvFeedback');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await API.ouvidoria.enviar(data);
      feedback.innerHTML = `<div class="portal-ouv-result"><strong>Solicitação enviada com sucesso.</strong><br>Guarde seu protocolo:<br><span class="portal-ouv-prot">${esc(res.protocolo)}</span>${res.prazo_resposta ? `<br>Prazo previsto de resposta: <strong>${esc(res.prazo_resposta.split('-').reverse().join('/'))}</strong>` : ''}</div>`;
      form.querySelector('button[type="submit"]').disabled = true;
    } catch (e) {
      feedback.innerHTML = `<div class="portal-ouv-error">${esc(e.message || 'Erro ao enviar solicitação.')}</div>`;
    }
  }

  async function consultarPrompt() {
    const protocolo = prompt('Digite o número do protocolo:');
    if (!protocolo) return;
    const bg = ensureModal();
    const feedback = bg.querySelector('#portalOuvFeedback');
    try {
      const res = await API.ouvidoria.consultar(protocolo.trim());
      const d = res.data;
      feedback.innerHTML = `<div class="portal-ouv-result"><strong>Protocolo:</strong> <span class="portal-ouv-prot">${esc(d.protocolo)}</span><br><strong>Assunto:</strong> ${esc(d.assunto)}<br><strong>Status:</strong> <span class="portal-ouv-status">${esc(({novo:'Novo',em_analise:'Em análise',respondido:'Respondido',arquivado:'Arquivado'}[d.status] || d.status))}</span>${d.resposta ? `<br><br><strong>Resposta:</strong><br>${esc(d.resposta).replace(/\n/g, '<br>')}` : '<br><br>Ainda não há resposta registrada.'}</div>`;
      bg.classList.add('open');
    } catch (e) {
      feedback.innerHTML = `<div class="portal-ouv-error">${esc(e.message || 'Protocolo não encontrado.')}</div>`;
      bg.classList.add('open');
    }
  }

  function bindPublicButtons() {
    document.addEventListener('click', (event) => {
      const el = event.target.closest('a,button,[role="button"]');
      if (!el) return;
      const t = norm(el.textContent + ' ' + (el.getAttribute('href') || '') + ' ' + (el.getAttribute('aria-label') || ''));
      if (t.includes('pedido') && (t.includes('sic') || t.includes('informacao') || t.includes('informação'))) {
        event.preventDefault();
        openForm('sic');
      } else if (t.includes('manifestacao') || t.includes('manifestação') || t.includes('ouvidoria')) {
        event.preventDefault();
        openForm('ouvidoria');
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindPublicButtons);
  else bindPublicButtons();
})();
