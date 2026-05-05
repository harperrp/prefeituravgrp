/**
 * ══════════════════════════════════════════════════════════════
 * INTEGRAÇÃO PAINEL ADMINISTRATIVO ↔ PORTAL PÚBLICO
 * ══════════════════════════════════════════════════════════════
 * Este script sincroniza dados do painel com o front-end
 * em tempo real usando LocalStorage e Fetch
 */

// ══ CONFIGURAÇÃO ══
const PAINEL_CONFIG = {
  dataFile: 'dados.json',
  updateInterval: 5000, // Atualizar a cada 5s
  storageKey: 'painel_dados',
  debug: true
};

// ══ FUNÇÕES DE LOG ══
const log = {
  info: (msg, data) => {
    if (PAINEL_CONFIG.debug) {
      console.log(`%c[PAINEL]%c ${msg}`, 'color: #2ecc40; font-weight: bold;', 'color: auto;', data || '');
    }
  },
  error: (msg, err) => {
    console.error(`%c[PAINEL ERROR]%c ${msg}`, 'color: #f85149; font-weight: bold;', 'color: auto;', err || '');
  }
};

// ══ CLASSE DE INTEGRAÇÃO ══
class PainelIntegracao {
  constructor() {
    this.dados = null;
    this.ultimaAtualizacao = null;
    this.listeners = [];
    this.init();
  }

  /**
   * Inicializa o sistema de integração
   */
  async init() {
    log.info('Inicializando integração painel-front');
    
    // Carregar dados do arquivo
    await this.carregarDados();
    
    // Sincronizar periodicamente
    setInterval(() => this.sincronizar(), PAINEL_CONFIG.updateInterval);
    
    // Listener de mudanças no storage (múltiplas abas)
    window.addEventListener('storage', (e) => {
      if (e.key === PAINEL_CONFIG.storageKey) {
        this.dados = JSON.parse(e.newValue);
        this.notificarListeners('storage-change');
        log.info('Dados atualizados de outra aba', this.dados);
      }
    });
  }

  /**
   * Carrega dados do arquivo JSON
   */
  async carregarDados() {
    try {
      const response = await fetch(PAINEL_CONFIG.dataFile);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      this.dados = await response.json();
      this.ultimaAtualizacao = new Date();
      
      // Armazenar no localStorage
      localStorage.setItem(PAINEL_CONFIG.storageKey, JSON.stringify(this.dados));
      
      log.info('Dados carregados com sucesso', this.dados);
      this.notificarListeners('loaded');
      
    } catch (err) {
      log.error('Erro ao carregar dados', err);
      
      // Tentar carregar do localStorage
      const cached = localStorage.getItem(PAINEL_CONFIG.storageKey);
      if (cached) {
        this.dados = JSON.parse(cached);
        log.info('Usando dados em cache', this.dados);
      }
    }
  }

  /**
   * Sincroniza dados com o servidor
   */
  async sincronizar() {
    try {
      await this.carregarDados();
      this.notificarListeners('sync');
    } catch (err) {
      log.error('Erro na sincronização', err);
    }
  }

  /**
   * Registra um listener para mudanças de dados
   */
  onChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notifica todos os listeners
   */
  notificarListeners(evento) {
    this.listeners.forEach(cb => {
      try {
        cb(evento, this.dados);
      } catch (err) {
        log.error('Erro em listener', err);
      }
    });
  }

  // ══ GETTERS PARA DADOS ══

  getNoticias() {
    return this.dados?.noticias || [];
  }

  getLicitacoes() {
    return this.dados?.licitacoes || [];
  }

  getDiarias() {
    return this.dados?.diarias || [];
  }

  getObras() {
    return this.dados?.obras || [];
  }

  getSecretarias() {
    return this.dados?.secretarias || [];
  }

  getFaq() {
    return this.dados?.faq || [];
  }

  getConfig() {
    return this.dados?.config || {};
  }

  /**
   * Busca um item específico
   */
  getItem(tipo, id) {
    const lista = this.dados?.[tipo] || [];
    return lista.find(item => item.id === id);
  }
}

// ══ INSTÂNCIA GLOBAL ══
const painel = new PainelIntegracao();

// ══ FUNÇÕES DE ATUALIZAÇÃO DO FRONT ══

