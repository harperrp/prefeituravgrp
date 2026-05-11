<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $stmt = $pdo->query("SELECT * FROM secretarias WHERE status = 'ativo' ORDER BY ordem ASC, nome ASC");
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    require_auth();

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $nome = trim((string)($input['nome'] ?? ''));
        if ($nome === '') json_response(['success' => false, 'message' => 'Nome obrigatório.'], 422);

        $responsavel = trim((string)($input['responsavel'] ?? ''));
        $telefone = trim((string)($input['telefone'] ?? ''));
        $email = trim((string)($input['email'] ?? ''));
        $endereco = trim((string)($input['endereco'] ?? ''));
        $descricao = trim((string)($input['descricao'] ?? ''));
        $status = in_array(($input['status'] ?? 'ativo'), ['ativo','inativo'], true) ? $input['status'] : 'ativo';
        $ordem = (int)($input['ordem'] ?? 0);
        $cor = trim((string)($input['cor'] ?? '#2ecc40'));

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE secretarias SET nome=?, responsavel=?, telefone=?, email=?, endereco=?, descricao=?, status=?, ordem=?, cor=? WHERE id=?');
            $stmt->execute([$nome,$responsavel,$telefone,$email,$endereco,$descricao,$status,$ordem,$cor,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Secretaria atualizada.']);
        }

        $stmt = $pdo->prepare('INSERT INTO secretarias (nome,responsavel,telefone,email,endereco,descricao,status,ordem,cor) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$nome,$responsavel,$telefone,$email,$endereco,$descricao,$status,$ordem,$cor]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Secretaria cadastrada.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        $stmt = $pdo->prepare("UPDATE secretarias SET status='inativo' WHERE id=?");
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Secretaria desativada.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
