<?php
/** @var array $currentUser */
$pdo = fpv_pdo();
$allPosts = $pdo->query('SELECT id, type, slug, title, is_published, published_at FROM fpv_posts ORDER BY created_at DESC')->fetchAll();
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin de posts | FPV91</title>
<link rel="icon" type="image/png" href="/img/fpv_fav.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/fpv/assets/css/fpv_site.css?v=1">
<style>
    .fpv-admin-wrap{ max-width:920px; margin:0 auto; padding:150px 24px 80px; }
    .fpv-admin-grid{ display:grid; grid-template-columns:1fr 1.4fr; gap:32px; align-items:start; }
    .fpv-admin-card{ background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:24px; }
    .fpv-admin-list{ list-style:none; margin:0; padding:0; display:grid; gap:8px; }
    .fpv-admin-list li{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-radius:var(--radius-sm); background:var(--surface-2); font-size:13px; }
    .fpv-admin-list .status{ font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:999px; }
    .status.published{ background:#e9f7e3; color:#2b7a1f; }
    .status.draft{ background:#fdf3e2; color:#966a15; }
    .fpv-admin-list button{ background:none; border:none; color:#b42318; font-size:12px; cursor:pointer; }
    textarea{ width:100%; min-height:220px; padding:12px 14px; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--surface-2); font-family:ui-monospace,monospace; font-size:13px; resize:vertical; }
    textarea:focus{ outline:none; border-color:var(--lime-dark); background:var(--surface); }
    select{ width:100%; padding:10px 12px; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--surface-2); font-size:14px; }
</style>
</head>
<body class="fpv-site">
<?php require __DIR__ . '/../partials/header.php'; ?>

<div class="fpv-admin-wrap">
    <h1 style="font-size:24px;font-weight:800;margin:0 0 4px;">Admin de conteudo</h1>
    <p style="color:var(--muted);font-size:13.5px;margin:0 0 28px;">Criar e publicar posts de blog e tutoriais.</p>

    <div class="fpv-admin-grid">
        <div class="fpv-admin-card">
            <h3 style="margin-top:0;font-size:14px;">Posts existentes</h3>
            <ul class="fpv-admin-list" id="postsList">
                <?php foreach ($allPosts as $p): ?>
                    <li data-id="<?= (int) $p['id'] ?>">
                        <span><?= htmlspecialchars($p['title']) ?> <span class="status <?= $p['is_published'] ? 'published' : 'draft' ?>"><?= $p['is_published'] ? 'publicado' : 'rascunho' ?></span></span>
                        <button type="button" data-action="delete-post" data-id="<?= (int) $p['id'] ?>">excluir</button>
                    </li>
                <?php endforeach; ?>
                <?php if (!$allPosts): ?><li>Nenhum post ainda.</li><?php endif; ?>
            </ul>
        </div>

        <div class="fpv-admin-card">
            <h3 style="margin-top:0;font-size:14px;">Novo post</h3>
            <div class="fpv-alert fpv-alert-error" id="formError" style="display:none;"></div>
            <div class="fpv-alert fpv-alert-success" id="formSuccess" style="display:none;"></div>

            <form id="postForm">
                <div class="fpv-field">
                    <label>Tipo</label>
                    <select id="type">
                        <option value="blog">Blog</option>
                        <option value="tutorial">Tutorial</option>
                    </select>
                </div>
                <div class="fpv-field">
                    <label for="title">Titulo</label>
                    <input type="text" id="title" required>
                </div>
                <div class="fpv-field">
                    <label for="excerpt">Resumo curto</label>
                    <input type="text" id="excerpt" maxlength="300">
                </div>
                <div class="fpv-field">
                    <label for="cover">Imagem de capa</label>
                    <input type="file" id="cover" accept="image/*">
                </div>
                <div class="fpv-field">
                    <label for="content">Conteudo (Markdown)</label>
                    <textarea id="content" placeholder="## Titulo&#10;&#10;Texto em **markdown**..."></textarea>
                </div>
                <div class="fpv-field">
                    <label><input type="checkbox" id="isPublished"> Publicar imediatamente</label>
                </div>
                <button type="submit" class="fpv-btn fpv-btn-navy fpv-btn-block">Salvar post</button>
            </form>
        </div>
    </div>
</div>

<?php require __DIR__ . '/../partials/footer.php'; ?>

<script>
(() => {
    const form = document.getElementById("postForm");
    const errorBox = document.getElementById("formError");
    const successBox = document.getElementById("formSuccess");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.style.display = "none";
        successBox.style.display = "none";

        const formData = new FormData();
        formData.append("type", document.getElementById("type").value);
        formData.append("title", document.getElementById("title").value.trim());
        formData.append("excerpt", document.getElementById("excerpt").value.trim());
        formData.append("content_markdown", document.getElementById("content").value);
        formData.append("is_published", document.getElementById("isPublished").checked ? "1" : "0");
        const coverFile = document.getElementById("cover").files[0];
        if (coverFile) formData.append("cover", coverFile);

        try {
            const response = await fetch("/php/fpv/api.php?action=saveFpvPost", { method: "POST", body: formData });
            const payload = await response.json();
            if (!payload.success) throw new Error(payload.message || "Erro ao salvar.");
            successBox.textContent = "Post salvo!";
            successBox.style.display = "block";
            form.reset();
            setTimeout(() => window.location.reload(), 700);
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
        }
    });

    document.getElementById("postsList").addEventListener("click", async (event) => {
        const btn = event.target.closest('[data-action="delete-post"]');
        if (!btn) return;
        if (!confirm("Excluir este post?")) return;
        const body = new URLSearchParams({ id: btn.dataset.id });
        await fetch("/php/fpv/api.php?action=deleteFpvPost", { method: "POST", body });
        btn.closest("li").remove();
    });
})();
</script>
</body>
</html>
