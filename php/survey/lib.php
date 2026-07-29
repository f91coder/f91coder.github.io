<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

const DASHBOARD_MAX_LATEST_RESPONSES = 80;
const DASHBOARD_MAX_TOP_QUESTIONS = 10;
const DASHBOARD_MAX_TOP_ANSWERS = 6;

const RESERVED_SURVEY_KEYS = [
    'action' => true, 'response_id' => true, 'submitted_at' => true, 'language' => true,
    'survey' => true, 'questions' => true, 'answers' => true, 'response' => true,
    'survey_slug' => true, 'survey_title' => true, 'survey_niche' => true, 'survey_version' => true,
    'source_file' => true, 'source_url' => true, 'hp_field' => true, 'form_rendered_at' => true,
    'token' => true, 'password' => true,
];

const PRIMARY_LABEL_KEYS = [
    'nome_hotel', 'empresa_nome', 'hotel_name', 'business_name', 'company_name',
    'company', 'empresa', 'organization_name', 'organizacao', 'organization',
];
const CONTACT_NAME_KEYS = ['responsavel_nome', 'contact_name', 'full_name', 'nome', 'name'];
const CONTACT_EMAIL_KEYS = ['responsavel_email', 'contact_email', 'work_email', 'email'];
const CONTACT_PHONE_KEYS = ['responsavel_telefone', 'contact_phone', 'telefone', 'phone', 'whatsapp'];

// Catálogo canônico de perguntas por survey — usado pela análise por pesquisa
// do painel (getSurveyQuestionCatalog). Fonte única da verdade para label/tipo,
// já que a tabela survey_answers só guarda o que foi enviado em cada resposta.
const SURVEY_QUESTION_CATALOG = [
    'hotelaria' => [
        'nome_hotel' => ['type' => 'text', 'label' => 'Nome do hotel ou rede hoteleira'],
        'cidade_estado' => ['type' => 'text', 'label' => 'Cidade / Estado'],
        'categoria' => ['type' => 'select', 'label' => 'Categoria do hotel'],
        'num_quartos' => ['type' => 'select', 'label' => 'Número aproximado de quartos'],
        'possui_salas' => ['type' => 'select', 'label' => 'Possui salas de eventos / reuniões?'],
        'trabalha_grupos' => ['type' => 'select', 'label' => 'Já trabalha com negociação de tarifa para grupos/eventos?'],
        'como_recebe_solicitacoes' => ['type' => 'multiselect', 'label' => 'Como recebem solicitações de orçamento?'],
        'frequencia_solicitacoes' => ['type' => 'select', 'label' => 'Frequência de solicitações de grupos'],
        'tempo_ate_proposta' => ['type' => 'select', 'label' => 'Tempo até o envio da proposta'],
        'maiores_desafios' => ['type' => 'multiselect', 'label' => 'Maiores desafios na negociação de grupos/eventos'],
        'sistema_registro' => ['type' => 'multiselect', 'label' => 'Sistema/ferramenta usado hoje'],
        'que_gostaria' => ['type' => 'multiselect', 'label' => 'Recursos desejados no sistema ideal'],
        'interesse_teste' => ['type' => 'select', 'label' => 'Interesse em testar gratuitamente'],
        'participar_piloto' => ['type' => 'select', 'label' => 'Interesse em ser hotel piloto'],
    ],
    'locacao-para-eventos' => [
        'empresa_nome' => ['type' => 'text', 'label' => 'Nome da empresa'],
        'cidade_estado' => ['type' => 'text', 'label' => 'Cidade / Estado'],
        'tipo_operacao' => ['type' => 'multiselect', 'label' => 'O que mais loca para eventos'],
        'orcamentos_mes' => ['type' => 'select', 'label' => 'Orçamentos/propostas enviados por mês'],
        'canais_entrada' => ['type' => 'multiselect', 'label' => 'Canais de entrada dos pedidos'],
        'como_monta_proposta' => ['type' => 'multiselect', 'label' => 'Como montam e enviam propostas hoje'],
        'tempo_envio_proposta' => ['type' => 'select', 'label' => 'Tempo entre pedido e envio da proposta'],
        'controle_status' => ['type' => 'multiselect', 'label' => 'Como controlam status das negociações'],
        'principais_gargalos' => ['type' => 'multiselect', 'label' => 'Principais gargalos do processo comercial'],
        'controle_disponibilidade' => ['type' => 'select', 'label' => 'Controlam disponibilidade por data em sistema?'],
        'conflito_reserva' => ['type' => 'select', 'label' => 'Como evitam conflito de reserva sem sistema'],
        'sistema_disponibilidade' => ['type' => 'select', 'label' => 'Solução usada para controlar disponibilidade'],
        'info_proposta' => ['type' => 'multiselect', 'label' => 'O que precisa aparecer numa proposta'],
        'integracao_areas' => ['type' => 'select', 'label' => 'Comercial/operação/estoque integrados?'],
        'quebra_processo' => ['type' => 'select', 'label' => 'Onde o processo mais quebra'],
        'recursos_desejados' => ['type' => 'multiselect', 'label' => 'Recursos de maior impacto numa solução ideal'],
        'interesse_teste' => ['type' => 'select', 'label' => 'Faria sentido testar essa solução?'],
        'participar_piloto' => ['type' => 'select', 'label' => 'Interesse em ser empresa piloto'],
    ],
];

