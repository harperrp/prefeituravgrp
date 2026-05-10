-- Banco de dados do Portal da Prefeitura de Vargem Grande do Rio Pardo
-- Importe este arquivo no phpMyAdmin/MySQL antes de usar o painel.

CREATE DATABASE IF NOT EXISTS prefeitura_vgrp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE prefeitura_vgrp;

SET NAMES utf8mb4;
SET time_zone = '-03:00';

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('admin','editor') NOT NULL DEFAULT 'admin',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS noticias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  categoria VARCHAR(120) DEFAULT NULL,
  resumo TEXT DEFAULT NULL,
  conteudo LONGTEXT DEFAULT NULL,
  imagem VARCHAR(255) DEFAULT NULL,
  autor VARCHAR(120) DEFAULT 'Admin',
  status ENUM('rascunho','publicado','arquivado') NOT NULL DEFAULT 'publicado',
  destaque TINYINT(1) NOT NULL DEFAULT 0,
  data_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_data (status, data_publicacao),
  INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS obras (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  secretaria VARCHAR(160) DEFAULT NULL,
  descricao TEXT DEFAULT NULL,
  valor DECIMAL(12,2) DEFAULT 0,
  inicio DATE DEFAULT NULL,
  previsao_entrega DATE DEFAULT NULL,
  progresso INT NOT NULL DEFAULT 0,
  status ENUM('planejada','em_andamento','concluida','paralisada') NOT NULL DEFAULT 'em_andamento',
  imagem VARCHAR(255) DEFAULT NULL,
  localizacao VARCHAR(255) DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS licitacoes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  processo VARCHAR(80) NOT NULL,
  objeto TEXT NOT NULL,
  modalidade VARCHAR(120) DEFAULT NULL,
  valor DECIMAL(12,2) DEFAULT 0,
  abertura DATETIME DEFAULT NULL,
  status ENUM('aberto','em_andamento','homologado','encerrado','cancelado') NOT NULL DEFAULT 'aberto',
  documento VARCHAR(255) DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_abertura (status, abertura)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS secretarias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(180) NOT NULL,
  responsavel VARCHAR(160) DEFAULT NULL,
  telefone VARCHAR(60) DEFAULT NULL,
  email VARCHAR(160) DEFAULT NULL,
  endereco VARCHAR(255) DEFAULT NULL,
  descricao TEXT DEFAULT NULL,
  status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banners (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  subtitulo VARCHAR(255) DEFAULT NULL,
  imagem VARCHAR(255) DEFAULT NULL,
  link VARCHAR(255) DEFAULT NULL,
  ordem INT NOT NULL DEFAULT 0,
  status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
VALUES ('Administrador', 'admin@vgrp.local', '$2y$12$e2AqxCJR/nePHS.SNcnKKeRfi6fYwNV7E1k.7jsh8df7dgsRepIWy', 'admin', 1)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO noticias (titulo, slug, categoria, resumo, conteudo, autor, status, destaque, data_publicacao)
VALUES
('Portal oficial em atualização', 'portal-oficial-em-atualizacao', 'Institucional', 'O portal oficial da Prefeitura está sendo preparado para receber conteúdos dinâmicos.', 'Conteúdo completo da notícia.', 'Admin', 'publicado', 1, NOW()),
('Ações municipais em destaque', 'acoes-municipais-em-destaque', 'Administração', 'Novas ações da gestão municipal serão publicadas neste espaço.', 'Conteúdo completo da notícia.', 'Admin', 'publicado', 0, NOW())
ON DUPLICATE KEY UPDATE titulo = VALUES(titulo);

INSERT INTO obras (nome, secretaria, descricao, valor, progresso, status, localizacao)
VALUES
('Pavimentação de vias urbanas', 'Secretaria de Obras', 'Obra de pavimentação e melhoria da mobilidade urbana.', 280000.00, 38, 'em_andamento', 'Centro'),
('Reforma de unidade pública', 'Secretaria de Saúde', 'Reforma e adequação de prédio público municipal.', 145000.00, 72, 'em_andamento', 'Sede')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO licitacoes (processo, objeto, modalidade, valor, abertura, status)
VALUES
('012/2025', 'Aquisição de medicamentos para atendimento da rede municipal.', 'Pregão Eletrônico', 380000.00, '2025-05-15 09:00:00', 'aberto'),
('011/2025', 'Contratação de empresa para reforma de equipamento público.', 'Concorrência', 920000.00, '2025-05-08 09:00:00', 'em_andamento');