/**
 * Atualizar seção de notícias no front
 */
function atualizarNoticias() {
  const noticias = painel.getNoticias();
  const featured = noticias[0];
  
  if (featured) {
    // Atualizar notícia destaque
    const nftImg = document.getElementById('nft');
    const nfeat = document.querySelector('.nfeat');
    
    if (nfeat) {
      nfeat.innerHTML = `
        <div class="nfimg"><div class="nfthumb"></div><div class="ntag">Destaque</div></div>
        <div class="nbody">
          <div class="ndate">${featured.data}</div>
          <div class="ntit">${featured.titulo}</div>
          <div class="nexc">${featured.resumo}</div>
        </div>
      `;
    }
  }
  
  log.info('Notícias atualizadas', noticias);
}

/**
 * Atualizar cards de acesso rápido com estatísticas
 */
function atualizarEstatisticas() {
  const licitacoes = painel.getLicitacoes();
  const obras = painel.getObras();
  const secretarias = painel.getSecretarias();
  
  // Atualizar numbers nos cards
  const stats = document.querySelectorAll('.stnum');
  if (stats[1]) stats[1].textContent = licitacoes.filter(l => l.status === 'aberto').length || '7';
  if (stats[2]) stats[2].textContent = obras.filter(o => o.status === 'andamento').length || '6';
  
  log.info('Estatísticas atualizadas');
}

/**
 * Atualizar tabela de licitações
 */
function atualizarLicitacoes() {
  const licitacoes = painel.getLicitacoes();
  const tbody = document.querySelector('#ltb tbody');
  
  if (tbody && licitacoes.length > 0) {
    tbody.innerHTML = licitacoes.map(lic => `
      <tr>
        <td><span class="mono tc" style="color:#1a7a1a">${lic.numero}</span></td>
        <td><span class="tc">${lic.objeto}</span></td>
        <td>${lic.modalidade}</td>
        <td class="mono">${lic.valor}</td>
        <td>${lic.abertura}</td>
        <td><span class="sp sp-info">${lic.fase}</span></td>
        <td><a href="#" style="color:#1a7a1a">Edital ↗</a></td>
      </tr>
    `).join('');
    
    log.info('Licitações atualizadas', licitacoes);
  }
}

/**
 * Atualizar tabela de obras
 */
function atualizarObras() {
  const obras = painel.getObras();
  const tbody = document.querySelector('#obras-tbody');
  
  if (tbody && obras.length > 0) {
    tbody.innerHTML = obras.map(obra => `
      <tr>
        <td><span class="tc">${obra.nome}</span></td>
        <td>${obra.secretaria}</td>
        <td class="mono">${obra.valor}</td>
        <td>${obra.inicio}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;min-width:100px">
            <div style="height:4px;flex:1;background:var(--bg4);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${obra.progresso}%;background:linear-gradient(90deg,#1a7a1a,#2ecc40);border-radius:2px"></div>
            </div>
            <span style="font-size:10px;color:var(--txt2)">${obra.progresso}%</span>
          </div>
        </td>
        <td><span class="sp sp-info">Em andamento</span></td>
      </tr>
    `).join('');
    
    log.info('Obras atualizadas', obras);
  }
}

/**
 * Atualizar estrutura organizacional (secretarias)
 */
function atualizarSecretarias() {
  const secretarias = painel.getSecretarias();
  const grid = document.querySelector('.sec-grid');
  
  if (grid && secretarias.length > 0) {
    grid.innerHTML = secretarias.slice(0, 8).map(sec => `
      <div class="sc">
        <div class="sc-bar" style="background:linear-gradient(90deg,#1a7a1a,#2ecc40)"></div>
        <div class="sc-body">
          <div class="sc-nome">${sec.nome}</div>
          <div class="sc-row"><strong>Responsável:</strong> ${sec.responsavel}</div>
          <div class="sc-row"><strong>Endereço:</strong> ${sec.endereco}</div>
          <div class="sc-row"><strong>Telefone:</strong> ${sec.telefone}</div>
          <div class="sc-row"><strong>Horário:</strong> ${sec.horario}</div>
        </div>
      </div>
    `).join('');
    
    log.info('Secretarias atualizadas', secretarias);
  }
}