const SURVEY_QUESTION_SECTIONS = [
    'hotelaria' => [
        ['title' => 'Perfil do hotel', 'keys' => ['nome_hotel', 'cidade_estado', 'categoria', 'num_quartos', 'possui_salas']],
        ['title' => 'Processo atual', 'keys' => ['trabalha_grupos', 'como_recebe_solicitacoes', 'frequencia_solicitacoes', 'tempo_ate_proposta']],
        ['title' => 'Desafios e sistemas', 'keys' => ['maiores_desafios', 'sistema_registro']],
        ['title' => 'Recursos desejados', 'keys' => ['que_gostaria']],
        ['title' => 'Conversão', 'keys' => ['interesse_teste', 'participar_piloto']],
    ],
    'locacao-para-eventos' => [
        ['title' => 'Perfil da empresa', 'keys' => ['empresa_nome', 'cidade_estado', 'tipo_operacao']],
        ['title' => 'Processo atual', 'keys' => ['orcamentos_mes', 'canais_entrada', 'como_monta_proposta', 'tempo_envio_proposta', 'controle_status']],
        ['title' => 'Desafios e controle', 'keys' => ['principais_gargalos', 'controle_disponibilidade', 'conflito_reserva', 'sistema_disponibilidade', 'info_proposta', 'integracao_areas', 'quebra_processo']],
        ['title' => 'Recursos desejados', 'keys' => ['recursos_desejados']],
        ['title' => 'Conversão', 'keys' => ['interesse_teste', 'participar_piloto']],
    ],
];

const SURVEY_TITLES = [
    'hotelaria' => 'F91 - Soluções Operacionais: Hotelaria',
    'locacao-para-eventos' => 'F91 - Soluções Operacionais: Locação para Eventos',
];

// ─────────────────────────────────────────────────────────────────────────
// Submissão de survey
// ─────────────────────────────────────────────────────────────────────────

