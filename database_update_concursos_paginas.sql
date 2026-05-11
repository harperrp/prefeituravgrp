-- Concursos Públicos + páginas editáveis: Prefeitura e Transparência
-- Execute uma vez no phpMyAdmin.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS concursos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  publicacao DATE DEFAULT NULL,
  vagas INT DEFAULT 0,
  etapa VARCHAR(120) DEFAULT NULL,
  status ENUM('aberto','em_andamento','concluido','cancelado') NOT NULL DEFAULT 'aberto',
  edital VARCHAR(255) DEFAULT NULL,
  descricao TEXT DEFAULT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_publicacao (publicacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paginas_conteudo (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pagina VARCHAR(80) NOT NULL,
  bloco VARCHAR(100) NOT NULL,
  titulo VARCHAR(180) DEFAULT NULL,
  subtitulo VARCHAR(255) DEFAULT NULL,
  conteudo TEXT DEFAULT NULL,
  link_url VARCHAR(255) DEFAULT NULL,
  link_texto VARCHAR(120) DEFAULT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pagina_bloco (pagina, bloco),
  INDEX idx_pagina (pagina),
  INDEX idx_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO concursos (titulo, publicacao, vagas, etapa, status, edital, descricao) VALUES
('Concurso Público 2025','2025-04-01',24,'Inscrições Abertas','aberto',NULL,'Edital, andamento, inscrições e nomeações do Concurso Público 2025.'),
('Concurso Público 2022','2022-03-15',18,'Encerrado','concluido',NULL,'Processo encerrado com informações históricas disponíveis.')
ON DUPLICATE KEY UPDATE titulo=titulo;

INSERT INTO paginas_conteudo (pagina, bloco, titulo, subtitulo, conteudo, link_url, link_texto, ordem, ativo) VALUES
('prefeitura','gabinete','Gabinete do Prefeito',NULL,'Responsável: José Carlos Oliveira\nPraça XV de Novembro, 1 – Centro\n(38) 3847-1200\nSeg–Sex · 08h–17h\nCompetências: Atendimento institucional, representação do município e coordenação geral da administração.',NULL,NULL,1,1),
('prefeitura','saude','Secretaria de Saúde',NULL,'Responsável: Ana Paula Mendes\nRua Getúlio Vargas, 80 – Centro\n(38) 3847-1230\nSeg–Sex · 07h–19h\nCompetências: Gestão da saúde pública municipal, coordenação das UBS, campanhas de vacinação, vigilância sanitária e epidemiológica.',NULL,NULL,2,1),
('prefeitura','educacao','Secretaria de Educação',NULL,'Responsável: Roberto Lima Santos\nAv. Brasil, 250 – Centro\n(38) 3847-1245\nSeg–Sex · 08h–17h\nCompetências: Gestão da rede municipal de ensino, transporte escolar, merenda, calendário escolar e apoio pedagógico.',NULL,NULL,3,1),
('transparencia','lei_lai','Lei Federal nº 12.527/2011 — LAI',NULL,'Lei de Acesso à Informação',NULL,NULL,1,1),
('transparencia','decreto_mg','Decreto Estadual nº 45.969/2012',NULL,'Norma complementar de transparência pública.',NULL,NULL,2,1),
('transparencia','portal_mg','Portal Transparência MG',NULL,'Consulta de dados estaduais.',NULL,'Acessar',3,1),
('transparencia','portal_federal','Portal Transparência Federal',NULL,'Consulta de dados federais.',NULL,'Acessar',4,1),
('transparencia','sic','Contato institucional — SIC',NULL,'Canal de pedido de informação e ouvidoria.',NULL,'Solicitar',5,1)
ON DUPLICATE KEY UPDATE titulo=VALUES(titulo), conteudo=VALUES(conteudo), ordem=VALUES(ordem), ativo=VALUES(ativo);
