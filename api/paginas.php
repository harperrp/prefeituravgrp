<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = db();

    if (method() === 'GET') {
        $pagina = trim((string)($_GET['pagina'] ?? ''));
        if ($pagina === '') json_response(['success'=>false,'message'=>'Página não informada.'],422);
        $public = isset($_GET['public']);
        $where = 'WHERE pagina=?';
        if ($public) $where .= ' AND ativo=1';
        $stmt = $pdo->prepare("SELECT * FROM paginas_conteudo $where ORDER BY ordem ASC, id ASC");
        $stmt->execute([$pagina]);
        json_response(['success'=>true,'data'=>$stmt->fetchAll()]);
    }

    if (method() === 'POST') {
        require_auth();
        $input = get_json_input();
        $id = (int)($input['id'] ?? 0);
        $pagina = trim((string)($input['pagina'] ?? ''));
        $bloco = trim((string)($input['bloco'] ?? ''));
        $titulo = trim((string)($input['titulo'] ?? ''));
        if ($pagina === '' || $bloco === '' || $titulo === '') {
            json_response(['success'=>false,'message'=>'Página, bloco e título são obrigatórios.'],422);
        }
        $subtitulo = trim((string)($input['subtitulo'] ?? ''));
        $conteudo = trim((string)($input['conteudo'] ?? ''));
        $linkUrl = trim((string)($input['link_url'] ?? ''));
        $linkTexto = trim((string)($input['link_texto'] ?? ''));
        $ordem = (int)($input['ordem'] ?? 0);
        $ativo = isset($input['ativo']) ? (int)!!$input['ativo'] : 1;

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE paginas_conteudo SET pagina=?, bloco=?, titulo=?, subtitulo=?, conteudo=?, link_url=?, link_texto=?, ordem=?, ativo=? WHERE id=?');
            $stmt->execute([$pagina,$bloco,$titulo,$subtitulo,$conteudo,$linkUrl,$linkTexto,$ordem,$ativo,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Bloco atualizado.']);
        }

        $stmt = $pdo->prepare('INSERT INTO paginas_conteudo (pagina,bloco,titulo,subtitulo,conteudo,link_url,link_texto,ordem,ativo) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo), subtitulo=VALUES(subtitulo), conteudo=VALUES(conteudo), link_url=VALUES(link_url), link_texto=VALUES(link_texto), ordem=VALUES(ordem), ativo=VALUES(ativo)');
        $stmt->execute([$pagina,$bloco,$titulo,$subtitulo,$conteudo,$linkUrl,$linkTexto,$ordem,$ativo]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Bloco salvo.']);
    }

    if (method() === 'DELETE') {
        require_auth();
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        $stmt = $pdo->prepare('UPDATE paginas_conteudo SET ativo=0 WHERE id=?');
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Bloco desativado.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