function submit_survey(array $input): array
{
    $pdo = survey_pdo();
    $ipHash = ip_hash();

    if (looks_like_bot($input)) {
        // Não entregamos pistas ao bot: fingimos sucesso sem persistir nada.
        return ['success' => true, 'message' => 'Resposta salva com sucesso!', 'response_id' => sanitize_string($input['response_id'] ?? '', 64) ?: generate_uuid()];
    }

    if (submit_rate_limited($pdo, $ipHash)) {
        return ['success' => false, 'message' => 'Muitos envios recentes. Tente novamente mais tarde.', '_code' => 429];
    }

    $response = normalize_survey_payload($input);

    if ($response['survey']['slug'] === '') {
        return ['success' => false, 'message' => 'survey_slug obrigatorio.', '_code' => 400];
    }

    if ($response['contactEmail'] !== '' && !filter_var($response['contactEmail'], FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => 'E-mail de contato invalido.', '_code' => 400];
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'INSERT INTO survey_responses
                (response_id, survey_slug, survey_title, survey_niche, survey_version, source_file, source_url,
                 language, question_count, answered_count, primary_label, primary_value,
                 contact_name, contact_email, contact_phone, answers_json, ip_hash, user_agent, submitted_at)
             VALUES
                (:response_id, :survey_slug, :survey_title, :survey_niche, :survey_version, :source_file, :source_url,
                 :language, :question_count, :answered_count, :primary_label, :primary_value,
                 :contact_name, :contact_email, :contact_phone, :answers_json, :ip_hash, :user_agent, :submitted_at)'
        );
        $stmt->execute([
            'response_id' => $response['responseId'],
            'survey_slug' => $response['survey']['slug'],
            'survey_title' => $response['survey']['title'],
            'survey_niche' => $response['survey']['niche'],
            'survey_version' => $response['survey']['version'],
            'source_file' => $response['survey']['sourceFile'],
            'source_url' => $response['survey']['sourceUrl'],
            'language' => $response['language'],
            'question_count' => $response['questionCount'],
            'answered_count' => $response['answeredCount'],
            'primary_label' => $response['primaryLabel'],
            'primary_value' => $response['primaryValue'],
            'contact_name' => $response['contactName'],
            'contact_email' => $response['contactEmail'],
            'contact_phone' => $response['contactPhone'],
            'answers_json' => $response['answersJson'],
            'ip_hash' => $ipHash,
            'user_agent' => sanitize_string($_SERVER['HTTP_USER_AGENT'] ?? '', 255),
            'submitted_at' => gmdate('Y-m-d H:i:s', $response['submittedAtTs']),
        ]);

        if ($response['answeredItems']) {
            $answerStmt = $pdo->prepare(
                'INSERT INTO survey_answers
                    (response_id, question_order, question_key, question_label, question_type, answer_value, answer_json)
                 VALUES
                    (:response_id, :question_order, :question_key, :question_label, :question_type, :answer_value, :answer_json)'
            );
            foreach ($response['answeredItems'] as $item) {
                $answerStmt->execute([
                    'response_id' => $response['responseId'],
                    'question_order' => $item['questionOrder'],
                    'question_key' => $item['questionKey'],
                    'question_label' => $item['questionLabel'],
                    'question_type' => $item['questionType'],
                    'answer_value' => $item['answerValue'],
                    'answer_json' => safe_json_encode($item['rawValue']),
                ]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('submit_survey error: ' . $e->getMessage());
        return ['success' => false, 'message' => 'Erro ao salvar a resposta.', '_code' => 500];
    }

    try {
        send_survey_notification($response);
    } catch (Throwable $e) {
        error_log('send_survey_notification error: ' . $e->getMessage());
    }

    return ['success' => true, 'message' => 'Resposta salva com sucesso!', 'response_id' => $response['responseId']];
}

function normalize_survey_payload(array $data): array
{
    $surveyMeta = parse_json_field($data['survey'] ?? null, []);
    $questionsMeta = parse_json_field($data['questions'] ?? null, []);
    $answersRaw = parse_json_field($data['answers'] ?? null, null);

    $survey = [
        'slug' => sanitize_string($data['survey_slug'] ?? ($surveyMeta['slug'] ?? ''), 60) ?: 'geral',
        'title' => sanitize_string($data['survey_title'] ?? ($surveyMeta['title'] ?? ''), 200) ?: 'F91 - Soluções Operacionais',
        'niche' => sanitize_string($data['survey_niche'] ?? ($surveyMeta['niche'] ?? ''), 120),
        'version' => sanitize_string($data['survey_version'] ?? ($surveyMeta['version'] ?? ''), 30),
        'sourceFile' => sanitize_string($data['source_file'] ?? ($surveyMeta['sourceFile'] ?? ''), 120),
        'sourceUrl' => sanitize_string($data['source_url'] ?? ($surveyMeta['sourceUrl'] ?? ''), 500),
    ];

    $submittedAtRaw = sanitize_string($data['submitted_at'] ?? '', 40);
    $submittedAtTs = $submittedAtRaw !== '' ? (strtotime($submittedAtRaw) ?: time()) : time();

    $language = sanitize_string($data['language'] ?? '', 2) ?: 'pt';
    $responseIdRaw = sanitize_string($data['response_id'] ?? '', 64);
    $responseId = is_valid_uuid_like($responseIdRaw) ? $responseIdRaw : generate_uuid();

    $answersMap = build_answers_map($data, $answersRaw);
    $questionItems = build_question_items(is_array($questionsMeta) ? $questionsMeta : [], $answersMap);
    $answeredItems = array_values(array_filter($questionItems, static fn($item) => $item['answerValue'] !== ''));

    $primaryItem = find_preferred_answer($answeredItems, PRIMARY_LABEL_KEYS);
    $answersObject = [];
    foreach ($questionItems as $item) {
        $answersObject[$item['questionKey']] = $item['rawValue'];
    }

    return [
        'responseId' => $responseId,
        'submittedAtTs' => $submittedAtTs,
        'language' => $language,
        'survey' => $survey,
        'questionCount' => count($questionItems),
        'answeredCount' => count($answeredItems),
        'primaryLabel' => $primaryItem['questionLabel'] ?? '',
        'primaryValue' => $primaryItem['answerValue'] ?? '',
        'contactName' => find_preferred_value($answeredItems, CONTACT_NAME_KEYS),
        'contactEmail' => find_preferred_value($answeredItems, CONTACT_EMAIL_KEYS),
        'contactPhone' => find_preferred_value($answeredItems, CONTACT_PHONE_KEYS),
        'answersJson' => safe_json_encode($answersObject),
        'questionItems' => $questionItems,
        'answeredItems' => $answeredItems,
    ];
}

function build_answers_map(array $data, mixed $answersRaw): array
{
    if (is_array($answersRaw) && array_values($answersRaw) !== $answersRaw) {
        // array associativo (chave => valor), não uma lista sequencial
        return $answersRaw;
    }

    $answers = [];
    foreach ($data as $key => $value) {
        if (!isset(RESERVED_SURVEY_KEYS[$key])) {
            $answers[$key] = $value;
        }
    }
    return $answers;
}

function build_question_items(array $questionMetaList, array $answersMap): array
{
    $orderedKeys = [];
    $metaByKey = [];

    foreach ($questionMetaList as $index => $question) {
        if (!is_array($question) || empty($question['key'])) {
            continue;
        }
        $key = (string) $question['key'];
        if (!in_array($key, $orderedKeys, true)) {
            $orderedKeys[] = $key;
        }
        $metaByKey[$key] = [
            'order' => (int) ($question['order'] ?? ($index + 1)),
            'label' => sanitize_string($question['label'] ?? '', 255) ?: humanize_key($key),
            'type' => sanitize_string($question['type'] ?? '', 30) ?: infer_answer_type($question['value'] ?? null),
        ];
    }

    foreach (array_keys($answersMap) as $key) {
        if (!in_array($key, $orderedKeys, true)) {
            $orderedKeys[] = $key;
        }
    }

    $items = [];
    foreach ($orderedKeys as $index => $key) {
        $meta = $metaByKey[$key] ?? [];
        $rawValue = $answersMap[$key] ?? null;
        $items[] = [
            'questionOrder' => $meta['order'] ?? ($index + 1),
            'questionKey' => $key,
            'questionLabel' => $meta['label'] ?? humanize_key($key),
            'questionType' => $meta['type'] ?? infer_answer_type($rawValue),
            'rawValue' => $rawValue,
            'answerValue' => format_answer_value($rawValue),
        ];
    }
    return $items;
}

function format_answer_value(mixed $value): string
{
    if (is_array($value)) {
        $parts = array_filter(array_map(static fn($item) => trim((string) $item), $value), static fn($item) => $item !== '');
        return implode(' | ', $parts);
    }
    if ($value === null) {
        return '';
    }
    return trim((string) $value);
}

function infer_answer_type(mixed $value): string
{
    if (is_array($value)) {
        return 'multiselect';
    }
    if (is_bool($value)) {
        return 'boolean';
    }
    if (is_numeric($value)) {
        return 'number';
    }
    return 'text';
}

function humanize_key(string $key): string
{
    $spaced = trim(preg_replace('/\s+/', ' ', str_replace('_', ' ', $key)) ?? '');
    return ucwords($spaced);
}

function find_preferred_answer(array $items, array $preferredKeys): ?array
{
    $wanted = array_map('strtolower', $preferredKeys);
    foreach ($items as $item) {
        if (in_array(strtolower($item['questionKey']), $wanted, true) && $item['answerValue'] !== '') {
            return $item;
        }
    }
    return $items[0] ?? null;
}

function find_preferred_value(array $items, array $preferredKeys): string
{
    $item = find_preferred_answer($items, $preferredKeys);
    return $item['answerValue'] ?? '';
}

const DEFAULT_NOTIFICATION_EMAILS = 'filoliveira.me@gmail.com,f91.adm@gmail.com';

function send_survey_notification(array $response): void
{
    $config = survey_config();
    $mailConfig = require __DIR__ . '/../mail-config.php';
    $missing = array_filter(['host', 'username', 'password', 'from_email'], static fn($key) => empty($mailConfig[$key]));
    if ($missing) {
        // Lançar (em vez de retornar em silêncio) garante que isso apareça no
        // error_log via o catch em submit_survey() — sem isso, uma config de
        // e-mail ausente falhava sem deixar nenhum rastro.
        throw new RuntimeException('Configuração de e-mail incompleta, faltando: ' . implode(', ', $missing));
    }

    require_once __DIR__ . '/../phpmailer/src/Exception.php';
    require_once __DIR__ . '/../phpmailer/src/PHPMailer.php';
    require_once __DIR__ . '/../phpmailer/src/SMTP.php';

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $mailConfig['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $mailConfig['username'];
    $mail->Password = $mailConfig['password'];
    $mail->Port = (int) $mailConfig['port'];

    $encryption = strtolower((string) $mailConfig['encryption']);
    if (in_array($encryption, ['ssl', 'smtps'], true)) {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    } elseif (!in_array($encryption, ['none', 'off'], true)) {
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    }

    $mail->CharSet = 'UTF-8';
    $mail->setFrom($mailConfig['from_email'], $mailConfig['from_name'] ?: 'F91 - Soluções Operacionais');

    $notificationEmails = $config['notification_emails'] ?: DEFAULT_NOTIFICATION_EMAILS;
    $recipients = array_filter(array_map('trim', explode(',', (string) $notificationEmails)));
    if (!$recipients) {
        $recipients = array_filter(array_map('trim', explode(',', DEFAULT_NOTIFICATION_EMAILS)));
    }
    foreach ($recipients as $to) {
        $mail->addAddress($to);
    }

    $rows = [];
    if ($response['primaryValue'] !== '') {
        $rows[] = [$response['primaryLabel'] ?: 'Registro principal', $response['primaryValue']];
    }
    if ($response['contactName'] !== '') {
        $rows[] = ['Contato', $response['contactName']];
    }
    if ($response['contactEmail'] !== '') {
        $rows[] = ['E-mail', $response['contactEmail']];
    }
    if ($response['contactPhone'] !== '') {
        $rows[] = ['Telefone', $response['contactPhone']];
    }
    foreach (array_slice($response['answeredItems'], 0, 6) as $item) {
        $rows[] = [$item['questionLabel'], $item['answerValue']];
    }

    $htmlRows = implode('', array_map(static function ($row) {
        $label = htmlspecialchars($row[0], ENT_QUOTES, 'UTF-8');
        $value = nl2br(htmlspecialchars($row[1], ENT_QUOTES, 'UTF-8'));
        return "<tr><td style=\"padding:10px 14px;border-bottom:1px solid #eef2f6;font-size:12px;font-weight:700;color:#5B6776;white-space:nowrap;\">{$label}</td><td style=\"padding:10px 14px;border-bottom:1px solid #eef2f6;font-size:14px;color:#10233A;\">{$value}</td></tr>";
    }, $rows));

    $mail->isHTML(true);
    $mail->Subject = 'Nova resposta recebida | ' . $response['survey']['title'];
    $mail->Body = "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;\">"
        . "<h2 style=\"color:#002050;\">Nova resposta de survey</h2>"
        . "<p style=\"color:#5B6776;\">Pesquisa: <strong>{$response['survey']['title']}</strong> — Idioma: " . strtoupper($response['language']) . "</p>"
        . "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #D9E2EC;border-radius:12px;overflow:hidden;\">{$htmlRows}</table>"
        . "</div>";
    $mail->AltBody = implode("\n", array_map(static fn($row) => $row[0] . ': ' . $row[1], $rows));

    $mail->send();
}

// ─────────────────────────────────────────────────────────────────────────
// Autenticação do painel
// ─────────────────────────────────────────────────────────────────────────

function login_dashboard(array $input): array
{
    $pdo = survey_pdo();
    $ipHash = ip_hash();

    if (login_rate_limited($pdo, $ipHash)) {
        return ['success' => false, 'message' => 'Muitas tentativas de login. Tente novamente mais tarde.', '_code' => 429];
    }

    $config = survey_config();
    $expectedHash = (string) $config['dashboard_password_hash'];
    if ($expectedHash === '') {
        return ['success' => false, 'configured' => false, 'message' => 'Configure SURVEY_DASHBOARD_PASSWORD_HASH.', '_code' => 500];
    }

    $password = sanitize_string($input['password'] ?? '', 200);
    if ($password === '' || !password_verify($password, $expectedHash)) {
        record_login_attempt($pdo, $ipHash);
        return ['success' => false, 'message' => 'Senha invalida.', '_code' => 401];
    }

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_sessions (token_hash, ip_hash, expires_at) VALUES (:token_hash, :ip_hash, (NOW() + INTERVAL ' . DASHBOARD_SESSION_TTL_SECONDS . ' SECOND))'
    );
    $stmt->execute(['token_hash' => $tokenHash, 'ip_hash' => $ipHash]);

    return [
        'success' => true,
        'token' => $token,
        'expires_in_seconds' => DASHBOARD_SESSION_TTL_SECONDS,
        'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
    ];
}

function logout_dashboard(array $input): array
{
    $token = sanitize_string($input['token'] ?? '', 128);
    if ($token !== '') {
        $stmt = survey_pdo()->prepare('DELETE FROM dashboard_sessions WHERE token_hash = :token_hash');
        $stmt->execute(['token_hash' => hash('sha256', $token)]);
    }
    return ['success' => true];
}

// ─────────────────────────────────────────────────────────────────────────
// Dashboard analytics
// ─────────────────────────────────────────────────────────────────────────

function normalize_dashboard_filters(array $params): array
{
    $allowedRanges = ['24h' => true, '7d' => true, '30d' => true, '90d' => true, 'all' => true];
    $range = sanitize_string($params['range'] ?? '', 10);
    return [
        'range' => $allowedRanges[$range] ?? false ? $range : '30d',
        'survey_slug' => sanitize_string($params['survey_slug'] ?? '', 60),
        'language' => sanitize_string($params['language'] ?? '', 2),
        'search' => sanitize_string($params['search'] ?? '', 120),
    ];
}

function range_duration_seconds(string $range): ?int
{
    return match ($range) {
        '24h' => 24 * 3600,
        '7d' => 7 * 24 * 3600,
        '30d' => 30 * 24 * 3600,
        '90d' => 90 * 24 * 3600,
        default => null,
    };
}

function build_dashboard_where(array $filters, string $alias = ''): array
{
    $prefix = $alias !== '' ? $alias . '.' : '';
    $conditions = [];
    $params = [];

    if ($filters['survey_slug'] !== '') {
        $conditions[] = "{$prefix}survey_slug = :survey_slug";
        $params['survey_slug'] = $filters['survey_slug'];
    }
    if ($filters['language'] !== '') {
        $conditions[] = "{$prefix}language = :language";
        $params['language'] = $filters['language'];
    }
    if ($filters['search'] !== '') {
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $filters['search']);
        $columns = ['survey_title', 'survey_niche', 'primary_value', 'contact_name', 'contact_email', 'contact_phone'];
        $likeConditions = array_map(static fn($col) => "{$prefix}{$col} LIKE :search", $columns);
        $conditions[] = '(' . implode(' OR ', $likeConditions) . ')';
        $params['search'] = '%' . $escaped . '%';
    }

    $durationSeconds = range_duration_seconds($filters['range']);
    if ($durationSeconds !== null) {
        $conditions[] = "{$prefix}submitted_at >= :range_start";
        $params['range_start'] = gmdate('Y-m-d H:i:s', time() - $durationSeconds);
    }

    $sql = $conditions ? ('WHERE ' . implode(' AND ', $conditions)) : '';
    return [$sql, $params];
}

function language_label(string $language): string
{
    return match ($language) {
        'en' => 'English',
        'es' => 'Español',
        default => 'Português',
    };
}

function get_dashboard(array $params): array
{
    $pdo = survey_pdo();
    require_dashboard_session($pdo, (string) ($params['token'] ?? ''));

    $filters = normalize_dashboard_filters($params);
    [$whereSql, $whereParams] = build_dashboard_where($filters);

    $stmt = $pdo->prepare(
        "SELECT response_id, submitted_at, survey_slug, survey_title, survey_niche, language,
                question_count, answered_count, primary_label, primary_value,
                contact_name, contact_email, contact_phone
         FROM survey_responses
         {$whereSql}
         ORDER BY submitted_at DESC"
    );
    $stmt->execute($whereParams);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['completion_rate'] = $row['question_count'] > 0 ? $row['answered_count'] / $row['question_count'] : 0.0;
        $row['sp_datetime'] = sao_paulo_datetime($row['submitted_at']);
        $row['ts'] = strtotime($row['submitted_at'] . ' UTC');
    }
    unset($row);

    $optionsStmt = $pdo->query(
        'SELECT survey_slug, MAX(survey_title) AS survey_title, MAX(survey_niche) AS survey_niche, COUNT(*) AS count
         FROM survey_responses GROUP BY survey_slug ORDER BY count DESC'
    );
    $surveyOptions = $optionsStmt->fetchAll();

    $languageStmt = $pdo->query('SELECT language, COUNT(*) AS count FROM survey_responses GROUP BY language ORDER BY count DESC');
    $languageOptionsRaw = $languageStmt->fetchAll();
    $languageOptions = array_map(static fn($row) => [
        'language' => $row['language'],
        'label' => language_label($row['language']),
        'count' => (int) $row['count'],
    ], $languageOptionsRaw);

    return [
        'success' => true,
        'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
        'filters' => $filters,
        'summary' => build_dashboard_summary($pdo, $rows, $filters),
        'survey_options' => $surveyOptions,
        'language_options' => $languageOptions,
        'timeline' => build_timeline($rows, $filters['range']),
        'survey_breakdown' => build_survey_breakdown($rows),
        'language_breakdown' => build_language_breakdown($rows),
        'hourly_breakdown' => build_hourly_breakdown($rows),
        'weekday_breakdown' => build_weekday_breakdown($rows),
        'top_questions' => build_top_questions($pdo, $filters),
        'latest_responses' => build_latest_responses($rows),
    ];
}

