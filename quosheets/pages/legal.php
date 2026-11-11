<?php
/**
 * Politica de privacidade e termos de uso (pt, en, es). Valores do plano vem das configuracoes.
 * @var string $doc privacy|terms  @var string $lang  @var string $nonce  @var PDO $pdo
 */
$prices = qs_prices($pdo);
$vars = [
    '{days}' => qs_e(qs_setting_int($pdo, 'trial_days')),
    '{brl}' => qs_e('R$ ' . number_format($prices['BRL'], 2, ',', '.')),
    '{usd}' => qs_e('US$ ' . number_format($prices['USD'], 2, '.', ',')),
    '{credits}' => qs_e(number_format(qs_setting_int($pdo, 'credits_monthly'), 0, ',', $lang === 'en' ? ',' : '.')),
    '{contact}' => '<a href="/#contact">f91.tech/#contact</a>',
];

$docs = [
    'privacy' => [
        'pt' => ['title' => 'Política de Privacidade', 'updated' => 'Última atualização: 11 de novembro de 2026', 'intro' => 'O Quosheets é um produto da F91 (f91.tech). Esta política explica quais dados tratamos, por quê e quais são os seus direitos, em linha com a LGPD (Lei 13.709/2018) e o GDPR.', 'sections' => [
            ['Seus arquivos ficam no seu navegador', ['As planilhas que você abre (CSV, Excel, ODS, JSON) são lidas, editadas e salvas no próprio navegador (IndexedDB do seu dispositivo). O conteúdo desses arquivos não é enviado aos nossos servidores para edição, filtros, gráficos, tabelas dinâmicas ou exportação.', 'Como os arquivos ficam no seu dispositivo, limpar os dados do navegador ou trocar de computador remove o acesso a eles. Exporte cópias sempre que precisar.']],
            ['Dados da conta', ['Guardamos o mínimo para a conta funcionar: nome, e-mail, senha (somente o hash, nunca a senha em texto), idioma, datas de cadastro e de acesso, situação do teste e da assinatura e o histórico de uso da IA (quantidade de tokens, créditos e linhas processadas — sem o conteúdo enviado).', 'Usamos esses dados para autenticar você, liberar o plano, contar créditos, enviar e-mails da conta (código de confirmação, redefinição de senha) e prevenir abuso.']],
            ['Recursos de IA (Quo.IA)', ['Quando você usa um recurso de IA, enviamos à Anthropic (modelos Claude), como operadora, somente o necessário para a tarefa: nas automações, as colunas e linhas que você escolheu; nas perguntas, insights e fórmulas, os nomes e tipos das colunas, estatísticas resumidas e até 5 linhas de exemplo.', 'O conteúdo enviado não é armazenado pelo Quosheets. O tratamento pela Anthropic segue os termos comerciais e a política de privacidade dela. Não use a IA com dados que você não tem autorização para compartilhar.']],
            ['Pagamentos', ['As assinaturas são processadas pela Stripe. Os dados do cartão são informados diretamente à Stripe e nunca passam pelos nossos servidores. Recebemos apenas o identificador do cliente, a situação da assinatura, a moeda e as datas de cobrança.']],
            ['Cookies e armazenamento local', ['Usamos um cookie de sessão (qs_session, protegido e inacessível a scripts) para manter você conectado e um cookie de idioma (qs_lang). Não usamos cookies de publicidade nem rastreadores de terceiros. O armazenamento local do navegador guarda seus arquivos e preferências do app.']],
            ['Compartilhamento', ['Não vendemos dados. Compartilhamos dados apenas com operadores necessários ao serviço: hospedagem (Hostinger), envio de e-mails, Stripe (pagamentos) e Anthropic (IA), ou quando exigido por lei.']],
            ['Retenção e exclusão', ['Os dados da conta ficam guardados enquanto a conta existir. Em Conta → Zona de perigo você exclui a conta: a assinatura é cancelada e os dados da conta e o histórico de uso são apagados dos nossos servidores. Registros de cobrança podem ser mantidos pela Stripe pelo prazo exigido em lei.']],
            ['Segurança', ['Usamos HTTPS, senhas com hash forte, sessões com token aleatório, limites de tentativas e criptografia para chaves e segredos do sistema. Nenhum sistema é 100% seguro; se notar algo estranho, fale conosco.']],
            ['Seus direitos', ['Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, além de informações sobre o tratamento. Nome e idioma podem ser alterados no próprio app. Para outros pedidos, use o contato abaixo.']],
            ['Contato', ['Dúvidas sobre privacidade: {contact}. Podemos atualizar esta política; mudanças relevantes serão avisadas por e-mail ou no app.']],
        ]],
        'en' => ['title' => 'Privacy Policy', 'updated' => 'Last updated: November 11, 2026', 'intro' => 'Quosheets is a product by F91 (f91.tech). This policy explains what data we process, why, and your rights, in line with the GDPR and Brazil’s LGPD.', 'sections' => [
            ['Your files stay in your browser', ['The spreadsheets you open (CSV, Excel, ODS, JSON) are read, edited and saved in your own browser (your device’s IndexedDB). Their content is not sent to our servers for editing, filtering, charts, pivot tables or export.', 'Because files live on your device, clearing browser data or switching computers removes access to them. Export copies whenever you need to.']],
            ['Account data', ['We keep the minimum needed to run your account: name, email, password (hash only, never plain text), language, sign-up and login dates, trial and subscription status, and AI usage history (token counts, credits and rows processed — not the content sent).', 'We use this data to authenticate you, unlock your plan, count credits, send account emails (confirmation codes, password resets) and prevent abuse.']],
            ['AI features (Quo.IA)', ['When you use an AI feature, we send Anthropic (Claude models), as a processor, only what the task needs: for automations, the columns and rows you chose; for questions, insights and formulas, column names and types, summary statistics and up to 5 sample rows.', 'Quosheets does not store the content sent. Anthropic processes it under its commercial terms and privacy policy. Do not use AI on data you are not allowed to share.']],
            ['Payments', ['Subscriptions are processed by Stripe. Card details go directly to Stripe and never touch our servers. We only receive the customer ID, subscription status, currency and billing dates.']],
            ['Cookies and local storage', ['We use a session cookie (qs_session, secure and not readable by scripts) to keep you signed in, and a language cookie (qs_lang). We use no advertising cookies or third-party trackers. Your browser’s local storage keeps your files and app preferences.']],
            ['Sharing', ['We do not sell data. We share data only with processors needed to run the service: hosting (Hostinger), email delivery, Stripe (payments) and Anthropic (AI), or when required by law.']],
            ['Retention and deletion', ['Account data is kept while your account exists. In Account → Danger zone you can delete your account: the subscription is canceled and your account data and usage history are erased from our servers. Billing records may be kept by Stripe as required by law.']],
            ['Security', ['We use HTTPS, strong password hashing, random-token sessions, rate limits and encryption for system keys and secrets. No system is 100% secure; if you notice anything odd, contact us.']],
            ['Your rights', ['You may request access, correction, portability or deletion of your data, and information about how it is processed. Name and language can be changed in the app. For other requests, use the contact below.']],
            ['Contact', ['Privacy questions: {contact}. We may update this policy; relevant changes will be announced by email or in the app.']],
        ]],
        'es' => ['title' => 'Política de Privacidad', 'updated' => 'Última actualización: 11 de noviembre de 2026', 'intro' => 'Quosheets es un producto de F91 (f91.tech). Esta política explica qué datos tratamos, para qué y cuáles son tus derechos, conforme al RGPD y a la LGPD de Brasil.', 'sections' => [
            ['Tus archivos se quedan en tu navegador', ['Las hojas de cálculo que abres (CSV, Excel, ODS, JSON) se leen, editan y guardan en tu propio navegador (IndexedDB de tu dispositivo). Su contenido no se envía a nuestros servidores para editar, filtrar, crear gráficos, tablas dinámicas o exportar.', 'Como los archivos están en tu dispositivo, borrar los datos del navegador o cambiar de equipo elimina el acceso a ellos. Exporta copias siempre que lo necesites.']],
            ['Datos de la cuenta', ['Guardamos lo mínimo para que la cuenta funcione: nombre, correo, contraseña (solo el hash, nunca en texto plano), idioma, fechas de registro y acceso, estado de la prueba y de la suscripción e historial de uso de la IA (tokens, créditos y filas procesadas — sin el contenido enviado).', 'Usamos estos datos para autenticarte, activar tu plan, contar créditos, enviar correos de la cuenta (códigos de confirmación, restablecimiento de contraseña) y prevenir abusos.']],
            ['Funciones de IA (Quo.IA)', ['Cuando usas una función de IA, enviamos a Anthropic (modelos Claude), como encargado del tratamiento, solo lo necesario: en las automatizaciones, las columnas y filas que elegiste; en preguntas, insights y fórmulas, los nombres y tipos de columnas, estadísticas resumidas y hasta 5 filas de ejemplo.', 'Quosheets no almacena el contenido enviado. Anthropic lo trata según sus términos comerciales y su política de privacidad. No uses la IA con datos que no estés autorizado a compartir.']],
            ['Pagos', ['Las suscripciones las procesa Stripe. Los datos de la tarjeta van directamente a Stripe y nunca pasan por nuestros servidores. Solo recibimos el identificador del cliente, el estado de la suscripción, la moneda y las fechas de cobro.']],
            ['Cookies y almacenamiento local', ['Usamos una cookie de sesión (qs_session, protegida e inaccesible para scripts) para mantener tu sesión y una cookie de idioma (qs_lang). No usamos cookies publicitarias ni rastreadores de terceros. El almacenamiento local del navegador guarda tus archivos y preferencias.']],
            ['Compartición', ['No vendemos datos. Solo compartimos datos con encargados necesarios para el servicio: alojamiento (Hostinger), envío de correos, Stripe (pagos) y Anthropic (IA), o cuando la ley lo exija.']],
            ['Conservación y eliminación', ['Los datos de la cuenta se guardan mientras exista la cuenta. En Cuenta → Zona de peligro puedes eliminarla: la suscripción se cancela y los datos de la cuenta y el historial de uso se borran de nuestros servidores. Stripe puede conservar registros de cobro según exija la ley.']],
            ['Seguridad', ['Usamos HTTPS, hash robusto de contraseñas, sesiones con token aleatorio, límites de intentos y cifrado para claves y secretos del sistema. Ningún sistema es 100 % seguro; si notas algo raro, contáctanos.']],
            ['Tus derechos', ['Puedes solicitar acceso, rectificación, portabilidad o eliminación de tus datos, e información sobre su tratamiento. El nombre y el idioma se cambian en la propia app. Para otras solicitudes, usa el contacto de abajo.']],
            ['Contacto', ['Preguntas sobre privacidad: {contact}. Podemos actualizar esta política; los cambios relevantes se avisarán por correo o en la app.']],
        ]],
    ],
    'terms' => [
        'pt' => ['title' => 'Termos de Uso', 'updated' => 'Última atualização: 11 de novembro de 2026', 'intro' => 'Ao criar uma conta ou usar o Quosheets (produto da F91), você concorda com estes termos.', 'sections' => [
            ['O serviço', ['O Quosheets é um editor online de arquivos CSV e Excel com análise de dados, gráficos, edição completa (criar, ler, atualizar e excluir), exportação e recursos de inteligência artificial.']],
            ['Conta', ['Você deve informar dados verdadeiros, confirmar o e-mail e manter a senha em segredo. A conta é pessoal; você responde pelas atividades feitas nela.']],
            ['Teste grátis', ['Contas novas têm {days} dias de acesso completo, sem cartão, a partir da confirmação do e-mail, com uma cota reduzida de créditos de IA. Depois do teste, os arquivos continuam disponíveis para leitura no seu navegador, mas editar, exportar e usar a IA exigem assinatura.']],
            ['Plano e cobrança', ['Há um único plano, o Quosheets Pro, por {brl} ou {usd} por mês, cobrado de forma recorrente pela Stripe até o cancelamento. Você pode cancelar a qualquer momento em Conta → Gerenciar assinatura; o acesso continua até o fim do período já pago.', 'Os valores pagos não são reembolsados proporcionalmente, ressalvado o direito de arrependimento e demais direitos previstos na legislação de defesa do consumidor. Eventuais mudanças de preço valem para novas assinaturas ou serão avisadas com antecedência.']],
            ['Créditos de IA', ['O plano inclui {credits} créditos de IA por mês. Os créditos são descontados conforme o uso real de cada recurso, renovam a cada mês e não se acumulam. Respostas de IA podem conter erros: revise os resultados antes de usá-los em decisões importantes.']],
            ['Seus dados', ['Você continua dono dos seus arquivos e do conteúdo que cria. Os arquivos ficam armazenados no seu navegador; você é responsável por manter cópias (exportações) e por ter autorização para tratar os dados que carrega, inclusive dados pessoais de terceiros.']],
            ['Uso aceitável', ['Não é permitido usar o serviço para fins ilegais, violar direitos de terceiros, tentar acessar contas ou sistemas sem autorização, contornar limites do plano, revender o acesso ou sobrecarregar a infraestrutura de forma automatizada.']],
            ['Disponibilidade e mudanças', ['Trabalhamos para manter o serviço disponível e evoluindo, mas ele pode passar por manutenções, mudanças ou interrupções. Recursos podem ser adicionados, alterados ou removidos.']],
            ['Limitação de responsabilidade', ['Na extensão permitida pela lei, o serviço é fornecido “como está” e a F91 não responde por perdas indiretas, lucros cessantes ou perda de dados armazenados localmente no seu navegador. A responsabilidade total fica limitada ao valor pago por você nos 12 meses anteriores ao evento.']],
            ['Encerramento', ['Você pode excluir sua conta quando quiser. Podemos suspender ou encerrar contas que violem estes termos.']],
            ['Lei aplicável e contato', ['Estes termos são regidos pelas leis do Brasil, sem prejuízo dos direitos do consumidor no país em que reside. Contato: {contact}.']],
        ]],
        'en' => ['title' => 'Terms of Service', 'updated' => 'Last updated: November 11, 2026', 'intro' => 'By creating an account or using Quosheets (a product by F91), you agree to these terms.', 'sections' => [
            ['The service', ['Quosheets is an online editor for CSV and Excel files with data analysis, charts, full editing (create, read, update and delete), export and artificial-intelligence features.']],
            ['Account', ['You must provide accurate information, confirm your email and keep your password secret. Accounts are personal; you are responsible for activity on yours.']],
            ['Free trial', ['New accounts get {days} days of full access, no card required, starting when the email is confirmed, with a smaller AI credit allowance. After the trial, files remain readable in your browser, but editing, exporting and AI require a subscription.']],
            ['Plan and billing', ['There is a single plan, Quosheets Pro, for {usd} or {brl} per month, billed on a recurring basis by Stripe until canceled. You can cancel anytime in Account → Manage subscription; access continues until the end of the period already paid.', 'Payments are not refunded pro rata, except for withdrawal rights and other rights granted by consumer-protection law. Price changes apply to new subscriptions or will be announced in advance.']],
            ['AI credits', ['The plan includes {credits} AI credits per month. Credits are deducted according to the actual usage of each feature, renew every month and do not roll over. AI answers may contain mistakes: review results before using them for important decisions.']],
            ['Your data', ['You keep ownership of your files and the content you create. Files are stored in your browser; you are responsible for keeping copies (exports) and for being authorized to process the data you load, including third parties’ personal data.']],
            ['Acceptable use', ['You may not use the service for illegal purposes, infringe others’ rights, attempt unauthorized access to accounts or systems, circumvent plan limits, resell access or overload the infrastructure through automation.']],
            ['Availability and changes', ['We work to keep the service available and improving, but it may undergo maintenance, changes or interruptions. Features may be added, changed or removed.']],
            ['Limitation of liability', ['To the extent permitted by law, the service is provided “as is” and F91 is not liable for indirect losses, lost profits or loss of data stored locally in your browser. Total liability is limited to the amount you paid in the 12 months before the event.']],
            ['Termination', ['You can delete your account at any time. We may suspend or terminate accounts that violate these terms.']],
            ['Governing law and contact', ['These terms are governed by the laws of Brazil, without prejudice to the consumer rights of your country of residence. Contact: {contact}.']],
        ]],
        'es' => ['title' => 'Términos de Uso', 'updated' => 'Última actualización: 11 de noviembre de 2026', 'intro' => 'Al crear una cuenta o usar Quosheets (un producto de F91), aceptas estos términos.', 'sections' => [
            ['El servicio', ['Quosheets es un editor en línea de archivos CSV y Excel con análisis de datos, gráficos, edición completa (crear, leer, actualizar y eliminar), exportación y funciones de inteligencia artificial.']],
            ['Cuenta', ['Debes proporcionar datos veraces, confirmar tu correo y mantener tu contraseña en secreto. La cuenta es personal; respondes por la actividad realizada en ella.']],
            ['Prueba gratis', ['Las cuentas nuevas tienen {days} días de acceso completo, sin tarjeta, desde la confirmación del correo, con una cuota reducida de créditos de IA. Después de la prueba, los archivos siguen disponibles para lectura en tu navegador, pero editar, exportar y usar la IA requieren suscripción.']],
            ['Plan y cobro', ['Hay un único plan, Quosheets Pro, por {usd} o {brl} al mes, cobrado de forma recurrente por Stripe hasta su cancelación. Puedes cancelar cuando quieras en Cuenta → Gestionar suscripción; el acceso continúa hasta el final del período ya pagado.', 'Los pagos no se reembolsan de forma proporcional, salvo el derecho de desistimiento y demás derechos previstos en la legislación de protección al consumidor. Los cambios de precio se aplican a nuevas suscripciones o se avisarán con antelación.']],
            ['Créditos de IA', ['El plan incluye {credits} créditos de IA al mes. Los créditos se descuentan según el uso real de cada función, se renuevan cada mes y no se acumulan. Las respuestas de la IA pueden contener errores: revisa los resultados antes de usarlos en decisiones importantes.']],
            ['Tus datos', ['Sigues siendo dueño de tus archivos y del contenido que creas. Los archivos se guardan en tu navegador; eres responsable de mantener copias (exportaciones) y de estar autorizado a tratar los datos que cargas, incluidos datos personales de terceros.']],
            ['Uso aceptable', ['No está permitido usar el servicio con fines ilegales, vulnerar derechos de terceros, intentar acceder sin autorización a cuentas o sistemas, eludir límites del plan, revender el acceso ni sobrecargar la infraestructura de forma automatizada.']],
            ['Disponibilidad y cambios', ['Trabajamos para mantener el servicio disponible y en evolución, pero puede tener mantenimientos, cambios o interrupciones. Las funciones pueden añadirse, modificarse o retirarse.']],
            ['Limitación de responsabilidad', ['En la medida permitida por la ley, el servicio se ofrece “tal cual” y F91 no responde por pérdidas indirectas, lucro cesante ni pérdida de datos guardados localmente en tu navegador. La responsabilidad total se limita al importe que pagaste en los 12 meses anteriores al hecho.']],
            ['Terminación', ['Puedes eliminar tu cuenta cuando quieras. Podemos suspender o cerrar cuentas que incumplan estos términos.']],
            ['Ley aplicable y contacto', ['Estos términos se rigen por las leyes de Brasil, sin perjuicio de los derechos del consumidor de tu país de residencia. Contacto: {contact}.']],
        ]],
    ],
];
$page = $docs[$doc][$lang];
// Escapa o texto e depois troca os marcadores ({contact} vira link; os demais sao numeros/moeda).
$render = static fn(string $text): string => strtr(qs_e($text), $vars);

