-- Estrutura para Ouvidoria / SIC.
-- Execute no phpMyAdmin uma vez.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ouvidoria_sic (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  protocolo VARCHAR(40) NOT NULL UNIQUE,
  tipo ENUM('sic','ouvidoria') NOT NULL DEFAULT 'ouvidoria',
  categoria VARCHAR(80) DEFAULT NULL,
  nome VARCHAR(160) DEFAULT NULL,
  email VARCHAR(180) DEFAULT NULL,
  telefone VARCHAR(40) DEFAULT NULL,
  documento VARCHAR(40) DEFAULT NULL,
  assunto VARCHAR(180) NOT NULL,
  mensagem TEXT NOT NULL,
  resposta TEXT DEFAULT NULL,
  status ENUM('novo','em_analise','respondido','arquivado') NOT NULL DEFAULT 'novo',
  prazo_resposta DATE DEFAULT NULL,
  respondido_em DATETIME DEFAULT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tipo_status (tipo, status),
  INDEX idx_protocolo (protocolo),
  INDEX idx_criado (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ouvidoria_sic (protocolo,tipo,categoria,nome,email,telefone,assunto,mensagem,status,prazo_resposta) VALUES
('SIC-2025-0001','sic','Pedido de informação','Cidadão Exemplo','cidadao@example.com','(38) 99999-0000','Pedido sobre obras públicas','Solicito informações sobre o andamento das obras cadastradas no portal.','novo', DATE_ADD(CURDATE(), INTERVAL 20 DAY)),
('OUV-2025-0001','ouvidoria','Sugestão','Morador Exemplo','morador@example.com','(38) 99999-1111','Sugestão de melhoria','Sugiro melhoria no atendimento digital da prefeitura.','em_analise', NULL)
ON DUPLICATE KEY UPDATE protocolo=protocolo;
