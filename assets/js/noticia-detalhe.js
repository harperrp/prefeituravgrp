// Carrega a página interna noticia.html?id=ID com dados reais do banco.

(function () {
  const API = window.PrefeituraAPI;
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (s) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[s]));

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  function showError(message) {
    const hero = document.getElementById('heroContent');
    const container = document.getElementById('noticiaContainer');
    if (hero) {
      hero.innerHTML = `<span class="cat">Aviso</span><h1>${esc(message)}</h1><div class="date">Notícia indisponível</div>`;
    }
    if (container) {
      container.className = 'error';
      container.innerHTML = `${esc(message)}<br><br><a class="btn" href="/">Voltar ao portal</a>`;
    }
  }

  function renderNoticia(n) {
    const hero = document.getElementById('heroContent');
    const container = document.getElementById('noticiaContainer');
    const titulo = n.titulo || 'Notícia';
    const categoria = n.categoria || 'Notícia';
    const data = formatDate(n.data_publicacao);
    const resumo = n.resumo || '';
    const conteudo = n.conteudo || n.resumo || 'Conteúdo em atualização.';
    const imagem = n.imagem || '';

    document.title = `${titulo} — Prefeitura de Vargem Grande do Rio Pardo`;

    if (hero) {
      hero.innerHTML = `
        <span class="cat">${esc(categoria)}</span>
        <h1>${esc(titulo)}</h1>
        <div class="date">${esc(data)}</div>
      `;
    }

    if (container) {
      container.className = 'layout';
      container.innerHTML = `
        <article class="article">
          ${imagem ? `<div class="cover" style="background-image:url('${esc(imagem)}')"></div>` : ''}
          <div class="article-body">
            ${resumo ? `<div class="summary">${esc(resumo)}</div>` : ''}
            <div class="content">${esc(conteudo)}</div>
          </div>
        </article>
        <aside class="side">
          <div class="box">
            <h3>Informações</h3>
            <p><strong>Categoria:</strong> ${esc(categoria)}</p>
            <p><strong>Publicado em:</strong> ${esc(data)}</p>
          </div>
          <div class="box">
            <h3>Compartilhar</h3>
            <p>Copie o link desta notícia para enviar a outras pessoas.</p>
            <div class="share">
              <button class="btn" onclick="navigator.clipboard.writeText(location.href).then(()=>alert('Link copiado!'))">Copiar link</button>
              <a class="btn" href="/">Voltar</a>
            </div>
          </div>
        </aside>
      `;
    }
  }

  async function load() {
    if (!API) {
      showError('API do portal não carregada.');
      return;
    }

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      showError('Notícia não encontrada.');
      return;
    }

    try {
      const res = await API.request(`/api/noticias.php?id=${encodeURIComponent(id)}`);
      if (!res.data) {
        showError('Notícia não encontrada.');
        return;
      }
      renderNoticia(res.data);
    } catch (error) {
      showError(error.message || 'Erro ao carregar notícia.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
