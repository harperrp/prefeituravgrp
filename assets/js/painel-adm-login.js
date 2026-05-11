// Login real para o painel-adm.html original.
// Injeta uma tela de login sem alterar o layout original do painel.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.auth) {
    console.warn('PrefeituraAPI.auth não encontrado. Inclua assets/js/api-client.js antes deste arquivo.');
    return;
  }

  function criarLoginOverlay() {
    let overlay = document.getElementById('painel-login-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'painel-login-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:radial-gradient(circle at center,rgba(46,204,64,.08),transparent 38%),#0b0f0b;display:flex;align-items:center;justify-content:center;font-family:Sora,Arial,sans-serif;color:#e2ebe2;padding:24px';

    overlay.innerHTML = `
      <form id="painel-login-form" style="width:100%;max-width:430px;background:#111711;border:1px solid #2a3a2a;border-radius:18px;padding:30px;box-shadow:0 24px 80px rgba(0,0,0,.65)">
        <div style="text-align:center;margin-bottom:22px">
          <div style="font-size:13px;letter-spacing:4px;color:#4a6a4a;text-transform:uppercase;font-weight:800;margin-bottom:8px">Sistema de Gestão Municipal</div>
          <h1 style="margin:0;color:#e2ebe2;font-size:26px;text-transform:uppercase;letter-spacing:1px">Vargem <span style="color:#2ecc40">Grande</span></h1>
          <p style="margin:8px 0 0;color:#7a9a7a;font-size:13px">Faça login para gerenciar o painel administrativo.</p>
        </div>
        <div id="painel-login-msg" style="display:none;margin-bottom:14px;padding:12px;border-radius:10px;background:rgba(248,81,73,.1);border:1px solid rgba(248,81,73,.35);color:#ffb8b8;font-size:13px;font-weight:600"></div>
        <label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#7a9a7a;font-weight:800;margin-bottom:6px">E-mail</label>
        <input id="painel-login-email" type="email" value="admin@vgrp.local" required style="width:100%;box-sizing:border-box;background:#181f18;border:1px solid #2a3a2a;border-radius:10px;padding:12px 14px;color:#e2ebe2;font-family:Sora,Arial,sans-serif;margin-bottom:14px;outline:none">
        <label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#7a9a7a;font-weight:800;margin-bottom:6px">Senha</label>
        <input id="painel-login-senha" type="password" required style="width:100%;box-sizing:border-box;background:#181f18;border:1px solid #2a3a2a;border-radius:10px;padding:12px 14px;color:#e2ebe2;font-family:Sora,Arial,sans-serif;margin-bottom:18px;outline:none">
        <button id="painel-login-btn" type="submit" style="width:100%;border:0;border-radius:10px;padding:13px 16px;background:linear-gradient(135deg,#1a7a1a,#2ecc40);color:white;font-weight:900;font-family:Sora,Arial,sans-serif;cursor:pointer;text-transform:uppercase;letter-spacing:.8px">Entrar no painel</button>
        <p style="margin:15px 0 0;text-align:center;color:#4a6a4a;font-size:11px;line-height:1.5">Após entrar, os botões Publicar e Salvar Rascunho funcionarão no banco de dados.</p>
      </form>
    `;

    document.body.appendChild(overlay);

    const form = overlay.querySelector('#painel-login-form');
    const msg = overlay.querySelector('#painel-login-msg');
    const btn = overlay.querySelector('#painel-login-btn');

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      msg.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Entrando...';

      try {
        const email = overlay.querySelector('#painel-login-email').value;
        const senha = overlay.querySelector('#painel-login-senha').value;
        await API.auth.login(email, senha);
        overlay.remove();
        window.dispatchEvent(new CustomEvent('painel-auth-ok'));
      } catch (error) {
        msg.textContent = error.message || 'Não foi possível fazer login.';
        msg.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar no painel';
      }
    });

    return overlay;
  }

  async function verificarLogin() {
    try {
      await API.auth.me();
      const overlay = document.getElementById('painel-login-overlay');
      if (overlay) overlay.remove();
      window.dispatchEvent(new CustomEvent('painel-auth-ok'));
    } catch (error) {
      criarLoginOverlay();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarLogin);
  } else {
    verificarLogin();
  }
})();
