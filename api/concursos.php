<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $public = isset($_GET['public']);
        $where = $public ? 'WHERE ativo=1' : '';
        $stmt = $pdo->query("SELECT * FROM concursos $where ORDER BY publicacao DESC, id DESC");
        json_response(['success'=>true,'data'=>$stmt->fetchAll()]);
    }

    if (method() === 'POST') {
        require_auth();
        $input = get_json_input();
        $id = (int)($input['id'] ?? 0);
        $titulo = trim((string)($input['titulo'] ?? ''));
        if ($titulo === '') json_response(['success'=>false,'message'=>'Título do concurso é obrigatório.'],422);

        $publicacao = trim((string)($input['publicacao'] ?? '')) ?: null;
        $vagas = (int)($input['vagas'] ?? 0);
        $etapa = trim((string)($input['etapa'] ?? ''));
        $status = in_array(($input['status'] ?? 'aberto'), ['aberto','em_andamento','concluido','cancelado'], true) ? $input['status'] : 'aberto';
        $edital = trim((string)($input['edital'] ?? ''));
        $descricao = trim((string)($input['descricao'] ?? ''));
        $ativo = isset($input['ativo']) ? (int)!!$input['ativo'] : 1;

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE concursos SET titulo=?, publicacao=?, vagas=?, etapa=?, status=?, edital=?, descricao=?, ativo=? WHERE id=?');
            $stmt->execute([$titulo,$publicacao,$vagas,$etapa,$status,$edital,$descricao,$ativo,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Concurso atualizado.']);
        }

        $stmt = $pdo->prepare('INSERT INTO concursos (titulo,publicacao,vagas,etapa,status,edital,descricao,ativo) VALUES (?,?,?,?,?,?,?,?)');
        $stmt->execute([$titulo,$publicacao,$vagas,$etapa,$status,$edital,$descricao,$ativo]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Concurso cadastrado.']);
    }

    if (method() === 'DELETE') {
        require_auth();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        $stmt = $pdo->prepare('UPDATE concursos SET ativo=0 WHERE id=?');
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Concurso arquivado.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
