# Backend real (PHP + MySQL) para hospedagem Plesk (Value Host)

## 1) Arquivos
- `api/index.php`: endpoints JSON.
- `api/bootstrap.php`: conexão PDO + autenticação simples por token.
- `api/schema.sql`: criação das tabelas.
- `api_config.sample.php`: modelo de configuração.

## 2) Banco MySQL no Plesk
1. No Plesk, crie banco MySQL e usuário.
2. Importe `api/schema.sql` no phpMyAdmin.
3. Copie `api_config.sample.php` para `api_config.php` e preencha credenciais reais.

## 3) Publicação
- Suba todos os arquivos para a raiz do site (`httpdocs`).
- API ficará em: `https://radgov.com.br/api/index.php?r=noticias`

## 4) Endpoints
- `GET /api/index.php?r=noticias`
- `POST /api/index.php?r=noticias` (header `X-Admin-Token`)
- `DELETE /api/index.php?r=noticias/{id}` (header `X-Admin-Token`)
- `POST /api/index.php?r=ouvidoria`
- `GET /api/index.php?r=ouvidoria` (header `X-Admin-Token`)

## 5) Segurança mínima recomendada
- Trocar o `admin_token` por segredo forte.
- Ativar HTTPS forçado no Plesk.
- Bloquear acesso público a `api_config.php` via regra do servidor.
