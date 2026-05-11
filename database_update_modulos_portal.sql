-- Atualização dos módulos do portal municipal.
-- Execute no phpMyAdmin para criar dados reais de Secretarias, Legislação, Diárias e Emendas.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS legislacao (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(60) NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  data_publicacao DATE DEFAULT NULL,
  ementa TEXT NOT NULL,
  situacao ENUM('vigente','revogada','alterada') NOT NULL DEFAULT 'vigente',
  arquivo VARCHAR(255) DEFAULT NULL,
  status ENUM('publicado','rascunho','arquivado') NOT NULL DEFAULT 'publicado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_data (status, data_publicacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS diarias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  beneficiario VARCHAR(160) NOT NULL,
  cargo VARCHAR(120) DEFAULT NULL,
  destino VARCHAR(160) DEFAULT NULL,
  atividade TEXT DEFAULT NULL,
  periodo VARCHAR(120) DEFAULT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  valor_total DECIMAL(12,2) DEFAULT 0,
  base_legal VARCHAR(160) DEFAULT NULL,
  status ENUM('publicado','rascunho','arquivado') NOT NULL DEFAULT 'publicado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emendas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parlamentar VARCHAR(160) NOT NULL,
  esfera VARCHAR(80) DEFAULT NULL,
  finalidade TEXT NOT NULL,
  valor DECIMAL(12,2) DEFAULT 0,
  status_execucao VARCHAR(80) DEFAULT 'Aguardando',
  fonte VARCHAR(160) DEFAULT NULL,
  ano INT DEFAULT NULL,
  status ENUM('publicado','rascunho','arquivado') NOT NULL DEFAULT 'publicado',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_ano (status, ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Garante colunas úteis em secretarias, caso a tabela antiga já exista.
ALTER TABLE secretarias
  ADD COLUMN IF NOT EXISTS ordem INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cor VARCHAR(20) DEFAULT '#2ecc40';

INSERT INTO secretarias (nome, responsavel, telefone, email, endereco, descricao, status, ordem, cor)
VALUES
('Gabinete do Prefeito', 'José Carlos Oliveira', '(38) 3847-1200', 'gabinete@vargemgrande.mg.gov.br', 'Praça XV de Novembro, 1 – Centro', 'Atendimento institucional, representação do município e coordenação geral da administração.', 'ativo', 1, '#2ecc40'),
('Secretaria de Saúde', 'Ana Paula Mendes', '(38) 3847-1230', 'saude@vargemgrande.mg.gov.br', 'Rua Getúlio Vargas, 80 – Centro', 'Gestão da saúde pública municipal, coordenação das UBS, campanhas de vacinação, vigilância sanitária e epidemiológica.', 'ativo', 2, '#388bfd'),
('Secretaria de Educação', 'Roberto Lima Santos', '(38) 3847-1245', 'educacao@vargemgrande.mg.gov.br', 'Av. Brasil, 250 – Centro', 'Gestão da rede municipal de ensino, transporte escolar, merenda, calendário escolar e apoio pedagógico.', 'ativo', 3, '#f5c518'),
('Secretaria de Obras', 'Carlos Eduardo Faria', '(38) 3847-1260', 'obras@vargemgrande.mg.gov.br', 'Rua João Pinheiro, 45 – Centro', 'Planejamento e execução de obras, pavimentação, construção, reforma de próprios municipais, zeladoria e iluminação pública.', 'ativo', 4, '#1a7a1a'),
('Secretaria de Finanças', 'Maria José Ferreira', '(38) 3847-1215', 'financas@vargemgrande.mg.gov.br', 'Praça XV de Novembro, 1 – Centro', 'Planejamento orçamentário, receitas, despesas, tributos, prestação de contas e controle financeiro.', 'ativo', 5, '#8b5cf6'),
('Secretaria de Administração', 'Paulo Ricardo Souza', '(38) 3847-1220', 'administracao@vargemgrande.mg.gov.br', 'Praça XV de Novembro, 1 – Centro', 'Recursos humanos, contratos administrativos, compras, patrimônio, protocolo e gestão administrativa.', 'ativo', 6, '#2ecc40')
ON DUPLICATE KEY UPDATE
  responsavel = VALUES(responsavel), telefone = VALUES(telefone), email = VALUES(email), endereco = VALUES(endereco), descricao = VALUES(descricao), status = VALUES(status);

INSERT INTO legislacao (numero, tipo, data_publicacao, ementa, situacao, status)
VALUES
('867/2025', 'Lei Ordinária', '2025-04-22', 'Dispõe sobre a Lei Orçamentária Anual (LOA) para o exercício de 2025 e dá outras providências.', 'vigente', 'publicado'),
('866/2025', 'Decreto', '2025-04-10', 'Regulamenta o Serviço de Informação ao Cidadão (SIC) no âmbito do Município de Vargem Grande do Rio Pardo.', 'vigente', 'publicado'),
('045/2020', 'Lei Complementar', '2020-12-15', 'Institui o Código Tributário Municipal e consolida a legislação tributária do Município.', 'vigente', 'publicado')
ON DUPLICATE KEY UPDATE ementa = VALUES(ementa);

INSERT INTO diarias (beneficiario, cargo, destino, atividade, periodo, quantidade, valor_total, base_legal, status)
VALUES
('José Carlos Oliveira', 'Prefeito Municipal', 'Belo Horizonte – MG', 'Reunião AMVAP – Consórcio Intermunicipal', '28-29/04/2025', 2, 900.00, 'Dec. 142/2024 Art. 3', 'publicado'),
('Carlos Eduardo Faria', 'Sec. de Obras', 'Belo Horizonte – MG', 'Capacitação CREA-MG – Fiscalização de Obras', '22-24/04/2025', 3, 1050.00, 'Dec. 142/2024 Art. 3', 'publicado'),
('Ana Paula Mendes', 'Sec. de Saúde', 'Montes Claros – MG', 'Reunião Regional de Saúde – SRS Montes Claros', '15/04/2025', 1, 350.00, 'Dec. 142/2024 Art. 3', 'publicado'),
('Maria José Ferreira', 'Sec. de Finanças', 'Belo Horizonte – MG', 'Capacitação SIOPE – Orçamento Público', '07-08/04/2025', 2, 700.00, 'Dec. 142/2024 Art. 3', 'publicado'),
('Roberto Lima Santos', 'Sec. de Educação', 'Belo Horizonte – MG', 'Reunião UNDIME-MG – Gestão Escolar 2025', '10-11/04/2025', 2, 700.00, 'Dec. 142/2024 Art. 3', 'publicado'),
('Luciana Rocha Costa', 'Sec. Assist. Social', 'Montes Claros – MG', 'Conferência Estadual de Assistência Social', '03-04/04/2025', 2, 700.00, 'Dec. 142/2024 Art. 3', 'publicado');

INSERT INTO emendas (parlamentar, esfera, finalidade, valor, status_execucao, fonte, ano, status)
VALUES
('Dep. Marcos Vinícius Silva', 'Federal', 'Equipamentos saúde – UBS Central', 450000.00, 'Repassado', 'Portal Federal', 2025, 'publicado'),
('Sen. Roberto Alves Costa', 'Federal', 'Pavimentação – Bairro Novo Horizonte', 780000.00, 'Aguardando', 'Portal Federal', 2025, 'publicado'),
('Dep. Patrícia Lima Rocha', 'Estadual', 'Reforma escola – EMEF João XXIII', 220000.00, 'Em execução', 'Portal Estadual', 2025, 'publicado');