function build_dashboard_summary(PDO $pdo, array $rows, array $filters): array
{
    $now = time();
    $total = count($rows);
    $last24h = 0;
    $last7d = 0;
    $today = 0;
    $completionTotal = 0.0;
    $answeredTotal = 0;
    $surveys = [];
    $todayKey = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');

    foreach ($rows as $row) {
        if ($row['ts'] >= $now - 86400) {
            $last24h++;
        }
        if ($row['ts'] >= $now - 7 * 86400) {
            $last7d++;
        }
        if ($row['sp_datetime']->format('Y-m-d') === $todayKey) {
            $today++;
        }
        $completionTotal += $row['completion_rate'];
        $answeredTotal += (int) $row['answered_count'];
        $surveys[$row['survey_slug']] = true;
    }

    $durationSeconds = range_duration_seconds($filters['range']);
    $previousCount = null;
    if ($durationSeconds !== null) {
        // Filtros iguais aos da janela atual, mas sem o corte de período — o
        // intervalo do "período anterior" é aplicado à parte, abaixo.
        $filtersWithoutRange = $filters;
        $filtersWithoutRange['range'] = 'all';
        [$whereSql, $whereParams] = build_dashboard_where($filtersWithoutRange);

        $periodCondition = 'submitted_at >= :prev_start AND submitted_at < :prev_end';
        $whereSql = $whereSql !== '' ? ($whereSql . ' AND ' . $periodCondition) : ('WHERE ' . $periodCondition);
        $whereParams['prev_start'] = gmdate('Y-m-d H:i:s', $now - (2 * $durationSeconds));
        $whereParams['prev_end'] = gmdate('Y-m-d H:i:s', $now - $durationSeconds);

        $prevStmt = $pdo->prepare("SELECT COUNT(*) FROM survey_responses {$whereSql}");
        $prevStmt->execute($whereParams);
        $previousCount = (int) $prevStmt->fetchColumn();
    }

    $delta = $previousCount === null ? null : $total - $previousCount;
    $deltaPercent = ($previousCount !== null && $previousCount > 0) ? ($delta / $previousCount) * 100 : null;

    return [
        'total_responses' => $total,
        'last_24h' => $last24h,
        'last_7d' => $last7d,
        'today' => $today,
        'active_surveys' => count($surveys),
        'avg_completion_rate' => $total ? $completionTotal / $total : 0,
        'avg_answered_count' => $total ? $answeredTotal / $total : 0,
        'latest_received_at' => $total ? to_iso_utc($rows[0]['submitted_at']) : '',
        'previous_period_count' => $previousCount,
        'trend_delta' => $delta,
        'trend_percent' => $deltaPercent,
    ];
}

