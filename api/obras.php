<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id > 0) {
            $stmt = $pdo->prepare('SELECT * FROM obras WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            json_response(['success' => true, 'data' => $stmt->fetch()]);
        }

        $stmt = $pdo->query('SELECT * FROM obras ORDER BY atualizado_em DESC, id DESC');
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $nome = trim((string)($input['nome'] ?? ''));

        if ($nome === '') {
            json_response(['success' => false, 'message' => 'O nome da obra é obrigatório.'], 422);
        }

        $secretaria = trim((string)($input['secretaria'] ?? ''));
        $descricao = trim((string)($input['descricao'] ?? ''));
        $valor = money_to_decimal($input['valor'] ?? 0);
        $inicio = !empty($input['inicio']) ? $input['inicio'] : null;
        $previsao = !empty($input['previsao_entrega']) ? $input['previsao_entrega'] : null;
        $progresso = max(0, min(100, (int)($input['progresso'] ?? 0)));
        $status = in_array(($input['status'] ?? 'em_andamento'), ['planejada','em_andamento','concluida','paralisada'], true) ? $input['status'] : 'em_andamento';
        $imagem = trim((string)($input['imagem'] ?? ''));
        $localizacao = trim((string)($input['localizacao'] ?? ''));

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE obras SET nome=?, secretaria=?, descricao=?, valor=?, inicio=?, previsao_entrega=?, progresso=?, status=?, imagem=?, localizacao=? WHERE id=?');
            $stmt->execute([$nome, $secretaria, $descricao, $valor, $inicio, $previsao, $progresso, $status, $imagem, $localizacao, $id]);
            json_response(['success' => true, 'id' => $id, 'message' => 'Obra atualizada com sucesso.']);
        }

        $stmt = $pdo->prepare('INSERT INTO obras (nome, secretaria, descricao, valor, inicio, previsao_entrega, progresso, status, imagem, localizacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$nome, $secretaria, $descricao, $valor, $inicio, $previsao, $progresso, $status, $imagem, $localizacao]);
        json_response(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Obra cadastrada com sucesso.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success' => false, 'message' => 'ID inválido.'], 422);
        $stmt = $pdo->prepare('DELETE FROM obras WHERE id = ?');
        $stmt->execute([$id]);
        json_response(['success' => true, 'message' => 'Obra excluída com sucesso.']);
    }

    json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    json_response(['success' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
