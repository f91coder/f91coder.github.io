<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

try {
    $pdo = survey_pdo();
    require_dashboard_session($pdo, (string) ($_GET['token'] ?? ''));
} catch (DashboardAuthException $e) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo $e->getMessage();
    exit;
}

$filters = normalize_dashboard_filters($_GET);
[$whereSql, $whereParams] = build_dashboard_where($filters);

$stmt = $pdo->prepare(
    "SELECT response_id, submitted_at, survey_slug, survey_title, survey_niche, survey_version, language,
            question_count, answered_count, primary_label, primary_value,
            contact_name, contact_email, contact_phone
     FROM survey_responses
     {$whereSql}
     ORDER BY submitted_at DESC"
);
$stmt->execute($whereParams);

$filename = 'f91-survey-respostas-' . gmdate('Ymd-His') . '.csv';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: no-store');

$out = fopen('php://output', 'w');
// BOM UTF-8 para o Excel reconhecer acentos corretamente ao abrir o arquivo.
fwrite($out, "\xEF\xBB\xBF");

$headers = [
    'response_id', 'submitted_at', 'survey_slug', 'survey_title', 'survey_niche', 'survey_version', 'language',
    'question_count', 'answered_count', 'primary_label', 'primary_value',
    'contact_name', 'contact_email', 'contact_phone',
];
fputcsv($out, $headers, ';');

while ($row = $stmt->fetch()) {
    $row['submitted_at'] = to_iso_utc($row['submitted_at']);
    fputcsv($out, $row, ';');
}

fclose($out);
