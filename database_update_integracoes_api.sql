-- Estrutura para configurar integrações externas/APIs no painel.
-- Execute no phpMyAdmin uma vez.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS integracoes_api (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(60) NOT NULL DEFAULT 'emendas',
  nome VARCHAR(160) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  endpoint VARCHAR(500) DEFAULT NULL,
  portal_url VARCHAR(500) DEFAULT NULL,
  fonte VARCHAR(160) DEFAULT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  ultimo_sync DATETIME DEFAULT NULL,
  ultimo_status VARCHAR(40) DEFAULT 'pendente',
  ultimo_erro TEXT DEFAULT NULL,
  config_json LONGTEXT DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tipo_ativo (tipo, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE emendas
  ADD COLUMN IF NOT EXISTS integracao_slug VARCHAR(100) DEFAULT NULL AFTER fonte,
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(160) DEFAULT NULL AFTER integracao_slug,
  ADD COLUMN IF NOT EXISTS sincronizado_em DATETIME DEFAULT NULL AFTER external_id;

INSERT INTO integracoes_api (tipo,nome,slug,endpoint,portal_url,fonte,ativo,ultimo_status,config_json) VALUES
('emendas','Emendas PIX — Federal','emendas_pix_federal','', 'https://portaldatransparencia.gov.br/', 'api.portaldatransparencia.gov.br', 1, 'pendente', '{"modo":"manual_endpoint","descricao":"Configure aqui a URL oficial/consulta filtrada do Portal da Transparência para transferências/emendas PIX do município."}'),
('emendas','Saúde — FNS/SUS','saude_fns','', 'https://consultafns.saude.gov.br/', 'opendatasus.saude.gov.br', 1, 'pendente', '{"modo":"manual_endpoint","descricao":"Configure aqui a URL pública/API do FNS ou OpenDataSUS usada para repasses da saúde."}'),
('emendas','Estaduais MG','estaduais_mg','', 'https://www.transparencia.mg.gov.br/', 'transparencia.mg.gov.br', 1, 'pendente', '{"modo":"manual_endpoint","descricao":"Configure aqui o endpoint ou URL de exportação de emendas estaduais de Minas Gerais."}'),
('emendas','Assist. Social — MDS','assist_social_mds','', 'https://aplicacoes.mds.gov.br/sagi/', 'aplicacoes.mds.gov.br', 1, 'pendente', '{"modo":"manual_endpoint","descricao":"Configure aqui o endpoint/CSV público de repasses da assistência social."}'),
('emendas','Convênios — Transferegov','convenios_transferegov','', 'https://www.gov.br/transferegov/', 'api.transferegov.gestao.gov.br', 1, 'pendente', '{"modo":"manual_endpoint","descricao":"Configure aqui a API/consulta do Transferegov para convênios do município."}')
ON DUPLICATE KEY UPDATE
  nome=VALUES(nome), portal_url=VALUES(portal_url), fonte=VALUES(fonte), ativo=VALUES(ativo);
