-- Estrutura complementar para usuários e permissões do painel.
-- Execute no phpMyAdmin uma vez.

SET NAMES utf8mb4;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(40) DEFAULT NULL AFTER email,
  ADD COLUMN IF NOT EXISTS ultimo_login DATETIME DEFAULT NULL AFTER ativo,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER ultimo_login,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em;

CREATE TABLE IF NOT EXISTS usuarios_permissoes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  modulo VARCHAR(80) NOT NULL,
  pode_ver TINYINT(1) NOT NULL DEFAULT 1,
  pode_criar TINYINT(1) NOT NULL DEFAULT 1,
  pode_editar TINYINT(1) NOT NULL DEFAULT 1,
  pode_excluir TINYINT(1) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_usuario_modulo (usuario_id, modulo),
  INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE usuarios SET perfil='administrador' WHERE perfil IN ('admin','Administrador','ADMIN');
UPDATE usuarios SET perfil='editor' WHERE perfil IS NULL OR perfil='';
