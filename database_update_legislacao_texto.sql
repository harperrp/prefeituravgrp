-- Atualização de legislação para permitir texto completo e vinculações.
-- Execute no phpMyAdmin antes de testar o módulo completo.

SET NAMES utf8mb4;

ALTER TABLE legislacao
  ADD COLUMN IF NOT EXISTS vinculacoes VARCHAR(255) DEFAULT NULL AFTER situacao,
  ADD COLUMN IF NOT EXISTS texto LONGTEXT DEFAULT NULL AFTER vinculacoes;
