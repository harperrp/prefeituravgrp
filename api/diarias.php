<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $publicOnly = ($_GET['public'] ?? '1') === '1';
        $sql = 'SELECT * FROM diarias';
        if ($publicOnly) $sql .= " WHERE status = 'publicado'";
        $sql .= ' ORDER BY id DESC';
        $stmt = $pdo->query($sql);
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $beneficiario = trim((string)($input['beneficiario'] ?? ''));
        if ($beneficiario === '') json_response(['success'=>false,'message'=>'Beneficiário obrigatório.'],422);

        $cargo = trim((string)($input['cargo'] ?? ''));
        $destino = trim((string)($input['destino'] ?? ''));
        $atividade = trim((string)($input['atividade'] ?? ''));
        $periodo = trim((string)($input['periodo'] ?? ''));
        $quantidade = (int)($input['quantidade'] ?? 1);
        $valor = money_to_decimal($input['valor_total'] ?? 0);
        $base = trim((string)($input['base_legal'] ?? ''));
        $status = in_array(($input['status'] ?? 'publicado'), ['publicado','rascunho','arquivado'], true) ? $input['status'] : 'publicado';

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE diarias SET beneficiario=?, cargo=?, destino=?, atividade=?, periodo=?, quantidade=?, valor_total=?, base_legal=?, status=? WHERE id=?');
            $stmt->execute([$beneficiario,$cargo,$destino,$atividade,$periodo,$quantidade,$valor,$base,$status,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Diária atualizada.']);
        }

        $stmt = $pdo->prepare('INSERT INTO diarias (beneficiario,cargo,destino,atividade,periodo,quantidade,valor_total,base_legal,status) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$beneficiario,$cargo,$destino,$atividade,$periodo,$quantidade,$valor,$base,$status]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Diária cadastrada.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        $stmt = $pdo->prepare("UPDATE diarias SET status='arquivado' WHERE id=?");
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Diária arquivada.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