function build_timeline(array $rows, string $range): array
{
    if (!$rows) {
        return [];
    }

    $timestamps = array_column($rows, 'ts');
    $spanDays = max(1, (int) ceil((max($timestamps) - min($timestamps)) / 86400));
    $bucketByMonth = $range === 'all' && $spanDays > 120;

    $grouped = [];
    foreach ($rows as $row) {
        $key = $bucketByMonth ? $row['sp_datetime']->format('Y-m') : $row['sp_datetime']->format('Y-m-d');
        $grouped[$key] = ($grouped[$key] ?? 0) + 1;
    }
    ksort($grouped);

    $result = [];
    foreach ($grouped as $key => $count) {
        $label = $bucketByMonth ? DateTime::createFromFormat('Y-m-d', $key . '-01')->format('m/Y') : DateTime::createFromFormat('Y-m-d', $key)->format('d/m');
        $result[] = ['bucket' => $key, 'label' => $label, 'count' => $count];
    }
    return $result;
}

function build_survey_breakdown(array $rows): array
{
    $grouped = [];
    foreach ($rows as $row) {
        $key = $row['survey_slug'] ?: 'geral';
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'survey_slug' => $key,
                'survey_title' => $row['survey_title'] ?: $key,
                'survey_niche' => $row['survey_niche'] ?: '',
                'count' => 0,
                'completion_total' => 0.0,
                'latest_ts' => 0,
                'latest_received_at' => '',
                'languages' => [],
            ];
        }
        $grouped[$key]['count']++;
        $grouped[$key]['completion_total'] += $row['completion_rate'];
        $grouped[$key]['languages'][$row['language'] ?: 'pt'] = true;
        if ($row['ts'] > $grouped[$key]['latest_ts']) {
            $grouped[$key]['latest_ts'] = $row['ts'];
            $grouped[$key]['latest_received_at'] = to_iso_utc($row['submitted_at']);
        }
    }

    $result = array_map(static fn($item) => [
        'survey_slug' => $item['survey_slug'],
        'survey_title' => $item['survey_title'],
        'survey_niche' => $item['survey_niche'],
        'count' => $item['count'],
        'avg_completion_rate' => $item['count'] ? $item['completion_total'] / $item['count'] : 0,
        'latest_received_at' => $item['latest_received_at'],
        'languages' => array_keys($item['languages']),
    ], array_values($grouped));

    usort($result, static fn($a, $b) => $b['count'] <=> $a['count']);
    return $result;
}

