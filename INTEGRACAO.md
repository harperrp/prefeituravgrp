# Integração Painel Administrativo ↔ Portal Público

## 📋 O que foi criado

### 1. **dados.json** 
Arquivo centralizado com todos os dados que o painel gerencia:
- Notícias e eventos
- Licitações e contratos
- Diárias de viagem
- Obras públicas
- Estrutura organizacional (secretarias)
- FAQ
- Configurações da prefeitura

### 2. **integracao-painel.js**
Script de integração bidirecional que:
- Carrega dados de `dados.json`
- Sincroniza com localStorage para acesso rápido
- Atualiza a página automaticamente quando dados mudam
- Fornece API pública para o painel atualizar dados
- Sincroniza entre múltiplas abas do navegador

---

## 🚀 Como implementar

### Passo 1: Adicionar o script ao `index.html`

No final do `<body>` do seu `index.html`, adicione:

```html
<!-- INTEGRAÇÃO COM PAINEL ADMINISTRATIVO -->
<script src="integracao-painel.js"></script>
```

**Colocar APÓS as funções globais mas ANTES do fechamento `</body>`**

### Passo 2: Adicionar ID à tabela de licitações

Encontre a tabela de licitações no index.html e adicione um id:

```html
<table id="ltb"><thead><tr>
  <th>N° Processo</th>
  <!-- resto da tabela -->
</tr></thead><tbody>
  <!-- dados aqui -->
</tbody></table>
```

### Passo 3: Adicionar IDs aos elementos dinâmicos

No index.html, identifique elementos que precisam ser atualizados:

```html
<!-- Notícia destaque -->
<a href="#" class="nfeat">
  <div class="nfimg"><div class="nfthumb" id="nft"></div>...
  
<!-- Grid de secretarias -->
<div class="sec-grid">...

<!-- Lista FAQ -->
<div class="faq-list">...

<!-- Rodapé com info de contato -->
<div class="fti">...
```

### Passo 4: No painel-adm.html, usar a API para atualizar

Quando o painel salva dados, chame:

```javascript
// Adicionar uma nova notícia
PainelAPI.adicionarItem('noticias', {
  titulo: 'Nova Notícia',
  categoria: 'Transparência',
  data: new Date().toLocaleDateString('pt-BR'),
  status: 'publicada',
  resumo: 'Resumo da notícia',
  autor: 'Admin'
});

// O front será atualizado automaticamente em todas as abas!
```

---

## 📡 Fluxo de Sincronização

```
PAINEL ADMINISTRATIVO (painel-adm.html)
         ↓
    PainelAPI.adicionarItem()
         ↓
  localStorage atualizado
         ↓
PORTAL PÚBLICO (index.html) ← Detecta mudança
         ↓
  Atualiza todos os elementos automaticamente
         ↓
  Exibe toast: "✅ Portal atualizado do painel"
```

---

## 🔄 Sincronização em Tempo Real

Toda vez que você:

- ✏️ Edita um item no painel
- ➕ Adiciona um novo item
- 🗑️ Remove um item
- 📤 Faz upload de documento

O portal será atualizado automaticamente em:

- ✅ A mesma aba
- ✅ Outras abas abertas do navegador
- ✅ Novo acesso ao portal

---

## 🔗 Funções Disponíveis (API Pública)

```javascript
// Obter todos os dados
PainelAPI.getDados();

// Adicionar novo item
PainelAPI.adicionarItem('tipo', { dados });

// Atualizar um item
PainelAPI.atualizarNoticia(id, { novos_dados });

// Remover um item
PainelAPI.removerItem('tipo', id);

// Forçar sincronização
PainelAPI.sincronizar();

// Debug - ver todos os dados na console
PainelAPI.debug();
```

---

## 🎯 O que será Atualizado Automaticamente

| Seção | Dado | Origem |
|-------|------|--------|
| Notícias | Título, Data, Resumo | dados.json |
| Licitações | Número, Objeto, Valor, Fase | dados.json |
| Diárias | Beneficiário, Cargo, Destino | dados.json |
| Obras | Nome, Valor, Progresso | dados.json |
| Secretarias | Todos os dados | dados.json |
| FAQ | Perguntas e respostas | dados.json |
| Contato (rodapé) | Telefone, Email, Endereço | dados.json |

---

## ⚡ Exemplo de Uso no Painel

Ao salvar uma nova notícia no painel:

```javascript
// Quando usuário clica em "Publicar"
function publicarNoticia() {
  const titulo = document.querySelector('input[name="titulo"]').value;
  const categoria = document.querySelector('select[name="categoria"]').value;
  const resumo = document.querySelector('textarea[name="resumo"]').value;

  // Atualizar via API
  PainelAPI.adicionarItem('noticias', {
    titulo: titulo,
    categoria: categoria,
    data: new Date().toLocaleDateString('pt-BR'),
    status: 'publicada',
    resumo: resumo,
    autor: 'Admin'
  });

  // Toast de sucesso
  showToast('✅ Notícia publicada e portal atualizado!', 'success');
  
  // Limpar formulário
  document.querySelector('form').reset();
}
```

---

## 🔒 Segurança

- ✅ Dados salvos em localStorage (local do navegador)
- ✅ Sincronização automática entre abas
- ✅ Sem necessidade de servidor para funcionar
- ⚠️ Em produção, integrar com backend para persistência

---

## 📱 Compatibilidade

- ✅ Chrome, Firefox, Safari, Edge
- ✅ Desktop e Mobile
- ✅ Múltiplas abas sincronizadas
- ✅ Funciona offline (com dados em cache)

---

## 🐛 Debug

Abra o console do navegador e use:

```javascript
// Ver todos os dados
PainelAPI.debug();

// Ver logs detalhados (já está ativado)
// Procure por mensagens [PAINEL] em verde

// Forçar sincronização
PainelAPI.sincronizar();
```

---

## 📞 Próximas Melhorias

- Backend integrado: Salvar em banco de dados permanentemente
- Notificações push: Avisar admin quando há atualizações no portal
- Histórico de versões: Rastrear todas as mudanças
- Permissões granulares: Diferentes usuários com acesso a diferentes seções
- Aprovação de conteúdo: Fluxo de revisão antes de publicar

---

## ✅ Checklist de Implementação

- [ ] Adicionar `integracao-painel.js` ao final do `<body>` em `index.html`
- [ ] Adicionar `id="ltb"` à tabela de licitações
- [ ] Adicionar `id="nft"` ao elemento de imagem de notícia destaque
- [ ] Testar abrindo DevTools (F12) e verificando logs `[PAINEL]`
- [ ] Fazer uma alteração no painel e verificar se portal atualiza
- [ ] Testar em múltiplas abas
- [ ] Verificar localStorage em Application → Local Storage
