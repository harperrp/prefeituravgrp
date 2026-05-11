// Categorias reais no modal original de Nova Notícia.
// Carrega as categorias do banco e aplica no select Categoria sem mudar o layout.

(function () {
  const API = window.PrefeituraAPI;
  if (!API || !API.categorias) {
    console.warn('API de categorias não encontrada. Atualize assets/js/api-client.js.');
    return;
  }

  let categoriasCache = [];
  let carregando = false;

  const norm = (txt) => String(txt || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function findModalNoticia() {
    return Array.from(document.querySelectorAll('.mo, .modal, [role="dialog"]')).find((modal) => {
      const texto = norm(modal.textContent);
      const style = getComputedStyle(modal);
      return texto.includes('noticia') && style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function findFieldByLabel(container, labelText, selector = 'input, textarea, select') {
    const grupos = Array.from(container.querySelectorAll('.fgrp, .field, div'));
    for (const grupo of grupos) {
      const label = grupo.querySelector('label');
      if (label && norm(label.textContent).includes(norm(labelText))) {
        const field = grupo.querySelector(selector);
        if (field) return field;
      }
    }

    return Array.from(container.querySelectorAll(selector)).find((field) => {
      const combined = norm(`${field.name || ''} ${field.id || ''} ${field.placeholder || ''} ${field.getAttribute('aria-label') || ''}`);
      return combined.includes(norm(labelText));
    });
  }

  async function carregarCategorias() {
    if (categoriasCache.length || carregando) return categoriasCache;
    carregando = true;
    try {
      const res = await API.categorias.listar('noticia');
      categoriasCache = res.data || [];
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      categoriasCache = [
        { nome: 'Transparência' },
        { nome: 'Institucional' },
        { nome: 'Administração' },
        { nome: 'Obras' },
        { nome: 'Saúde' },
        { nome: 'Educação' },
        { nome: 'Eventos' },
        { nome: 'Comunicados' },
      ];
    } finally {
      carregando = false;
    }
    return categoriasCache;
  }

  async function aplicarCategoriasNoModal() {
    const modal = findModalNoticia();
    if (!modal) return;

    const select = findFieldByLabel(modal, 'categoria', 'select');
    if (!select || select.dataset.categoriasApiAplicadas === '1') return;

    const categorias = await carregarCategorias();
    const atual = select.value;

    select.innerHTML = categorias.map((cat) => {
      const nome = cat.nome || cat.categoria || cat.titulo || '';
      return `<option value="${String(nome).replace(/"/g, '&quot;')}">${nome}</option>`;
    }).join('');

    if (atual && Array.from(select.options).some((op) => op.value === atual)) {
      select.value = atual;
    }

    select.dataset.categoriasApiAplicadas = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function atualizarPreviewBasico() {
    const modal = findModalNoticia();
    if (!modal) return;

    const titulo = findFieldByLabel(modal, 'titulo');
    const resumo = findFieldByLabel(modal, 'resumo', 'textarea, input');
    const data = findFieldByLabel(modal, 'data');

    const previewText = Array.from(modal.querySelectorAll('*')).filter((el) => el.children.length === 0);

    const tituloPreview = previewText.find((el) => norm(el.textContent).includes('titulo da noticia aqui'));
    if (tituloPreview && titulo?.value) tituloPreview.textContent = titulo.value;

    const resumoPreview = previewText.find((el) => norm(el.textContent).includes('resumo da noticia aparece aqui'));
    if (resumoPreview && resumo?.value) resumoPreview.textContent = resumo.value;

    const dataPreview = previewText.find((el) => /\d{2}\s+mai\s+\d{4}|01 mai 2025/i.test(el.textContent));
    if (dataPreview && data?.value) {
      const d = new Date(data.value + 'T09:00:00');
      if (!Number.isNaN(d.getTime())) {
        dataPreview.textContent = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').toUpperCase();
      }
    }
  }

  function bindPreviewEvents() {
    document.addEventListener('input', (ev) => {
      const modal = findModalNoticia();
      if (modal && modal.contains(ev.target)) atualizarPreviewBasico();
    });
    document.addEventListener('change', (ev) => {
      const modal = findModalNoticia();
      if (modal && modal.contains(ev.target)) atualizarPreviewBasico();
    });
  }

  function observarAberturaDoModal() {
    const rodar = () => {
      aplicarCategoriasNoModal();
      atualizarPreviewBasico();
    };

    document.addEventListener('click', () => setTimeout(rodar, 150), true);
    const observer = new MutationObserver(() => setTimeout(rodar, 80));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observarAberturaDoModal();
      bindPreviewEvents();
      aplicarCategoriasNoModal();
    });
  } else {
    observarAberturaDoModal();
    bindPreviewEvents();
    aplicarCategoriasNoModal();
  }
})();