function build_language_breakdown(array $rows): array
{
    $grouped = [];
    foreach ($rows as $row) {
        $key = $row['language'] ?: 'pt';
        $grouped[$key] = ($grouped[$key] ?? 0) + 1;
    }
    $result = [];
    foreach ($grouped as $language => $count) {
        $result[] = ['language' => $language, 'label' => language_label($language), 'count' => $count];
    }
    usort($result, static fn($a, $b) => $b['count'] <=> $a['count']);
    return $result;
}

function build_hourly_breakdown(array $rows): array
{
    $buckets = [];
    for ($hour = 0; $hour < 24; $hour++) {
        $buckets[$hour] = ['hour' => $hour, 'label' => sprintf('%02d:00', $hour), 'count' => 0];
    }
    foreach ($rows as $row) {
        $hour = (int) $row['sp_datetime']->format('G');
        $buckets[$hour]['count']++;
    }
    return array_values($buckets);
}

function build_weekday_breakdown(array $rows): array
{
    $labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    $buckets = [];
    foreach ($labels as $index => $label) {
        $buckets[$index] = ['weekday' => $index, 'label' => $label, 'count' => 0];
    }
    foreach ($rows as $row) {
        $weekday = (int) $row['sp_datetime']->format('w');
        $buckets[$weekday]['count']++;
    }
    return array_values($buckets);
}

