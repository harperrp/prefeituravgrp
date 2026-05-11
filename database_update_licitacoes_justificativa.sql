-- Atualização da tabela de licitações para salvar justificativa e edital.
-- Execute no phpMyAdmin caso a coluna justificativa ainda não exista.

SET NAMES utf8mb4;

ALTER TABLE licitacoes
  ADD COLUMN IF NOT EXISTS justificativa TEXT DEFAULT NULL AFTER documento;
