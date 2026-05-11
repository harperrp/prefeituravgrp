<?php
require_once __DIR__ . '/config.php';

function require_admin(): void
{
    require_auth();
    $perfil = $_SESSION['usuario_perfil'] ?? '';
    if (!in_array($perfil, ['administrador','admin','superadmin'], true)) {
        json_response(['success'=>false,'message'=>'Apenas administradores podem gerenciar usuários.'],403);
    }
}

try {
    $pdo = db();
    require_admin();

    if (method() === 'GET') {
        $stmt = $pdo->query('SELECT id,nome,email,telefone,perfil,ativo,ultimo_login,criado_em,atualizado_em FROM usuarios ORDER BY ativo DESC, nome ASC');
        json_response(['success'=>true,'data'=>$stmt->fetchAll()]);
    }

    if (method() === 'POST') {
        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $nome = trim((string)($input['nome'] ?? ''));
        $email = trim((string)($input['email'] ?? ''));
        $telefone = trim((string)($input['telefone'] ?? ''));
        $perfil = trim((string)($input['perfil'] ?? 'editor'));
        $senha = (string)($input['senha'] ?? '');
        $ativo = isset($input['ativo']) ? ((int)!!$input['ativo']) : 1;

        if ($nome === '' || $email === '') {
            json_response(['success'=>false,'message'=>'Nome e e-mail são obrigatórios.'],422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['success'=>false,'message'=>'E-mail inválido.'],422);
        }
        if (!in_array($perfil, ['administrador','editor','visualizador'], true)) {
            $perfil = 'editor';
        }

        $checkSql = 'SELECT id FROM usuarios WHERE email=?';
        $params = [$email];
        if ($id > 0) { $checkSql .= ' AND id<>?'; $params[] = $id; }
        $check = $pdo->prepare($checkSql . ' LIMIT 1');
        $check->execute($params);
        if ($check->fetch()) {
            json_response(['success'=>false,'message'=>'Já existe usuário com este e-mail.'],422);
        }

        if ($id > 0) {
            if ($senha !== '') {
                if (strlen($senha) < 6) json_response(['success'=>false,'message'=>'A senha deve ter pelo menos 6 caracteres.'],422);
                $hash = password_hash($senha, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare('UPDATE usuarios SET nome=?, email=?, telefone=?, perfil=?, ativo=?, senha_hash=? WHERE id=?');
                $stmt->execute([$nome,$email,$telefone,$perfil,$ativo,$hash,$id]);
            } else {
                $stmt = $pdo->prepare('UPDATE usuarios SET nome=?, email=?, telefone=?, perfil=?, ativo=? WHERE id=?');
                $stmt->execute([$nome,$email,$telefone,$perfil,$ativo,$id]);
            }
            json_response(['success'=>true,'id'=>$id,'message'=>'Usuário atualizado com sucesso.']);
        }

        if ($senha === '' || strlen($senha) < 6) {
            json_response(['success'=>false,'message'=>'Informe uma senha com pelo menos 6 caracteres.'],422);
        }
        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO usuarios (nome,email,telefone,perfil,ativo,senha_hash) VALUES (?,?,?,?,?,?)');
        $stmt->execute([$nome,$email,$telefone,$perfil,$ativo,$hash]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Usuário cadastrado com sucesso.']);
    }

    if (method() === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) json_response(['success'=>false,'message'=>'ID inválido.'],422);
        if ($id === (int)($_SESSION['usuario_id'] ?? 0)) {
            json_response(['success'=>false,'message'=>'Você não pode desativar o próprio usuário logado.'],422);
        }
        $stmt = $pdo->prepare('UPDATE usuarios SET ativo=0 WHERE id=?');
        $stmt->execute([$id]);
        json_response(['success'=>true,'message'=>'Usuário desativado.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
