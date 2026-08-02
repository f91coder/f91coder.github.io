<?php
/** @var array $post */
$fpvPostTypeLabel = $post['type'] === 'tutorial' ? 'Tutorial' : 'Blog';
$fpvPostUrl = '/fpv/' . ($post['type'] === 'tutorial' ? 'tutoriais' : 'blog') . '/' . $post['slug'];
?>
<a href="<?= htmlspecialchars($fpvPostUrl) ?>" class="fpv-post-card" data-reveal-item>
    <div class="fpv-post-card-cover"<?= $post['cover_image_path'] ? ' style="background-image:url(\'/' . htmlspecialchars($post['cover_image_path']) . '\')"' : '' ?>>
        <?php if (!$post['cover_image_path']): ?>📷<?php endif; ?>
    </div>
    <div class="fpv-post-card-body">
        <span class="fpv-post-type"><?= htmlspecialchars($fpvPostTypeLabel) ?></span>
        <h3><?= htmlspecialchars($post['title']) ?></h3>
        <p><?= htmlspecialchars($post['excerpt']) ?></p>
    </div>
</a>
