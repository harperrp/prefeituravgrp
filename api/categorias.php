<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $tipo = trim((string)($_GET['tipo'] ?? 'noticia'));
        $stmt = $pdo->prepare('SELECT * FROM categorias WHERE tipo = ? AND ativo = 1 ORDER BY ordem ASC, nome ASC');
        $stmt->execute([$tipo]);
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $nome = trim((string)($input['nome'] ?? ''));
        $tipo = trim((string)($input['tipo'] ?? 'noticia')) ?: 'noticia';
        $ordem = (int)($input['ordem'] ?? 0);
        $ativo = isset($input['ativo']) ? (int)!empty($input['ativo']) : 1;

        if ($nome === '') {
            json_response(['success' => false, 'message' => 'O nome da categoria é obrigatório.'], 422);
        }

        $slug = slugify($nome);

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE categorias SET nome=?, slug=?, tipo=?, ordem=?, ativo=? WHERE id=?');
            $stmt->execute([$nome, $slug, $tipo, $ordem, $ativo, $id]);
            json_response(['success' => true, 'id' => $id, 'message' => 'Categoria atualizada com sucesso.']);
        }

        $stmt = $pdo->prepare('INSERT INTO categorias (nome, slug, tipo, ordem, ativo) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$nome, $slug, $tipo, $ordem, $ativo]);
        json_response(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Categoria cadastrada com sucesso.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_response(['success' => false, 'message' => 'ID inválido.'], 422);
        }

        $stmt = $pdo->prepare('UPDATE categorias SET ativo = 0 WHERE id = ?');
        $stmt->execute([$id]);
        json_response(['success' => true, 'message' => 'Categoria desativada com sucesso.']);
    }

    json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    json_response(['success' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