/**
 * Busca e agrupa todas as respostas de survey_answers (filtradas) por
 * question_key — base compartilhada por build_top_questions() (recorte "top 10"
 * do painel geral) e build_question_breakdown_full() (catálogo completo por
 * survey da aba "Análise por pesquisa").
 */
function fetch_question_answer_groups(PDO $pdo, array $filters): array
{
    [$joinWhere, $joinParams] = build_dashboard_where($filters, 'sr');

    $stmt = $pdo->prepare(
        "SELECT sa.question_key, sa.question_label, sa.question_type, sa.answer_value, sa.answer_json
         FROM survey_answers sa
         INNER JOIN survey_responses sr ON sr.response_id = sa.response_id
         {$joinWhere}"
    );
    $stmt->execute($joinParams);

    $grouped = [];
    while ($row = $stmt->fetch()) {
        $key = $row['question_key'] ?: $row['question_label'];
        if ($key === '') {
            continue;
        }
        if (!isset($grouped[$key])) {
            $grouped[$key] = [
                'question_key' => $row['question_key'],
                'question_label' => $row['question_label'] ?: humanize_key($row['question_key']),
                'question_type' => $row['question_type'] ?: 'text',
                'response_count' => 0,
                'answer_counts' => [],
                'sample_answers' => [],
            ];
        }
        $grouped[$key]['response_count']++;

        foreach (tokenize_answer($row) as $token) {
            $grouped[$key]['answer_counts'][$token] = ($grouped[$key]['answer_counts'][$token] ?? 0) + 1;
        }

        $value = (string) $row['answer_value'];
        if ($value !== '' && mb_strlen($value) <= 140 && count($grouped[$key]['sample_answers']) < 3 && !in_array($value, $grouped[$key]['sample_answers'], true)) {
            $grouped[$key]['sample_answers'][] = $value;
        }
    }

    return $grouped;
}

function format_question_group(array $item, ?int $maxAnswers = DASHBOARD_MAX_TOP_ANSWERS): array
{
    $answerCounts = $item['answer_counts'];
    arsort($answerCounts);
    $topAnswers = [];
    $count = 0;
    foreach ($answerCounts as $label => $answerCount) {
        if ($maxAnswers !== null && $count >= $maxAnswers) {
            break;
        }
        $topAnswers[] = [
            'label' => $label,
            'count' => $answerCount,
            'percent' => $item['response_count'] ? $answerCount / $item['response_count'] : 0,
        ];
        $count++;
    }

    return [
        'question_key' => $item['question_key'],
        'question_label' => $item['question_label'],
        'question_type' => $item['question_type'],
        'response_count' => $item['response_count'],
        'distinct_answers' => count($item['answer_counts']),
        'top_answers' => $topAnswers,
        'sample_answers' => $item['sample_answers'],
    ];
}

function build_top_questions(PDO $pdo, array $filters): array
{
    $grouped = fetch_question_answer_groups($pdo, $filters);

    $result = array_map(static fn($item) => format_question_group($item, DASHBOARD_MAX_TOP_ANSWERS), array_values($grouped));

    usort($result, static fn($a, $b) => $b['response_count'] <=> $a['response_count']);
    return array_slice($result, 0, DASHBOARD_MAX_TOP_QUESTIONS);
}

function tokenize_answer(array $row): array
{
    $raw = parse_json_field($row['answer_json'] ?? null, null);
    $value = trim((string) ($row['answer_value'] ?? ''));

    if (is_array($raw)) {
        return array_values(array_filter(array_map(static fn($v) => trim((string) $v), $raw), static fn($v) => $v !== ''));
    }
    if ($row['question_type'] === 'multiselect' && str_contains($value, '|')) {
        return array_values(array_filter(array_map('trim', explode('|', $value)), static fn($v) => $v !== ''));
    }
    if ($value === '') {
        return [];
    }
    return [mb_strlen($value) > 80 ? mb_substr($value, 0, 79) . '…' : $value];
}

function build_latest_responses(array $rows): array
{
    $slice = array_slice($rows, 0, DASHBOARD_MAX_LATEST_RESPONSES);
    return array_map(static fn($row) => [
        'response_id' => $row['response_id'],
        'submitted_at' => to_iso_utc($row['submitted_at']),
        'survey_slug' => $row['survey_slug'],
        'survey_title' => $row['survey_title'],
        'survey_niche' => $row['survey_niche'],
        'language' => $row['language'],
        'primary_label' => $row['primary_label'],
        'primary_value' => $row['primary_value'],
        'contact_name' => $row['contact_name'],
        'contact_email' => $row['contact_email'],
        'contact_phone' => $row['contact_phone'],
        'answered_count' => (int) $row['answered_count'],
        'question_count' => (int) $row['question_count'],
        'completion_rate' => $row['completion_rate'],
    ], $slice);
}

