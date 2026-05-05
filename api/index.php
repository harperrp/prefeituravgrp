<?php
require __DIR__ . '/bootstrap.php';
$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['r'] ?? '';

if ($path === 'noticias' && $method === 'GET') {
    $rows = db()->query('SELECT * FROM noticias ORDER BY data_publicacao DESC LIMIT 20')->fetchAll();
    json($rows);
}
if ($path === 'noticias' && $method === 'POST') {
    requireAdmin();
    $b = body();
    $stmt = db()->prepare('INSERT INTO noticias (titulo,resumo,data_publicacao,categoria,link) VALUES (?,?,?,?,?)');
    $stmt->execute([$b['titulo'] ?? '', $b['resumo'] ?? '', $b['data_publicacao'] ?? date('Y-m-d'), $b['categoria'] ?? 'Geral', $b['link'] ?? null]);
    json(['ok' => true, 'id' => db()->lastInsertId()], 201);
}
if (preg_match('#^noticias/(\d+)$#', $path, $m) && $method === 'DELETE') {
    requireAdmin();
    db()->prepare('DELETE FROM noticias WHERE id=?')->execute([$m[1]]);
    json(['ok' => true]);
}
if ($path === 'ouvidoria' && $method === 'POST') {
    $b = body();
    $protocolo = 'SIC-' . date('Ymd') . '-' . random_int(1000,9999);
    $stmt = db()->prepare('INSERT INTO ouvidoria (protocolo,nome,email,tipo,mensagem) VALUES (?,?,?,?,?)');
    $stmt->execute([$protocolo, $b['nome'] ?? '', $b['email'] ?? '', $b['tipo'] ?? 'Pedido', $b['mensagem'] ?? '']);
    json(['ok' => true, 'protocolo' => $protocolo], 201);
}
if ($path === 'ouvidoria' && $method === 'GET') {
    requireAdmin();
    $rows = db()->query('SELECT * FROM ouvidoria ORDER BY created_at DESC LIMIT 100')->fetchAll();
    json($rows);
}
json(['error' => 'Rota não encontrada'], 404);
