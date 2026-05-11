<?php
require_once __DIR__ . '/config.php';

function protocolo_ouvidoria(string $tipo): string
{
    $prefix = $tipo === 'sic' ? 'SIC' : 'OUV';
    return $prefix . '-' . date('Y') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
}

try {
    $pdo = db();

    if (method() === 'GET') {
        $protocolo = trim((string)($_GET['protocolo'] ?? ''));
        if ($protocolo !== '') {
            $stmt = $pdo->prepare('SELECT protocolo,tipo,categoria,assunto,mensagem,resposta,status,prazo_resposta,respondido_em,criado_em FROM ouvidoria_sic WHERE protocolo=? LIMIT 1');
            $stmt->execute([$protocolo]);
            $row = $stmt->fetch();
            if (!$row) json_response(['success'=>false,'message'=>'Protocolo não encontrado.'],404);
            json_response(['success'=>true,'data'=>$row]);
        }

        require_auth();
        $tipo = $_GET['tipo'] ?? '';
        $status = $_GET['status'] ?? '';
        $where = [];
        $params = [];
        if (in_array($tipo, ['sic','ouvidoria'], true)) { $where[] = 'tipo=?'; $params[] = $tipo; }
        if (in_array($status, ['novo','em_analise','respondido','arquivado'], true)) { $where[] = 'status=?'; $params[] = $status; }
        $sql = 'SELECT * FROM ouvidoria_sic';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY criado_em DESC, id DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response(['success'=>true,'data'=>$stmt->fetchAll()]);
    }

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;

        if ($id > 0) {
            require_auth();
            $status = in_array(($input['status'] ?? 'em_analise'), ['novo','em_analise','respondido','arquivado'], true) ? $input['status'] : 'em_analise';
            $resposta = trim((string)($input['resposta'] ?? ''));
            $respondidoEm = $status === 'respondido' ? date('Y-m-d H:i:s') : null;
            $stmt = $pdo->prepare('UPDATE ouvidoria_sic SET status=?, resposta=?, respondido_em=COALESCE(?, respondido_em) WHERE id=?');
            $stmt->execute([$status,$resposta,$respondidoEm,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Atendimento atualizado.']);
        }

        $tipo = in_array(($input['tipo'] ?? 'ouvidoria'), ['sic','ouvidoria'], true) ? $input['tipo'] : 'ouvidoria';
        $assunto = trim((string)($input['assunto'] ?? ''));
        $mensagem = trim((string)($input['mensagem'] ?? ''));
        if ($assunto === '' || $mensagem === '') {
            json_response(['success'=>false,'message'=>'Assunto e mensagem são obrigatórios.'],422);
        }

        $protocolo = protocolo_ouvidoria($tipo);
        $prazo = $tipo === 'sic' ? date('Y-m-d', strtotime('+20 days')) : null;
        $stmt = $pdo->prepare('INSERT INTO ouvidoria_sic (protocolo,tipo,categoria,nome,email,telefone,documento,assunto,mensagem,status,prazo_resposta) VALUES (?,?,?,?,?,?,?,?,?,"novo",?)');
        $stmt->execute([
            $protocolo,
            $tipo,
            trim((string)($input['categoria'] ?? '')),
            trim((string)($input['nome'] ?? '')),
            trim((string)($input['email'] ?? '')),
            trim((string)($input['telefone'] ?? '')),
            trim((string)($input['documento'] ?? '')),
            $assunto,
            $mensagem,
            $prazo
        ]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'protocolo'=>$protocolo,'prazo_resposta'=>$prazo,'message'=>'Manifestação registrada com sucesso.']);
    }

    if (method() === 'DELETE') {
        require_auth();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        $stmt = $pdo->prepare("UPDATE ouvidoria_sic SET status='arquivado' WHERE id=?");
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Atendimento arquivado.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
