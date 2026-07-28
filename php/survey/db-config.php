<?php
declare(strict_types=1);

$config = [
    'host' => getenv('SURVEY_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('SURVEY_DB_PORT') ?: '3306',
    'database' => getenv('SURVEY_DB_NAME') ?: 'f91_survey',
    'username' => getenv('SURVEY_DB_USER') ?: 'root',
    'password' => getenv('SURVEY_DB_PASS') ?: '',
    'dashboard_password_hash' => getenv('SURVEY_DASHBOARD_PASSWORD_HASH') ?: '',
    'ip_hash_pepper' => getenv('SURVEY_IP_HASH_PEPPER') ?: 'f91-survey-default-pepper-change-me',
    'notification_emails' => getenv('SURVEY_NOTIFICATION_EMAILS') ?: 'filoliveira.me@gmail.com,f91.adm@gmail.com',
];

$localPath = __DIR__ . '/db-config.local.php';
if (is_file($localPath)) {
    $local = include $localPath;
    if (is_array($local)) {
        $config = array_merge($config, $local);
    }
}

return $config;
