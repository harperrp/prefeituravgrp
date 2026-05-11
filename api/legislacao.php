<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id > 0) {
            $stmt = $pdo->prepare('SELECT * FROM legislacao WHERE id = ? LIMIT 1');
            $stmt->execute([$id]);
            json_response(['success' => true, 'data' => $stmt->fetch()]);
        }

        $publicOnly = ($_GET['public'] ?? '1') === '1';
        $sql = 'SELECT * FROM legislacao';
        if ($publicOnly) $sql .= " WHERE status = 'publicado'";
        $sql .= ' ORDER BY data_publicacao DESC, id DESC';
        $stmt = $pdo->query($sql);
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $numero = trim((string)($input['numero'] ?? ''));
        $tipo = trim((string)($input['tipo'] ?? ''));
        $ementa = trim((string)($input['ementa'] ?? ''));

        if ($numero === '' || $tipo === '' || $ementa === '') {
            json_response(['success' => false, 'message' => 'Número, tipo e ementa são obrigatórios.'], 422);
        }

        $data = !empty($input['data_publicacao']) ? $input['data_publicacao'] : null;
        $situacao = in_array(($input['situacao'] ?? 'vigente'), ['vigente','revogada','alterada'], true) ? $input['situacao'] : 'vigente';
        $arquivo = trim((string)($input['arquivo'] ?? ''));
        $vinculacoes = trim((string)($input['vinculacoes'] ?? ''));
        $texto = (string)($input['texto'] ?? '');
        $status = in_array(($input['status'] ?? 'publicado'), ['publicado','rascunho','arquivado'], true) ? $input['status'] : 'publicado';

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE legislacao SET numero=?, tipo=?, data_publicacao=?, ementa=?, situacao=?, vinculacoes=?, texto=?, arquivo=?, status=? WHERE id=?');
            $stmt->execute([$numero,$tipo,$data,$ementa,$situacao,$vinculacoes,$texto,$arquivo,$status,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Legislação atualizada.']);
        }

        $stmt = $pdo->prepare('INSERT INTO legislacao (numero,tipo,data_publicacao,ementa,situacao,vinculacoes,texto,arquivo,status) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$numero,$tipo,$data,$ementa,$situacao,$vinculacoes,$texto,$arquivo,$status]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Legislação cadastrada.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        $stmt = $pdo->prepare("UPDATE legislacao SET status='arquivado' WHERE id=?");
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Legislação arquivada.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
