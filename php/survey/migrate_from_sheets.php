<?php
declare(strict_types=1);

/**
 * Script de migração ÚNICA EXECUÇÃO: importa as respostas históricas do
 * Google Sheets (via o Apps Script antigo, ainda ativo) para o novo banco
 * MySQL. Rode uma vez (CLI: `php migrate_from_sheets.php`, ou navegador
 * com `?confirm=yes`), confira os números no painel, depois APAGUE ESTE
 * ARQUIVO do servidor e do repositório.
 *
 * A planilha de respostas não guarda label/tipo/ordem por pergunta — só o
 * par chave/valor. Por isso as perguntas são recompostas aqui a partir dos
 * arrays QUESTIONS conhecidos de cada survey (copiados de survey_hotels.html
 * e js/survey_event_rental.js). Perguntas fora dessa lista caem no fallback
 * (rótulo humanizado, tipo "text"), sem perda de dado — só de metadado.
 */

require_once __DIR__ . '/lib.php';

if (PHP_SAPI !== 'cli' && ($_GET['confirm'] ?? '') !== 'yes') {
    header('Content-Type: text/plain; charset=utf-8');
    echo "Adicione ?confirm=yes na URL para confirmar a execucao da migracao.\n";
    exit;
}

const LEGACY_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbztCzoDzxzzEyg70Mkc6PHDSsICsi0nFcXqpBhepeMWhstrZI46_peAlBh6nNAd7lEn/exec';

