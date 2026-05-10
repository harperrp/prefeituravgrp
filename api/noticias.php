<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

        if ($id > 0) {
            $stmt = $pdo->prepare('SELECT * FROM noticias WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            $item = $stmt->fetch();
            json_response(['success' => true, 'data' => $item]);
        }

        $publicOnly = ($_GET['public'] ?? '') === '1';
        $limit = max(1, min(50, (int)($_GET['limit'] ?? 20)));

        $sql = 'SELECT * FROM noticias';
        $params = [];

        if ($publicOnly) {
            $sql .= " WHERE status = 'publicado'";
        }

        $sql .= ' ORDER BY destaque DESC, data_publicacao DESC, id DESC LIMIT ' . $limit;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $titulo = trim((string)($input['titulo'] ?? ''));

        if ($titulo === '') {
            json_response(['success' => false, 'message' => 'O título é obrigatório.'], 422);
        }

        $categoria = trim((string)($input['categoria'] ?? ''));
        $resumo = trim((string)($input['resumo'] ?? ''));
        $conteudo = trim((string)($input['conteudo'] ?? ''));
        $imagem = trim((string)($input['imagem'] ?? ''));
        $autor = trim((string)($input['autor'] ?? ($_SESSION['usuario_nome'] ?? 'Admin')));
        $status = in_array(($input['status'] ?? 'publicado'), ['rascunho','publicado','arquivado'], true) ? $input['status'] : 'publicado';
        $destaque = !empty($input['destaque']) ? 1 : 0;
        $dataPublicacao = !empty($input['data_publicacao']) ? $input['data_publicacao'] : date('Y-m-d H:i:s');
        $slug = unique_slug($pdo, 'noticias', $titulo, $id ?: null);

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE noticias SET titulo=?, slug=?, categoria=?, resumo=?, conteudo=?, imagem=?, autor=?, status=?, destaque=?, data_publicacao=? WHERE id=?');
            $stmt->execute([$titulo, $slug, $categoria, $resumo, $conteudo, $imagem, $autor, $status, $destaque, $dataPublicacao, $id]);
            json_response(['success' => true, 'id' => $id, 'message' => 'Notícia atualizada com sucesso.']);
        }

        $stmt = $pdo->prepare('INSERT INTO noticias (titulo, slug, categoria, resumo, conteudo, imagem, autor, status, destaque, data_publicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$titulo, $slug, $categoria, $resumo, $conteudo, $imagem, $autor, $status, $destaque, $dataPublicacao]);
        json_response(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Notícia cadastrada com sucesso.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            json_response(['success' => false, 'message' => 'ID inválido.'], 422);
        }

        $stmt = $pdo->prepare('DELETE FROM noticias WHERE id = ?');
        $stmt->execute([$id]);
        json_response(['success' => true, 'message' => 'Notícia excluída com sucesso.']);
    }

    json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    json_response(['success' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
