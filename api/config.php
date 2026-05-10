<?php
// Configuração central do sistema.
// Altere os dados abaixo conforme o banco da sua hospedagem.

declare(strict_types=1);

session_start();

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'prefeitura_vgrp');
define('DB_USER', getenv('DB_USER') ?: 'SEU_USUARIO_DO_BANCO');
define('DB_PASS', getenv('DB_PASS') ?: 'SUA_SENHA_DO_BANCO');
define('DB_CHARSET', 'utf8mb4');

define('UPLOAD_BASE_DIR', dirname(__DIR__) . '/uploads');
define('UPLOAD_BASE_URL', '/uploads');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function get_json_input(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_auth(): void
{
    if (empty($_SESSION['usuario_id'])) {
        json_response(['success' => false, 'message' => 'Acesso não autorizado. Faça login novamente.'], 401);
    }
}

function slugify(string $text): string
{
    $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    $text = preg_replace('~[^\pL\d]+~u', '-', $text ?: '');
    $text = trim((string)$text, '-');
    $text = strtolower($text);
    $text = preg_replace('~[^-a-z0-9]+~', '', $text);
    return $text ?: 'item-' . time();
}

function unique_slug(PDO $pdo, string $table, string $title, ?int $ignoreId = null): string
{
    $base = slugify($title);
    $slug = $base;
    $i = 2;

    while (true) {
        $sql = "SELECT id FROM {$table} WHERE slug = ?";
        $params = [$slug];

        if ($ignoreId) {
            $sql .= ' AND id <> ?';
            $params[] = $ignoreId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if (!$stmt->fetch()) {
            return $slug;
        }

        $slug = $base . '-' . $i;
        $i++;
    }
}

function money_to_decimal($value): float
{
    if (is_numeric($value)) {
        return (float)$value;
    }

    $value = str_replace(['R$', ' ', '.'], '', (string)$value);
    $value = str_replace(',', '.', $value);
    return (float)$value;
}

function method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}