/**
 * Atualizar FAQ
 */
function atualizarFaq() {
  const faq = painel.getFaq();
  const faqList = document.querySelector('.faq-list');
  
  if (faqList && faq.length > 0) {
    faqList.innerHTML = faq.map(item => `
      <div class="faq-item">
        <div class="faq-q" onclick="tFaq(this)">${item.pergunta}</div>
        <div class="faq-a">${item.resposta}</div>
      </div>
    `).join('');
    
    log.info('FAQ atualizado', faq);
  }
}

/**
 * Atualizar dados de contato (rodapé)
 */
function atualizarContato() {
  const config = painel.getConfig();
  const ftinfo = document.querySelector('.fti');
  
  if (ftinfo && config) {
    ftinfo.innerHTML = `
      <strong>${config.nome_prefeitura}</strong><br>
      ${config.endereco}<br>
      ${config.cep} — ${config.estado}<br>
      CNPJ: ${config.cnpj}<br>
      Telefone: <strong>${config.telefone}</strong><br>
      E-mail: ${config.email}
    `;
    
    log.info('Contato atualizado', config);
  }
}

// ══ LISTENER AUTOMÁTICO ══

painel.onChange((evento, dados) => {
  log.info(`Evento: ${evento}`);
  
  // Atualizar todas as seções quando dados mudam
  setTimeout(() => {
    atualizarNoticias();
    atualizarEstatisticas();
    atualizarLicitacoes();
    atualizarObras();
    atualizarSecretarias();
    atualizarFaq();
    atualizarContato();
    
    // Toast de confirmação
    if (window.showToast) {
      showToast('✅ Portal atualizado do painel administrativo', 'success');
    }
  }, 100);
});

// ══ INICIALIZAÇÃO AO CARREGAR A PÁGINA ══

document.addEventListener('DOMContentLoaded', () => {
  log.info('DOM carregado, aguardando dados do painel...');
  
  // Aguardar dados carregar
  const checkDados = setInterval(() => {
    if (painel.dados) {
      clearInterval(checkDados);
      
      // Atualizar todos os elementos
      atualizarNoticias();
      atualizarEstatisticas();
      atualizarLicitacoes();
      atualizarObras();
      atualizarSecretarias();
      atualizarFaq();
      atualizarContato();
      
      log.info('✅ Integração completada com sucesso');
    }
  }, 100);
  
  // Timeout de segurança
  setTimeout(() => clearInterval(checkDados), 3000);
});

// ══ API PÚBLICA (para o painel usar) ══

window.PainelAPI = {
  /**
   * Obtém todos os dados
   */
  getDados: () => painel.dados,
  
  /**
   * Atualiza uma notícia
   */
  atualizarNoticia: (id, novosDados) => {
    const noticia = painel.getItem('noticias', id);
    if (noticia) {
      Object.assign(noticia, novosDados);
      localStorage.setItem(PAINEL_CONFIG.storageKey, JSON.stringify(painel.dados));
      painel.notificarListeners('update');
    }
  },
  
  /**
   * Adiciona um novo item
   */
  adicionarItem: (tipo, item) => {
    if (!painel.dados[tipo]) painel.dados[tipo] = [];
    item.id = Math.max(...painel.dados[tipo].map(i => i.id || 0), 0) + 1;
    painel.dados[tipo].push(item);
    localStorage.setItem(PAINEL_CONFIG.storageKey, JSON.stringify(painel.dados));
    painel.notificarListeners('add');
    log.info(`Item adicionado em ${tipo}`, item);
  },
  
  /**
   * Remove um item
   */
  removerItem: (tipo, id) => {
    if (painel.dados[tipo]) {
      painel.dados[tipo] = painel.dados[tipo].filter(item => item.id !== id);
      localStorage.setItem(PAINEL_CONFIG.storageKey, JSON.stringify(painel.dados));
      painel.notificarListeners('remove');
      log.info(`Item ${id} removido de ${tipo}`);
    }
  },
  
  /**
   * Força sincronização
   */
  sincronizar: () => painel.sincronizar(),
  
  /**
   * Log de debug
   */
  debug: () => {
    console.table(painel.dados);
    return painel.dados;
  }
};

log.info('Script de integração carregado com sucesso');