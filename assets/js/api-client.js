// Cliente simples para ligar o painel e o site às APIs PHP.
// Use este arquivo no index.html e no painel-adm.html quando formos substituir os dados estáticos.

window.PrefeituraAPI = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const data = await res.json().catch(() => ({ success: false, message: 'Resposta inválida do servidor.' }));

    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Erro na requisição.');
    }

    return data;
  },

  auth: {
    login(email, senha) {
      return PrefeituraAPI.request('/api/auth.php?action=login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      });
    },
    logout() {
      return PrefeituraAPI.request('/api/auth.php?action=logout', { method: 'POST' });
    },
    me() {
      return PrefeituraAPI.request('/api/auth.php?action=me');
    },
  },

  categorias: {
    listar(tipo = 'noticia') {
      return PrefeituraAPI.request(`/api/categorias.php?tipo=${encodeURIComponent(tipo)}`);
    },
    salvar(dados) {
      return PrefeituraAPI.request('/api/categorias.php', {
        method: 'POST',
        body: JSON.stringify(dados),
      });
    },
    excluir(id) {
      return PrefeituraAPI.request(`/api/categorias.php?id=${id}`, { method: 'DELETE' });
    },
  },

  noticias: {
    listar(publico = false, limit = 20) {
      return PrefeituraAPI.request(`/api/noticias.php?limit=${limit}${publico ? '&public=1' : ''}`);
    },
    salvar(dados) {
      return PrefeituraAPI.request('/api/noticias.php', {
        method: 'POST',
        body: JSON.stringify(dados),
      });
    },
    excluir(id) {
      return PrefeituraAPI.request(`/api/noticias.php?id=${id}`, { method: 'DELETE' });
    },
  },

  obras: {
    listar() {
      return PrefeituraAPI.request('/api/obras.php');
    },
    salvar(dados) {
      return PrefeituraAPI.request('/api/obras.php', {
        method: 'POST',
        body: JSON.stringify(dados),
      });
    },
    excluir(id) {
      return PrefeituraAPI.request(`/api/obras.php?id=${id}`, { method: 'DELETE' });
    },
  },

  licitacoes: {
    listar() {
      return PrefeituraAPI.request('/api/licitacoes.php');
    },
    salvar(dados) {
      return PrefeituraAPI.request('/api/licitacoes.php', {
        method: 'POST',
        body: JSON.stringify(dados),
      });
    },
    excluir(id) {
      return PrefeituraAPI.request(`/api/licitacoes.php?id=${id}`, { method: 'DELETE' });
    },
  },

  async upload(file, tipo = 'geral') {
    const form = new FormData();
    form.append('arquivo', file);
    form.append('tipo', tipo);

    const res = await fetch('/api/upload.php', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });

    const data = await res.json().catch(() => ({ success: false, message: 'Resposta inválida do servidor.' }));
    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Erro no upload.');
    }
    return data;
  },
};
