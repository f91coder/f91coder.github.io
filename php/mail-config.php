<?php
declare(strict_types=1);

$config = [
    'host' => getenv('SMTP_HOST') ?: '',
    'username' => getenv('SMTP_USER') ?: '',
    'password' => getenv('SMTP_PASS') ?: '',
    'port' => getenv('SMTP_PORT') ?: '587',
    'encryption' => getenv('SMTP_ENCRYPTION') ?: 'tls',
    'from_email' => getenv('SMTP_FROM') ?: (getenv('SMTP_USER') ?: ''),
    'from_name' => getenv('SMTP_FROM_NAME') ?: 'F91 - Soluções Operacionais',
    'to_email' => getenv('SMTP_TO') ?: (getenv('SMTP_USER') ?: ''),
];

$localPath = __DIR__ . '/mail-config.local.php';
if (is_file($localPath)) {
    $local = include $localPath;
    if (is_array($local)) {
        $config = array_merge($config, $local);
    }
}

return $config;
