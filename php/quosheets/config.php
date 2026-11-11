<?php
declare(strict_types=1);

/**
 * Configuracao do Quosheets.
 *
 * Banco: o mesmo do FPV (tabelas com prefixo qs_). As credenciais vem de php/fpv/config.php, que no
 * servidor ja le php/fpv/config.local.php — por isso o deploy do Quosheets nao exige arquivo novo.
 *
 * Chaves de API (Anthropic e Stripe) NAO ficam em arquivo: o admin cola no painel /quosheets/admin e
 * elas sao gravadas criptografadas em qs_settings. config.local.php (gitignored) so serve para dev/testes
 * (ex.: apontar a API da Anthropic ou do Stripe para um servidor simulado).
 */

$fpv = require __DIR__ . '/../fpv/config.php';

$config = [
    'db' => [
        'host' => $fpv['host'],
        'port' => $fpv['port'],
        'database' => $fpv['database'],
        'username' => $fpv['username'],
        'password' => $fpv['password'],
    ],
    // Segredo do servidor: hash de IP/codigos e chave de criptografia dos settings. Mistura o pepper com a
    // senha do banco (que so existe no config.local.php do servidor), para que um dump do banco + o codigo
    // publico nao bastem para abrir as chaves salvas. Se a senha do banco mudar, cole as chaves de novo no admin.
    'secret' => hash('sha256', 'quosheets|' . ($fpv['ip_hash_pepper'] ?? '') . '|' . ($fpv['password'] ?? '')),
    'site_url' => 'https://www.f91.tech',
    'base_path' => '/quosheets',
    // Contas com estes e-mails (sha256 do e-mail em minusculas), depois de verificadas, administram o produto.
    'admin_email_hashes' => [
        '0c382d500b71b4ea895141d3230a7926259a9c0930a21bf4d73b6c7912448d46',
        'eab11c64542edd1b7e840ed1d9cafdfb63cd29e6e3c9753bd1a92991b85f163c',
    ],
    // Destinos das chamadas externas (sobrescritos so em testes locais).
    'anthropic_base_url' => null,
    'stripe_api_base' => 'https://api.stripe.com',
    'mail_enabled' => true,
];

$localPath = __DIR__ . '/config.local.php';
if (is_file($localPath)) {
    $local = include $localPath;
    if (is_array($local)) {
        $config = array_replace_recursive($config, $local);
    }
}

return $config;