const SURVEY_QUESTION_META = [
    'hotelaria' => [
        ['key' => 'nome_hotel', 'type' => 'text', 'label' => 'Nome do hotel ou rede hoteleira'],
        ['key' => 'cidade_estado', 'type' => 'text', 'label' => 'Cidade / Estado'],
        ['key' => 'categoria', 'type' => 'select', 'label' => 'Categoria do hotel'],
        ['key' => 'num_quartos', 'type' => 'select', 'label' => 'Número aproximado de quartos'],
        ['key' => 'possui_salas', 'type' => 'select', 'label' => 'Possui salas de eventos / reuniões?'],
        ['key' => 'trabalha_grupos', 'type' => 'select', 'label' => 'Seu hotel já trabalha (ou deseja trabalhar) com negociação de tarifa para hospedagem em grupos e/ou eventos?'],
        ['key' => 'como_recebe_solicitacoes', 'type' => 'multiselect', 'label' => 'Como atualmente recebem solicitações de orçamento de eventos e/ou hospedagem em grupo?'],
        ['key' => 'frequencia_solicitacoes', 'type' => 'select', 'label' => 'Com que frequência o hotel recebe solicitações de grupos?'],
        ['key' => 'tempo_ate_proposta', 'type' => 'select', 'label' => 'Em média, quanto tempo leva da solicitação até o envio da proposta?'],
        ['key' => 'maiores_desafios', 'type' => 'multiselect', 'label' => 'Quais são os maiores desafios no processo de negociação de grupos/eventos?'],
        ['key' => 'sistema_registro', 'type' => 'multiselect', 'label' => 'Qual sistema/ferramenta o hotel utiliza hoje para registrar, acompanhar e enviar propostas dessas negociações?'],
        ['key' => 'que_gostaria', 'type' => 'multiselect', 'label' => 'O que você gostaria que este sistema/ferramenta tivesse de recurso para que seu processo de envio de proposta e negociação fosse mais prático e eficiente?'],
        ['key' => 'interesse_teste', 'type' => 'select', 'label' => 'Se existisse uma ferramenta com todos os recursos que você selecionou na pergunta anterior, toparia testar gratuitamente por um período?'],
        ['key' => 'participar_piloto', 'type' => 'select', 'label' => 'Gostaria de participar como hotel piloto (fase de testes) e obter benefícios vitalícios exclusivos?'],
        ['key' => 'responsavel_nome', 'type' => 'text', 'label' => 'Digite seu nome'],
        ['key' => 'responsavel_email', 'type' => 'email', 'label' => 'Seu E-mail'],
        ['key' => 'responsavel_telefone', 'type' => 'tel', 'label' => 'Seu Telefone'],
        ['key' => 'comentarios', 'type' => 'textarea', 'label' => 'Alguma sugestão adicional ou comentário?'],
    ],
    'locacao-para-eventos' => [
        ['key' => 'empresa_nome', 'type' => 'text', 'label' => 'Nome da empresa'],
        ['key' => 'cidade_estado', 'type' => 'text', 'label' => 'Cidade / Estado'],
        ['key' => 'tipo_operacao', 'type' => 'multiselect', 'label' => 'O que a empresa mais loca para eventos?'],
        ['key' => 'orcamentos_mes', 'type' => 'select', 'label' => 'Quantos orçamentos/propostas vocês enviam por mês, em média?'],
        ['key' => 'canais_entrada', 'type' => 'multiselect', 'label' => 'Por quais canais os pedidos de orçamento costumam chegar?'],
        ['key' => 'como_monta_proposta', 'type' => 'multiselect', 'label' => 'Como vocês montam e enviam as propostas hoje?'],
        ['key' => 'tempo_envio_proposta', 'type' => 'select', 'label' => 'Quanto tempo costuma levar entre o pedido e o envio da proposta?'],
        ['key' => 'controle_status', 'type' => 'multiselect', 'label' => 'Como vocês controlam o status das negociações em andamento?'],
        ['key' => 'principais_gargalos', 'type' => 'multiselect', 'label' => 'Quais são hoje os principais gargalos do processo comercial?'],
        ['key' => 'controle_disponibilidade', 'type' => 'select', 'label' => 'Vocês controlam a disponibilidade dos itens por data em algum sistema?'],
        ['key' => 'conflito_reserva', 'type' => 'select', 'label' => 'Quando não há controle total em sistema, como evitam conflito de reserva ou item duplicado?'],
        ['key' => 'sistema_disponibilidade', 'type' => 'select', 'label' => 'Qual solução vocês usam hoje para controlar a disponibilidade?'],
        ['key' => 'info_proposta', 'type' => 'multiselect', 'label' => 'O que normalmente precisa aparecer em uma proposta/orçamento?'],
        ['key' => 'integracao_areas', 'type' => 'select', 'label' => 'Comercial, operação e estoque/logística ficam integrados no mesmo fluxo?'],
        ['key' => 'quebra_processo', 'type' => 'select', 'label' => 'Onde o processo mais costuma quebrar entre comercial e operação?'],
        ['key' => 'recursos_desejados', 'type' => 'multiselect', 'label' => 'Quais recursos teriam maior impacto em uma solução ideal para sua empresa?'],
        ['key' => 'interesse_teste', 'type' => 'select', 'label' => 'Se essa solução existisse com os recursos certos, faria sentido testar?'],
        ['key' => 'participar_piloto', 'type' => 'select', 'label' => 'Sua empresa teria interesse em participar como piloto da solução?'],
        ['key' => 'responsavel_nome', 'type' => 'text', 'label' => 'Nome do responsável'],
        ['key' => 'responsavel_email', 'type' => 'email', 'label' => 'E-mail para contato'],
        ['key' => 'responsavel_telefone', 'type' => 'tel', 'label' => 'Telefone para contato'],
    ],
];

function question_meta_for(string $surveySlug, string $key): array
{
    $list = SURVEY_QUESTION_META[$surveySlug] ?? [];
    foreach ($list as $index => $meta) {
        if ($meta['key'] === $key) {
            return ['order' => $index + 1, 'label' => $meta['label'], 'type' => $meta['type']];
        }
    }
    return ['order' => 999, 'label' => humanize_key($key), 'type' => 'text'];
}

function fetch_legacy_responses(): array
{
    $url = LEGACY_APPS_SCRIPT_URL . '?action=getSurveyResponses';
    $context = stream_context_create(['http' => ['timeout' => 30]]);
    $json = @file_get_contents($url, false, $context);
    if ($json === false) {
        fwrite(STDERR, "Falha ao buscar dados do Apps Script em: {$url}\n");
        exit(1);
    }

    $data = json_decode($json, true);
    if (!is_array($data) || empty($data['success'])) {
        fwrite(STDERR, 'Resposta invalida do Apps Script: ' . substr($json, 0, 500) . "\n");
        exit(1);
    }

    return $data['surveys'] ?? [];
}

