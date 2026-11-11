<?php
declare(strict_types=1);

/**
 * TEMPORARIO: mostra as linhas recentes do log de erros do PHP ligadas ao Quosheets. Remover depois do uso.
 * Acesso: GET api.php?action=mailDiag&t=<token> (so o hash do token fica no codigo).
 */
const QS_DIAG_HASH = 'af332fe37fe41925a8a05526ab5a6182e9469f3bc589f0b8329533b4a171acb3';

function qs_action_mail_diag(PDO $pdo): array
{
    if (!hash_equals(QS_DIAG_HASH, hash('sha256', (string) ($_GET['t'] ?? '')))) {
        throw new QsHttpException('not_found', 404);
    }
    $out = ['now' => gmdate('d-M-Y H:i:s') . ' UTC', 'lines' => []];
    $logPath = (string) ini_get('error_log');
    if ($logPath === '' || !is_readable($logPath)) {
        $out['error'] = 'log ilegivel';
        return $out;
    }
    $size = (int) filesize($logPath);
    $fh = fopen($logPath, 'rb');
    if (!$fh) {
        return $out;
    }
    fseek($fh, max(0, $size - 600000));
    $chunk = (string) stream_get_contents($fh);
    fclose($fh);
    $today = gmdate('d-M-Y');
    $keep = [];
    $inBlock = false;
    foreach (explode("\n", $chunk) as $line) {
        $isEntry = str_starts_with($line, '[');
        if ($isEntry) {
            $inBlock = str_contains($line, $today) && (stripos($line, 'quosheets') !== false || str_contains($line, 'PHP '));
        }
        if ($inBlock) {
            $keep[] = mb_substr($line, 0, 700);
        }
    }
    $out['lines'] = array_slice($keep, -40);
    return $out;
}
