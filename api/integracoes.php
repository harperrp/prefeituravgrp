<?php
require_once __DIR__ . '/config.php';

function fetch_external_json_or_csv(string $url): array
{
    if ($url === '') {
        return ['ok' => false, 'message' => 'Endpoint não configurado.'];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_TIMEOUT => 35,
        CURLOPT_USERAGENT => 'Portal Prefeitura VGRP/1.0',
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($errno) return ['ok' => false, 'message' => 'Erro cURL: ' . $error, 'http' => $http];
    if ($http < 200 || $http >= 300) return ['ok' => false, 'message' => 'HTTP ' . $http . ' ao consultar a API externa.', 'http' => $http, 'preview' => mb_substr((string)$body, 0, 500)];

    $json = json_decode((string)$body, true);
    if (is_array($json)) return ['ok' => true, 'format' => 'json', 'data' => $json, 'count' => is_countable($json) ? count($json) : 1];

    $lines = preg_split('/\r\n|\r|\n/', trim((string)$body));
    if ($lines && count($lines) > 1 && str_contains($lines[0], ';')) {
        $headers = str_getcsv($lines[0], ';');
        $rows = [];
        for ($i = 1; $i < count($lines); $i++) {
            $cols = str_getcsv($lines[$i], ';');
            $row = [];
            foreach ($headers as $idx => $header) $row[trim($header)] = $cols[$idx] ?? '';
            $rows[] = $row;
        }
        return ['ok' => true, 'format' => 'csv', 'data' => $rows, 'count' => count($rows)];
    }

    return ['ok' => true, 'format' => 'text', 'data' => [], 'count' => 0, 'preview' => mb_substr((string)$body, 0, 500)];
}

function pick_field(array $row, array $keys, $default = '')
{
    foreach ($keys as $key) {
        if (isset($row[$key]) && $row[$key] !== '') return $row[$key];
        foreach ($row as $rk => $rv) {
            if (mb_strtolower((string)$rk) === mb_strtolower((string)$key) && $rv !== '') return $rv;
        }
    }
    return $default;
}

function normalize_rows($data): array
{
    if (!is_array($data)) return [];
    if (isset($data['data']) && is_array($data['data'])) return $data['data'];
    if (isset($data['items']) && is_array($data['items'])) return $data['items'];
    if (isset($data['resultado']) && is_array($data['resultado'])) return $data['resultado'];
    if (isset($data['results']) && is_array($data['results'])) return $data['results'];
    if (array_is_list($data)) return $data;
    return [$data];
}

try {
    $pdo = db();
    require_auth();

    if (method() === 'GET') {
        $tipo = $_GET['tipo'] ?? 'emendas';
        $stmt = $pdo->prepare('SELECT * FROM integracoes_api WHERE tipo=? ORDER BY id ASC');
        $stmt->execute([$tipo]);
        json_response(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    if (method() === 'POST') {
        $action = $_GET['action'] ?? '';
        $id = (int)($_GET['id'] ?? 0);

        if ($action === 'testar' || $action === 'sincronizar') {
            if ($id <= 0) json_response(['success' => false, 'message' => 'ID inválido.'], 422);
            $stmt = $pdo->prepare('SELECT * FROM integracoes_api WHERE id=? LIMIT 1');
            $stmt->execute([$id]);
            $integ = $stmt->fetch();
            if (!$integ) json_response(['success' => false, 'message' => 'Integração não encontrada.'], 404);

            $result = fetch_external_json_or_csv((string)$integ['endpoint']);
            if (!$result['ok']) {
                $up = $pdo->prepare("UPDATE integracoes_api SET ultimo_status='erro', ultimo_erro=?, ultimo_sync=NOW() WHERE id=?");
                $up->execute([$result['message'] ?? 'Erro ao consultar API externa.', $id]);
                json_response(['success' => false, 'message' => $result['message'] ?? 'Erro ao consultar API externa.', 'data' => $result], 422);
            }

            if ($action === 'testar') {
                $up = $pdo->prepare("UPDATE integracoes_api SET ultimo_status='ok', ultimo_erro=NULL, ultimo_sync=NOW() WHERE id=?");
                $up->execute([$id]);
                json_response(['success' => true, 'message' => 'Conexão testada com sucesso.', 'data' => ['format' => $result['format'], 'count' => $result['count'] ?? 0, 'preview' => $result['preview'] ?? null]]);
            }

            $rows = normalize_rows($result['data'] ?? []);
            $importados = 0;
            foreach ($rows as $row) {
                if (!is_array($row)) continue;
                $parlamentar = trim((string)pick_field($row, ['parlamentar','autor','nomeParlamentar','nome_parlamentar','beneficiario','favorecido'], ''));
                $finalidade = trim((string)pick_field($row, ['finalidade','objeto','descricao','descrição','programa','acao','ação'], ''));
                $valor = money_to_decimal(pick_field($row, ['valor','valorTotal','valor_total','vlr_emenda','valorRepasse','valor_repassado'], 0));
                if ($parlamentar === '' || $finalidade === '') continue;

                $externalId = trim((string)pick_field($row, ['id','codigo','código','numero','número','convenio','convênio','proposta'], md5(json_encode($row))));
                $esfera = trim((string)pick_field($row, ['esfera','tipo','origem'], $integ['nome']));
                $statusExec = trim((string)pick_field($row, ['status','situacao','situação','fase'], 'Aguardando'));
                $ano = (int)pick_field($row, ['ano','exercicio','exercício'], date('Y'));

                $check = $pdo->prepare('SELECT id FROM emendas WHERE integracao_slug=? AND external_id=? LIMIT 1');
                $check->execute([$integ['slug'], $externalId]);
                $existing = $check->fetchColumn();

                if ($existing) {
                    $stmt2 = $pdo->prepare('UPDATE emendas SET parlamentar=?, esfera=?, finalidade=?, valor=?, status_execucao=?, fonte=?, ano=?, status="publicado", sincronizado_em=NOW() WHERE id=?');
                    $stmt2->execute([$parlamentar,$esfera,$finalidade,$valor,$statusExec,$integ['portal_url'],$ano,$existing]);
                } else {
                    $stmt2 = $pdo->prepare('INSERT INTO emendas (parlamentar,esfera,finalidade,valor,status_execucao,fonte,integracao_slug,external_id,sincronizado_em,ano,status) VALUES (?,?,?,?,?,?,?,?,NOW(),?,"publicado")');
                    $stmt2->execute([$parlamentar,$esfera,$finalidade,$valor,$statusExec,$integ['portal_url'],$integ['slug'],$externalId,$ano]);
                }
                $importados++;
            }

            $up = $pdo->prepare("UPDATE integracoes_api SET ultimo_status='sincronizado', ultimo_erro=NULL, ultimo_sync=NOW() WHERE id=?");
            $up->execute([$id]);
            json_response(['success' => true, 'message' => "Sincronização concluída. {$importados} registros importados/atualizados.", 'importados' => $importados]);
        }

        $input = get_json_input();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $nome = trim((string)($input['nome'] ?? ''));
        $slug = trim((string)($input['slug'] ?? ''));
        if ($nome === '' || $slug === '') json_response(['success' => false, 'message' => 'Nome e slug são obrigatórios.'], 422);

        $tipo = trim((string)($input['tipo'] ?? 'emendas'));
        $endpoint = trim((string)($input['endpoint'] ?? ''));
        $portal = trim((string)($input['portal_url'] ?? ''));
        $fonte = trim((string)($input['fonte'] ?? ''));
        $ativo = !empty($input['ativo']) ? 1 : 0;
        $config = is_string($input['config_json'] ?? '') ? $input['config_json'] : json_encode($input['config_json'] ?? [], JSON_UNESCAPED_UNICODE);

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE integracoes_api SET tipo=?,nome=?,slug=?,endpoint=?,portal_url=?,fonte=?,ativo=?,config_json=? WHERE id=?');
            $stmt->execute([$tipo,$nome,$slug,$endpoint,$portal,$fonte,$ativo,$config,$id]);
            json_response(['success'=>true,'id'=>$id,'message'=>'Integração atualizada.']);
        }

        $stmt = $pdo->prepare('INSERT INTO integracoes_api (tipo,nome,slug,endpoint,portal_url,fonte,ativo,config_json) VALUES (?,?,?,?,?,?,?,?)');
        $stmt->execute([$tipo,$nome,$slug,$endpoint,$portal,$fonte,$ativo,$config]);
        json_response(['success'=>true,'id'=>(int)$pdo->lastInsertId(),'message'=>'Integração cadastrada.']);
    }

    json_response(['success'=>false,'message'=>'Método não permitido.'],405);
} catch (Throwable $e) {
    json_response(['success'=>false,'message'=>'Erro no servidor.','error'=>$e->getMessage()],500);
}
