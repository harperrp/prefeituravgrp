<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $publicOnly = ($_GET['public'] ?? '1') === '1';
        $sql = 'SELECT * FROM emendas';
        if ($publicOnly) $sql .= " WHERE status = 'publicado'";
        $sql .= ' ORDER BY ano DESC, id DESC';
        $stmt = $pdo->query($sql);
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $parlamentar = trim((string)($input['parlamentar'] ?? ''));
        $finalidade = trim((string)($input['finalidade'] ?? ''));
        if ($parlamentar === '' || $finalidade === '') json_response(['success'=>false,'message'=>'Parlamentar e finalidade são obrigatórios.'],422);

        $esfera = trim((string)($input['esfera'] ?? ''));
        $valor = money_to_decimal($input['valor'] ?? 0);
        $statusExecucao = trim((string)($input['status_execucao'] ?? 'Aguardando'));
        $fonte = trim((string)($input['fonte'] ?? ''));
        $ano = !empty($input['ano']) ? (int)$input['ano'] : null;
        $status = in_array(($input['status'] ?? 'publicado'), ['publicado','rascunho','arquivado'], true) ? $input['status'] : 'publicado';

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE emendas SET parlamentar=?, esfera=?, finalidade=?, valor=?, status_execucao=?, fonte=?, ano=?, status=? WHERE id=?');
            $stmt->execute([$parlamentar,$esfera,$finalidade,$valor,$statusExecucao,$fonte,$ano,$status,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Emenda atualizada.']);
        }

        $stmt = $pdo->prepare('INSERT INTO emendas (parlamentar,esfera,finalidade,valor,status_execucao,fonte,ano,status) VALUES (?,?,?,?,?,?,?,?)');
        $stmt->execute([$parlamentar,$esfera,$finalidade,$valor,$statusExecucao,$fonte,$ano,$status]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Emenda cadastrada.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        $stmt = $pdo->prepare("UPDATE emendas SET status='arquivado' WHERE id=?");
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Emenda arquivada.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
