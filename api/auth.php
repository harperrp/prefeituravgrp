<?php
require_once __DIR__ . '/config.php';

try {
    $action = $_GET['action'] ?? '';

    if (method() === 'POST' && $action === 'login') {
        $input = get_json_input();
        $email = trim((string)($input['email'] ?? ''));
        $senha = (string)($input['senha'] ?? '');

        if ($email === '' || $senha === '') {
            json_response(['success' => false, 'message' => 'Informe e-mail e senha.'], 422);
        }

        $stmt = db()->prepare('SELECT id, nome, email, senha_hash, perfil, ativo FROM usuarios WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !(int)$user['ativo'] || !password_verify($senha, $user['senha_hash'])) {
            json_response(['success' => false, 'message' => 'Login ou senha inválidos.'], 401);
        }

        $_SESSION['usuario_id'] = (int)$user['id'];
        $_SESSION['usuario_nome'] = $user['nome'];
        $_SESSION['usuario_email'] = $user['email'];
        $_SESSION['usuario_perfil'] = $user['perfil'];

        json_response([
            'success' => true,
            'usuario' => [
                'id' => (int)$user['id'],
                'nome' => $user['nome'],
                'email' => $user['email'],
                'perfil' => $user['perfil'],
            ],
        ]);
    }

    if (method() === 'POST' && $action === 'logout') {
        session_destroy();
        json_response(['success' => true]);
    }

    if (method() === 'GET' && $action === 'me') {
        if (empty($_SESSION['usuario_id'])) {
            json_response(['success' => false, 'authenticated' => false], 401);
        }

        json_response([
            'success' => true,
            'authenticated' => true,
            'usuario' => [
                'id' => (int)$_SESSION['usuario_id'],
                'nome' => $_SESSION['usuario_nome'] ?? '',
                'email' => $_SESSION['usuario_email'] ?? '',
                'perfil' => $_SESSION['usuario_perfil'] ?? '',
            ],
        ]);
    }

    json_response(['success' => false, 'message' => 'Ação inválida.'], 404);
} catch (Throwable $e) {
    json_response(['success' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
