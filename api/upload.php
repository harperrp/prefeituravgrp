<?php
require_once __DIR__ . '/config.php';

try {
    require_auth();

    if (method() !== 'POST') {
        json_response(['success' => false, 'message' => 'Método não permitido.'], 405);
    }

    if (empty($_FILES['arquivo'])) {
        json_response(['success' => false, 'message' => 'Nenhum arquivo enviado.'], 422);
    }

    $tipo = preg_replace('/[^a-z0-9_-]/i', '', (string)($_POST['tipo'] ?? 'geral')) ?: 'geral';
    $file = $_FILES['arquivo'];

    if (!empty($file['error'])) {
        json_response(['success' => false, 'message' => 'Erro no envio do arquivo. Código: ' . $file['error']], 422);
    }

    $maxSize = 8 * 1024 * 1024;
    if ((int)$file['size'] > $maxSize) {
        json_response(['success' => false, 'message' => 'Arquivo muito grande. Limite máximo: 8MB.'], 422);
    }

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
    ];

    $mime = mime_content_type($file['tmp_name']);
    if (!isset($allowed[$mime])) {
        json_response(['success' => false, 'message' => 'Formato não permitido. Use JPG, PNG, WEBP ou PDF.'], 422);
    }

    $dir = UPLOAD_BASE_DIR . '/' . $tipo;
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        json_response(['success' => false, 'message' => 'Não foi possível criar a pasta de upload.'], 500);
    }

    $ext = $allowed[$mime];
    $name = date('YmdHis') . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
    $dest = $dir . '/' . $name;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        json_response(['success' => false, 'message' => 'Não foi possível salvar o arquivo.'], 500);
    }

    $url = UPLOAD_BASE_URL . '/' . $tipo . '/' . $name;
    json_response(['success' => true, 'url' => $url, 'mime' => $mime, 'filename' => $name]);
} catch (Throwable $e) {
    json_response(['success' => false, 'message' => 'Erro no servidor.', 'error' => $e->getMessage()], 500);
}
