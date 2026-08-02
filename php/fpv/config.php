<?php
declare(strict_types=1);

$config = [
    'host' => getenv('FPV_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('FPV_DB_PORT') ?: '3306',
    'database' => getenv('FPV_DB_NAME') ?: 'f91_survey',
    'username' => getenv('FPV_DB_USER') ?: 'root',
    'password' => getenv('FPV_DB_PASS') ?: '',
    'dashboard_password_hash' => getenv('FPV_DASHBOARD_PASSWORD_HASH') ?: '',
    'ip_hash_pepper' => getenv('FPV_IP_HASH_PEPPER') ?: 'f91-fpv-default-pepper-change-me',
];

$localPath = __DIR__ . '/config.local.php';
if (is_file($localPath)) {
    $local = include $localPath;
    if (is_array($local)) {
        $config = array_merge($config, $local);
    }
}

return $config;