function get_response_detail(array $params): array
{
    $pdo = survey_pdo();
    require_dashboard_session($pdo, (string) ($params['token'] ?? ''));

    $responseId = sanitize_string($params['response_id'] ?? '', 64);
    if ($responseId === '') {
        return ['success' => false, 'message' => 'response_id obrigatorio.', '_code' => 400];
    }

    $stmt = $pdo->prepare('SELECT * FROM survey_responses WHERE response_id = :id LIMIT 1');
    $stmt->execute(['id' => $responseId]);
    $response = $stmt->fetch();

    if (!$response) {
        return ['success' => false, 'message' => 'Resposta nao encontrada.', '_code' => 404];
    }

    $answersStmt = $pdo->prepare(
        'SELECT question_order, question_key, question_label, question_type, answer_value, answer_json
         FROM survey_answers WHERE response_id = :id ORDER BY question_order'
    );
    $answersStmt->execute(['id' => $responseId]);
    $answers = array_map(static fn($row) => [
        'question_order' => (int) $row['question_order'],
        'question_key' => $row['question_key'],
        'question_label' => $row['question_label'],
        'question_type' => $row['question_type'],
        'answer_value' => $row['answer_value'],
        'answer_raw' => parse_json_field($row['answer_json'], null),
    ], $answersStmt->fetchAll());

    $response['submitted_at'] = to_iso_utc($response['submitted_at']);
    $response['created_at'] = to_iso_utc($response['created_at']);
    unset($response['answers_json'], $response['ip_hash'], $response['user_agent']);

    return [
        'success' => true,
        'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
        'response' => $response,
        'answers' => $answers,
    ];
}

// ─────────────────────────────────────────────────────────────────────────
// Análise por pesquisa (catálogo completo de perguntas + funil de conversão)
// ─────────────────────────────────────────────────────────────────────────

const FUNNEL_STAGE_ORDER = [
    'hotelaria' => [
        'interesse_teste' => ['Sim, claro!', 'Provavelmente sim.', 'Talvez...', 'Provavelmente não.', 'Não, definitivamente!'],
        'participar_piloto' => ['Sim', 'Não'],
    ],
    'locacao-para-eventos' => [
        'interesse_teste' => ['Sim, com certeza', 'Talvez', 'Não no momento'],
        'participar_piloto' => ['Sim', 'Talvez', 'Não'],
    ],
];

function get_survey_question_catalog(array $params): array
{
    $pdo = survey_pdo();
    require_dashboard_session($pdo, (string) ($params['token'] ?? ''));

    $surveySlug = sanitize_string($params['survey_slug'] ?? '', 60);
    if (!isset(SURVEY_QUESTION_CATALOG[$surveySlug])) {
        return ['success' => false, 'message' => 'survey_slug invalido.', '_code' => 400];
    }

    $filters = normalize_dashboard_filters($params);
    $filters['survey_slug'] = $surveySlug;

    $grouped = fetch_question_answer_groups($pdo, $filters);

    $sections = [];
    foreach (SURVEY_QUESTION_SECTIONS[$surveySlug] as $sectionDef) {
        $questions = [];
        foreach ($sectionDef['keys'] as $key) {
            $meta = SURVEY_QUESTION_CATALOG[$surveySlug][$key] ?? ['type' => 'text', 'label' => humanize_key($key)];

            $formatted = isset($grouped[$key])
                ? format_question_group($grouped[$key], null)
                : [
                    'question_key' => $key,
                    'question_label' => $meta['label'],
                    'question_type' => $meta['type'],
                    'response_count' => 0,
                    'distinct_answers' => 0,
                    'top_answers' => [],
                    'sample_answers' => [],
                ];

            // O catálogo é a fonte estável do rótulo/tipo (o que foi gravado na
            // resposta pode variar com o tempo se a pergunta mudar de texto).
            $formatted['question_label'] = $meta['label'];
            $formatted['question_type'] = $meta['type'];
            $questions[] = $formatted;
        }
        $sections[] = ['title' => $sectionDef['title'], 'questions' => $questions];
    }

    return [
        'success' => true,
        'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
        'survey_slug' => $surveySlug,
        'survey_title' => SURVEY_TITLES[$surveySlug] ?? $surveySlug,
        'sections' => $sections,
        'funnel' => build_conversion_funnel($grouped, $surveySlug),
    ];
}

function build_conversion_funnel(array $groupedByKey, string $surveySlug): array
{
    $stagesConfig = FUNNEL_STAGE_ORDER[$surveySlug] ?? [];
    $funnel = [];

    foreach (['interesse_teste', 'participar_piloto'] as $questionKey) {
        if (!isset($stagesConfig[$questionKey])) {
            continue;
        }

        $group = $groupedByKey[$questionKey] ?? null;
        $responseCount = $group['response_count'] ?? 0;
        $answerCounts = $group['answer_counts'] ?? [];

        $stages = [];
        foreach ($stagesConfig[$questionKey] as $label) {
            $count = $answerCounts[$label] ?? 0;
            $stages[] = [
                'label' => $label,
                'count' => $count,
                'percent' => $responseCount ? $count / $responseCount : 0,
            ];
        }

        $meta = SURVEY_QUESTION_CATALOG[$surveySlug][$questionKey] ?? null;
        $funnel[] = [
            'question_key' => $questionKey,
            'question_label' => $meta['label'] ?? humanize_key($questionKey),
            'response_count' => $responseCount,
            'stages' => $stages,
        ];
    }

    return $funnel;
}
