-- Atualização para criar categorias reais das notícias.
-- Rode este arquivo no phpMyAdmin caso o banco já tenha sido importado antes.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS categorias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  tipo ENUM('noticia','obra','licitacao','servico') NOT NULL DEFAULT 'noticia',
  ordem INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_categoria_tipo_slug (tipo, slug),
  INDEX idx_tipo_ativo_ordem (tipo, ativo, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categorias (nome, slug, tipo, ordem, ativo) VALUES
('Transparência', 'transparencia', 'noticia', 1, 1),
('Institucional', 'institucional', 'noticia', 2, 1),
('Administração', 'administracao', 'noticia', 3, 1),
('Obras', 'obras', 'noticia', 4, 1),
('Saúde', 'saude', 'noticia', 5, 1),
('Educação', 'educacao', 'noticia', 6, 1),
('Assistência Social', 'assistencia-social', 'noticia', 7, 1),
('Eventos', 'eventos', 'noticia', 8, 1),
('Comunicados', 'comunicados', 'noticia', 9, 1)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  ordem = VALUES(ordem),
  ativo = VALUES(ativo);
