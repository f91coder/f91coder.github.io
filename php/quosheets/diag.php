<?php
declare(strict_types=1);

/**
 * TEMPORARIO: confere no banco de producao as consultas corrigidas (erro 1267 de collation). Nao altera dados:
 * o UPDATE roda com WHERE id = 0. Remover depois do uso. Acesso: GET api.php?action=mailDiag&t=<token>.
 */
const QS_DIAG_HASH = 'b43028ab7ab4de668ffa27b54da362e12845e7c5277b2ad2fb26db1592871b3a';

function qs_action_mail_diag(PDO $pdo): array
{
    if (!hash_equals(QS_DIAG_HASH, hash('sha256', (string) ($_GET['t'] ?? '')))) {
        throw new QsHttpException('not_found', 404);
    }
    $out = [
        'server' => (string) $pdo->query('SELECT VERSION()')->fetchColumn(),
        'collation_connection' => (string) $pdo->query('SELECT @@collation_connection')->fetchColumn(),
        'character_set_client' => (string) $pdo->query('SELECT @@character_set_client')->fetchColumn(),
    ];
    $checks = [];
    $run = static function (string $label, callable $fn) use (&$checks): void {
        try {
            $checks[$label] = 'ok' . (($extra = $fn()) !== null ? ' ' . $extra : '');
        } catch (Throwable $e) {
            $checks[$label] = 'ERRO: ' . $e->getMessage();
        }
    };
    $run('painel admin (codigo real + JSON)', static function () use ($pdo): string {
        $data = qs_admin_overview($pdo);
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('json_encode: ' . json_last_error_msg());
        }
        return '(' . count($data['users']) . ' usuarios, ' . strlen($json) . ' bytes)';
    });
    $run('assinatura: UPDATE novo (0 linhas)', static function () use ($pdo): string {
        $st = $pdo->prepare(QS_SQL_SAVE_PLAN);
        $st->execute(['st' => 'active', 'pe' => null, 'cap' => 0, 'sid' => 'sub_diag', 'cid' => 'cus_diag', 'cur' => 'BRL', 'id' => 0]);
        return '(' . $st->rowCount() . ' linhas)';
    });
    $run('antiga DATE_FORMAT = :m (esperado ERRO)', static function () use ($pdo): void {
        $pdo->prepare("SELECT COUNT(*) FROM qs_ai_usage WHERE DATE_FORMAT(created_at, '%Y-%m') = :m")->execute(['m' => gmdate('Y-m')]);
    });
    $run('antiga NULLIF(:cid, \'\') (esperado ERRO)', static function () use ($pdo): void {
        $pdo->prepare("UPDATE qs_users SET stripe_customer_id = COALESCE(NULLIF(:cid, ''), stripe_customer_id) WHERE id = 0")->execute(['cid' => 'cus_diag']);
    });
    $out['checks'] = $checks;
    return $out;
}
