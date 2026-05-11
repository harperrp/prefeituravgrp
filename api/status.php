<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();
    $pdo->query('SELECT 1');

    json_response([
        'success' => true,
        'message' => 'API conectada ao banco com sucesso.',
        'database' => DB_NAME,
        'charset' => DB_CHARSET,
        'time' => date('Y-m-d H:i:s'),
    ]);
} catch (Throwable $e) {
    json_response([
        'success' => false,
        'message' => 'Erro ao conectar ao banco de dados.',
        'error' => $e->getMessage(),
    ], 500);
}