$pdo = survey_pdo();
$rows = fetch_legacy_responses();

$inserted = 0;
$skipped = 0;
$answersInserted = 0;

foreach ($rows as $row) {
    $responseId = sanitize_string($row['response_id'] ?? '', 64);
    if ($responseId === '' || !is_valid_uuid_like($responseId)) {
        $skipped++;
        continue;
    }

    $existsStmt = $pdo->prepare('SELECT 1 FROM survey_responses WHERE response_id = :id');
    $existsStmt->execute(['id' => $responseId]);
    if ($existsStmt->fetchColumn()) {
        $skipped++;
        continue;
    }

    $surveySlug = sanitize_string($row['survey_slug'] ?? '', 60) ?: 'geral';
    $answers = is_array($row['answers'] ?? null) ? $row['answers'] : [];
    $submittedAtRaw = (string) ($row['submitted_at'] ?? '');
    $submittedAtTs = $submittedAtRaw !== '' ? (strtotime($submittedAtRaw) ?: time()) : time();

    $pdo->beginTransaction();
    try {
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
            'response_id' => $responseId,
            'survey_slug' => $surveySlug,
            'survey_title' => sanitize_string($row['survey_title'] ?? '', 200),
            'survey_niche' => sanitize_string($row['survey_niche'] ?? '', 120),
            'survey_version' => sanitize_string($row['survey_version'] ?? '', 30),
            'source_file' => sanitize_string($row['source_file'] ?? '', 120),
            'source_url' => sanitize_string($row['source_url'] ?? '', 500),
            'language' => sanitize_string($row['language'] ?? '', 2) ?: 'pt',
            'question_count' => (int) ($row['question_count'] ?? count($answers)),
            'answered_count' => (int) ($row['answered_count'] ?? count(array_filter($answers))),
            'primary_label' => sanitize_string($row['primary_label'] ?? '', 255),
            'primary_value' => sanitize_string($row['primary_value'] ?? '', 255),
            'contact_name' => sanitize_string($row['contact_name'] ?? '', 150),
            'contact_email' => sanitize_string($row['contact_email'] ?? '', 190),
            'contact_phone' => sanitize_string($row['contact_phone'] ?? '', 40),
            'answers_json' => safe_json_encode($answers),
            'ip_hash' => '',
            'user_agent' => 'migrated-from-google-sheets',
            'submitted_at' => gmdate('Y-m-d H:i:s', $submittedAtTs),
        ]);

        $answerStmt = $pdo->prepare(
            'INSERT INTO survey_answers
                (response_id, question_order, question_key, question_label, question_type, answer_value, answer_json)
             VALUES
                (:response_id, :question_order, :question_key, :question_label, :question_type, :answer_value, :answer_json)'
        );

        foreach ($answers as $key => $value) {
            $formatted = format_answer_value($value);
            if ($formatted === '') {
                continue;
            }
            $meta = question_meta_for($surveySlug, (string) $key);
            $answerStmt->execute([
                'response_id' => $responseId,
                'question_order' => $meta['order'],
                'question_key' => (string) $key,
                'question_label' => $meta['label'],
                'question_type' => $meta['type'],
                'answer_value' => $formatted,
                'answer_json' => safe_json_encode($value),
            ]);
            $answersInserted++;
        }

        $pdo->commit();
        $inserted++;
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Erro ao migrar {$responseId}: {$e->getMessage()}\n");
        $skipped++;
    }
}

header('Content-Type: text/plain; charset=utf-8');
echo "Migracao concluida.\n";
echo "Respostas inseridas: {$inserted}\n";
echo "Respostas de perguntas inseridas: {$answersInserted}\n";
echo "Ignoradas (ja existentes ou invalidas): {$skipped}\n";
echo "\nConfira os numeros no painel (survey_dashboard.html) e depois APAGUE este arquivo.\n";