qs_head([
    'title' => $page['title'] . ' · Quosheets',
    'description' => $page['intro'],
    'lang' => $lang,
    'nonce' => $nonce,
    'canonical' => qs_page_url($doc, $lang),
    'css' => ['assets/css/qs-base.css', 'assets/css/qs-site.css'],
]);
?>
<body class="qs-site qs-legal-page">
<?php qs_site_header($lang, qs_current_user($pdo), false); ?>
<main class="qs-legal">
    <div class="qs-container qs-legal-inner">
        <nav class="qs-legal-tabs">
            <a href="<?= qs_e(qs_page_url('privacy', $lang)) ?>"<?= $doc === 'privacy' ? ' aria-current="page"' : '' ?>><?= qs_e($docs['privacy'][$lang]['title']) ?></a>
            <a href="<?= qs_e(qs_page_url('terms', $lang)) ?>"<?= $doc === 'terms' ? ' aria-current="page"' : '' ?>><?= qs_e($docs['terms'][$lang]['title']) ?></a>
        </nav>
        <h1><?= qs_e($page['title']) ?></h1>
        <p class="qs-legal-updated"><?= qs_e($page['updated']) ?></p>
        <p class="qs-lead"><?= $render($page['intro']) ?></p>
        <?php foreach ($page['sections'] as $i => [$heading, $paragraphs]): ?>
            <section>
                <h2><span><?= $i + 1 ?>.</span> <?= qs_e($heading) ?></h2>
                <?php foreach ($paragraphs as $paragraph): ?><p><?= $render($paragraph) ?></p><?php endforeach; ?>
            </section>
        <?php endforeach; ?>
    </div>
</main>
<?php qs_site_footer($lang); ?>
<script src="<?= qs_asset('assets/js/qs-site.js') ?>"></script>
</body>
</html>
