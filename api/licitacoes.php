<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id > 0) {
            $stmt = $pdo->prepare('SELECT * FROM licitacoes WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            json_response(['success' => true, 'data' => $stmt->fetch()]);
        }

        $stmt = $pdo->query('SELECT * FROM licitacoes ORDER BY abertura DESC, id DESC');
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $processo = trim((string)($input['processo'] ?? ''));
        $objeto = trim((string)($input['objeto'] ?? ''));

        if ($processo === '' || $objeto === '') {
            json_response(['success' => false, 'message' => 'Processo e objeto são obrigatórios.'], 422);
        }

        $modalidade = trim((string)($input['modalidade'] ?? ''));
        $valor = money_to_decimal($input['valor'] ?? 0);
        $abertura = !empty($input['abertura']) ? $input['abertura'] : null;
        $status = in_array(($input['status'] ?? 'aberto'), ['aberto','em_andamento','homologado','encerrado','cancelado'], true) ? $input['status'] : 'aberto';
        $documento = trim((string)($input['documento'] ?? ''));

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE licitacoes SET processo=?, objeto=?, modalidade=?, valor=?, abertura=?, status=?, documento=? WHERE id=?');
            $stmt->execute([$processo, $objeto, $modalidade, $valor, $abertura, $status, $documento, $id]);
            json_response(['success' => true, 'id' => $id, 'message' => 'Licitação atualizada com sucesso.']);
        }

        $stmt = $pdo->prepare('INSERT INTO licitacoes (processo, objeto, modalidade, valor, abertura, status, documento) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$processo, $objeto, $modalidade, $valor, $abertura, $status, $documento]);
        json_response(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Licitação cadastrada com sucesso.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success' => false, 'message' => 'ID inválido.'], 422);
        $stmt = $pdo->prepare('DELETE FROM licitacoes WHERE id = ?');
        $stmt->execute([$id]);
        json_response(['success' => true, 'message' => 'Licitação excluída com sucesso.']);
    }

    json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
} catch (Throwable $e) {
    json_response(['success' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
