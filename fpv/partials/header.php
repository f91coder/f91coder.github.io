<?php
/** @var array|null $currentUser */
/** @var string $page */
$fpvNavLinks = [
    '' => 'Home',
    'blog' => 'Blog',
    'tutoriais' => 'Tutoriais',
    'comunidade' => 'Comunidade',
    'cursos' => 'Cursos',
];
?>
<header class="fpv-nav" id="fpvNav">
    <div class="fpv-nav-inner">
        <a href="/fpv" class="fpv-nav-logo">
            <img src="/img/fpv_logo.png" alt="FPV91">
        </a>

        <ul class="fpv-nav-links">
            <?php foreach ($fpvNavLinks as $slug => $label): ?>
                <li><a href="/fpv<?= $slug !== '' ? '/' . $slug : '' ?>" class="<?= ($page ?? '') === $slug ? 'is-active' : '' ?>"><?= htmlspecialchars($label) ?></a></li>
            <?php endforeach; ?>
        </ul>

        <div class="fpv-nav-actions">
            <?php if (!empty($currentUser)): ?>
                <a href="/fpv/planner" class="fpv-nav-user">
                    <?php if (!empty($currentUser['avatar_path'])): ?>
                        <img src="/<?= htmlspecialchars($currentUser['avatar_path']) ?>" alt="">
                    <?php endif; ?>
                    <?= htmlspecialchars(explode(' ', $currentUser['name'])[0]) ?>
                </a>
            <?php else: ?>
                <a href="/fpv/login" class="fpv-btn fpv-btn-lime">Entrar</a>
            <?php endif; ?>

            <button type="button" class="fpv-mobile-toggle" id="fpvMobileToggle" aria-label="Abrir menu" aria-expanded="false">
                <span></span>
            </button>
        </div>
    </div>
</header>

<div class="fpv-mobile-panel" id="fpvMobilePanel">
    <div class="fpv-mobile-panel-inner">
        <?php foreach ($fpvNavLinks as $slug => $label): ?>
            <a href="/fpv<?= $slug !== '' ? '/' . $slug : '' ?>"><?= htmlspecialchars($label) ?></a>
        <?php endforeach; ?>
        <?php if (!empty($currentUser)): ?>
            <a href="/fpv/planner" class="fpv-btn fpv-btn-lime">Meu planner</a>
        <?php else: ?>
            <a href="/fpv/login" class="fpv-btn fpv-btn-lime">Entrar</a>
        <?php endif; ?>
    </div>
</div>
