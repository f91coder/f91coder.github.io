<?php
/** @var array $currentUser */
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Planner | FPV91</title>
    <link rel="icon" type="image/png" href="/<?= fpv_asset_v('img/fpv_fav.png') ?>">

    <script>
        (function () {
            var stored = localStorage.getItem('f91_fpv_theme');
            var theme = stored || ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');
            if (theme === 'dark') document.documentElement.classList.add('dark');
        })();
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <script src="https://cdn.tailwindcss.com"></script>

    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        f91: {
                            navy: 'var(--f91-navy)',
                            navyLight: 'var(--f91-navy-light)',
                            lime: 'var(--f91-lime)',
                            limeDark: 'var(--f91-lime-dark)',
                            bg: 'var(--f91-bg)',
                            card: 'var(--f91-card)',
                            text: 'var(--f91-text)',
                            muted: 'var(--f91-muted)'
                        },
                        gray: {
                            50: 'var(--f91-gray-50)',
                            100: 'var(--f91-gray-100)',
                            200: 'var(--f91-gray-200)',
                            300: 'var(--f91-gray-300)',
                            400: 'var(--f91-gray-400)',
                            600: 'var(--f91-gray-600)'
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    }
                }
            }
        }
    </script>

    <style>
        :root{
            --f91-navy:#171515;
            --f91-navy-light:#2a2626;
            --f91-lime:#ff6829;
            --f91-lime-dark:#cc5321;
            --f91-bg:#f8fafc;
            --f91-card:#ffffff;
            --f91-text:#334155;
            --f91-muted:#94a3b8;
            --f91-gray-50:#f9fafb;
            --f91-gray-100:#f3f4f6;
            --f91-gray-200:#e5e7eb;
            --f91-gray-300:#d1d5db;
            --f91-gray-400:#9ca3af;
            --f91-gray-600:#4b5563;
        }

        html.dark{
            --f91-navy:#171515;
            --f91-navy-light:#332f2e;
            --f91-lime:#ff6829;
            --f91-lime-dark:#ff8e5e;
            --f91-bg:#121110;
            --f91-card:#1e1c1b;
            --f91-text:#f1efec;
            --f91-muted:#a19c96;
            --f91-gray-50:#262323;
            --f91-gray-100:#2a2626;
            --f91-gray-200:#332f2e;
            --f91-gray-300:#4a4442;
            --f91-gray-400:#8a847e;
            --f91-gray-600:#c9c4bf;
        }

        html.dark body{ color-scheme: dark; }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--f91-gray-300); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--f91-gray-400); }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }

        .transition-all-smooth { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .glass-header { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); transition: background-color .25s ease; }
        html.dark .glass-header { background: rgba(18, 17, 16, 0.9); }

        .modal-enter { opacity: 0; pointer-events: none; }
        .modal-enter-active { opacity: 1; pointer-events: auto; transition: opacity 0.3s ease; }
        .modal-scale-enter { transform: scale(0.95); opacity: 0; }
        .modal-scale-enter-active { transform: scale(1); opacity: 1; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

        .calendar-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--f91-gray-200); }
        .calendar-dot.is-filled { background: var(--f91-lime); }

        .theme-toggle-icon{ display:none; }
        html:not(.dark) .theme-toggle-icon.is-dark{ display:block; }
        html.dark .theme-toggle-icon.is-light{ display:block; }

        .brand-logo{ display:none; }
        html:not(.dark) .brand-logo-light{ display:block; }
        html.dark .brand-logo-dark{ display:block; }

        .avatar-fallback{
            width:32px; height:32px; border-radius:999px;
            display:flex; align-items:center; justify-content:center;
            background:linear-gradient(135deg, var(--f91-navy), var(--f91-lime));
            color:#fff; font-size:13px; font-weight:800; flex-shrink:0;
        }

        [draggable="true"]{ cursor: grab; }
        .item-drag-handle{ cursor: grab; touch-action: none; }
        li.is-dragging{ opacity: .4; }
        li.drag-over-top{ box-shadow: inset 0 2px 0 0 var(--f91-lime); }
        li.drag-over-bottom{ box-shadow: inset 0 -2px 0 0 var(--f91-lime); }

        .currency-switch-btn{ color: var(--f91-muted); }
        .currency-switch-btn[aria-pressed="true"]{ background: var(--f91-card); color: var(--f91-navy); box-shadow: 0 1px 2px rgba(23,21,21,.12); }
        html.dark .currency-switch-btn[aria-pressed="true"]{ color: var(--f91-lime); }

        @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body class="bg-f91-bg text-f91-text font-sans antialiased min-h-screen flex flex-col transition-colors duration-300">

    <div class="flex flex-col flex-1">
        <header class="glass-header sticky top-0 z-40 border-b border-gray-200 shadow-sm no-print">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <a href="/fpv" class="flex items-center gap-3">
                    <img src="/<?= fpv_asset_v('img/fpv_logo.png') ?>" alt="FPV91" class="h-8 sm:h-9 w-auto brand-logo brand-logo-light">
                    <img src="/<?= fpv_asset_v('img/fpv_logo_.png') ?>" alt="FPV91" class="h-8 sm:h-9 w-auto brand-logo brand-logo-dark">
                </a>

                <div class="flex items-center gap-4">
                    <div class="relative">
                        <button id="btn-videos-menu" class="text-f91-text hover:text-f91-limeDark transition-colors p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                            <i class="ph-fill ph-youtube-logo text-2xl text-red-600"></i>
                            <span class="hidden sm:block text-sm font-medium">Favoritos</span>
                        </button>

                        <div id="videos-dropdown" class="absolute right-0 mt-2 w-80 bg-white dark:bg-f91-card rounded-xl shadow-xl border border-gray-100 hidden z-50 flex-col">
                            <div class="p-3 border-b border-gray-100 bg-gray-50 rounded-t-xl flex justify-between items-center">
                                <h3 class="text-sm font-semibold text-f91-text">Vídeos Salvos</h3>
                            </div>
                            <div class="p-2 max-h-64 overflow-y-auto" id="videos-list-container"></div>
                            <div class="p-3 border-t border-gray-100">
                                <form id="add-video-form" class="flex gap-2">
                                    <input type="url" id="new-video-url" placeholder="URL do YouTube" required class="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-f91-lime outline-none">
                                    <button type="submit" class="bg-f91-navy text-white px-3 py-1.5 rounded text-xs hover:bg-f91-navyLight transition-colors">Salvar</button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div class="h-6 w-px bg-gray-200"></div>

                    <button id="exportButton" class="text-sm text-f91-text hover:text-f91-limeDark transition-colors flex items-center gap-1 font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                        <i class="ph ph-printer"></i> <span class="hidden sm:inline">Lista</span>
                    </button>

                    <button id="themeToggleButton" title="Alternar tema" class="text-f91-muted hover:text-f91-text transition-colors p-2 rounded-lg hover:bg-gray-100">
                        <i class="ph-fill ph-sun theme-toggle-icon is-light text-lg"></i>
                        <i class="ph-fill ph-moon theme-toggle-icon is-dark text-lg"></i>
                    </button>

                    <a href="/fpv/perfil" class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg hover:bg-gray-100 transition-colors" title="Meu perfil">
                        <?php if (!empty($currentUser['avatar_path'])): ?>
                            <img src="/<?= htmlspecialchars($currentUser['avatar_path']) ?>" alt="" class="w-8 h-8 rounded-full object-cover" onerror="this.outerHTML='<span class=&quot;avatar-fallback&quot;><?= htmlspecialchars(mb_strtoupper(mb_substr($currentUser['name'], 0, 1))) ?></span>';">
                        <?php else: ?>
                            <span class="avatar-fallback"><?= htmlspecialchars(mb_strtoupper(mb_substr($currentUser['name'], 0, 1))) ?></span>
                        <?php endif; ?>
                        <span class="hidden sm:block text-sm font-medium text-f91-text"><?= htmlspecialchars(explode(' ', $currentUser['name'])[0]) ?></span>
                    </a>

                    <button id="logoutButton" title="Sair" class="text-sm text-f91-muted hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-gray-100">
                        <i class="ph ph-sign-out text-lg"></i>
                    </button>
                </div>
            </div>
        </header>

        <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 xl:grid-cols-12 gap-8 no-print">

            <div class="xl:col-span-4 space-y-6">

                <div class="bg-f91-card rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-f91-text flex items-center gap-2">
                            <i class="ph-fill ph-chart-pie-slice text-f91-lime"></i> Resumo Financeiro
                        </h2>
                        <div class="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 text-xs font-bold" role="group" aria-label="Moeda de exibicao">
                            <button type="button" data-currency="BRL" class="currency-switch-btn px-2.5 py-1 rounded-full transition-colors" aria-pressed="true">BRL</button>
                            <button type="button" data-currency="USD" class="currency-switch-btn px-2.5 py-1 rounded-full transition-colors" aria-pressed="false">USD</button>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <p class="text-sm text-f91-muted font-medium mb-1">Custo Total do Setup</p>
                            <h3 class="text-3xl font-bold text-f91-text" id="display-total-cost">R$ 0,00</h3>
                        </div>

                        <div class="pt-2">
                            <div class="flex justify-between text-xs font-medium mb-1">
                                <span class="text-f91-text">Progresso</span>
                                <span id="display-progress-pct" class="text-f91-limeDark font-bold">0%</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div id="progress-bar" class="bg-f91-lime h-3 rounded-full transition-all duration-700 ease-out" style="width: 0%"></div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            <div>
                                <p class="text-xs text-f91-muted font-medium mb-1">Valor Guardado</p>
                                <p class="text-lg font-semibold text-green-600" id="display-saved">R$ 0,00</p>
                            </div>
                            <div>
                                <p class="text-xs text-f91-muted font-medium mb-1">Falta Juntar</p>
                                <p class="text-lg font-semibold text-red-500" id="display-remaining">R$ 0,00</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-f91-card rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-f91-text flex items-center gap-2">
                            <i class="ph-fill ph-currency-circle-dollar text-f91-lime"></i> Cotações
                        </h2>
                        <button type="button" id="refreshRatesButton" title="Atualizar cotações" class="text-f91-muted hover:text-f91-text transition-colors p-1.5 rounded-lg hover:bg-gray-100">
                            <i class="ph ph-arrows-clockwise text-base"></i>
                        </button>
                    </div>
                    <div class="space-y-1" id="currencyRatesList">
                        <div class="flex items-center justify-between py-2">
                            <span class="text-sm text-f91-muted">Carregando cotações...</span>
                        </div>
                    </div>
                    <p class="text-[10px] text-f91-muted mt-3" id="currencyUpdatedAt"></p>
                </div>

                <div class="bg-f91-card rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold text-f91-text flex items-center gap-2">
                            <i class="ph-fill ph-target text-f91-lime"></i> Planejamento
                        </h2>
                    </div>

                    <form id="planning-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-f91-text mb-1">Valor em caixa (R$)</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span class="text-f91-muted sm:text-sm">R$</span>
                                </div>
                                <input type="number" id="input-saved" step="0.01" min="0" class="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm transition-all outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200" placeholder="0.00">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-f91-text mb-1">Data Meta</label>
                            <input type="date" id="input-date" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm transition-all outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 text-f91-text">
                        </div>
                    </form>

                    <div class="mt-6 p-5 bg-f91-navy rounded-xl text-white relative overflow-hidden">
                        <div class="absolute -right-8 -top-8 w-32 h-32 bg-f91-lime rounded-full opacity-10"></div>

                        <div class="relative z-10 flex flex-col gap-3">
                            <div class="flex items-center justify-between border-b border-white/10 pb-2">
                                <span class="text-sm text-gray-300">Tempo restante:</span>
                                <span class="text-sm font-bold text-f91-lime" id="display-time-left">--</span>
                            </div>

                            <div>
                                <span class="text-xs text-gray-400 block mb-1">Meta de economia:</span>
                                <div class="flex items-end justify-between">
                                    <div>
                                        <span class="text-2xl font-bold text-white" id="display-monthly">R$ 0,00</span>
                                        <span class="text-xs text-gray-400">/mês</span>
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
                                <div>
                                    <span class="text-[10px] text-gray-400 uppercase tracking-wider block">Por Semana</span>
                                    <span class="text-sm font-medium text-white" id="display-weekly">R$ 0,00</span>
                                </div>
                                <div>
                                    <span class="text-[10px] text-gray-400 uppercase tracking-wider block">Por Dia</span>
                                    <span class="text-sm font-medium text-white" id="display-daily">R$ 0,00</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-gray-100">
                         <p class="text-xs text-f91-muted font-medium mb-2 text-center">Calendário de Progresso</p>
                         <div class="flex flex-wrap justify-center gap-1" id="calendar-viz"></div>
                    </div>
                </div>

                <div class="bg-f91-card rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-semibold text-f91-text uppercase tracking-wider flex items-center gap-2">
                            <i class="ph ph-tag"></i> Categorias
                        </h3>
                        <button onclick="openModal('category-modal')" class="text-xs text-f91-text hover:text-f91-limeDark font-medium px-2 py-1 bg-gray-100 rounded-md transition-colors">
                            + Nova
                        </button>
                    </div>
                    <div class="flex flex-wrap gap-2" id="categories-legend"></div>
                </div>

                <div class="text-center">
                     <button onclick="resetData()" class="text-xs text-red-400 hover:text-red-600 transition-colors inline-flex items-center gap-1">
                        <i class="ph ph-warning"></i> Apagar todos os dados
                    </button>
                </div>
            </div>

            <div class="xl:col-span-8 bg-f91-card rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-8rem)] xl:h-auto">

                <div class="p-6 border-b border-gray-100 bg-white dark:bg-f91-card rounded-t-2xl z-10">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-f91-text flex items-center gap-2">
                            <i class="ph-fill ph-list-plus text-f91-lime"></i> Adicionar à Lista
                        </h2>
                        <span class="bg-f91-navy text-white text-xs font-bold px-2 py-1 rounded-lg" id="item-count">0 itens</span>
                    </div>

                    <form id="add-item-form" class="space-y-4">
                        <div class="flex flex-col md:flex-row gap-3 items-end">
                            <div class="w-full md:w-auto flex-shrink-0">
                                <label class="cursor-pointer flex flex-col items-center justify-center w-full md:w-14 h-[38px] border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-f91-muted relative overflow-hidden group" title="Adicionar Foto">
                                    <i class="ph ph-camera text-lg group-hover:scale-110 transition-transform" id="image-placeholder-icon"></i>
                                    <input type="file" id="item-image" accept="image/*" class="hidden">
                                    <div id="image-preview" class="absolute inset-0 bg-cover bg-center hidden z-10"></div>
                                </label>
                            </div>

                            <div class="flex-grow w-full">
                                <input type="text" id="item-name" required class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="Nome do Equipamento (Ex: Nazgul5 V3)">
                            </div>

                            <div class="w-full md:w-40">
                                <select id="item-category" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all appearance-none cursor-pointer"></select>
                            </div>
                        </div>

                        <div class="flex flex-col md:flex-row gap-3 items-end">
                            <div class="flex-grow w-full relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="ph ph-link text-gray-400"></i>
                                </div>
                                <input type="url" id="item-url" class="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="Link da loja (opcional)">
                            </div>

                            <div class="w-full md:w-32 relative">
                                 <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                    <span class="text-gray-400 text-sm">R$</span>
                                </div>
                                <input type="number" id="item-price" required step="0.01" min="0" class="block w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="0.00">
                            </div>

                            <button type="submit" class="w-full md:w-auto px-6 py-2 bg-f91-navy hover:bg-f91-navyLight text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-f91-navy h-[38px]">
                                <i class="ph-bold ph-plus"></i> Salvar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="flex-grow overflow-y-auto p-4 sm:p-6 bg-gray-50 rounded-b-2xl">
                    <ul id="items-container" class="space-y-3"></ul>

                    <div id="empty-state" class="hidden flex-col items-center justify-center py-12 text-center h-full">
                        <div class="w-20 h-20 bg-white dark:bg-f91-card shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-4 text-f91-muted">
                            <i class="ph ph-drone text-4xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-f91-text mb-1">Nenhum equipamento adicionado</h3>
                        <p class="text-sm text-f91-muted max-w-sm">Comece a listar seu setup dos sonhos. Não esqueça de adicionar a foto e o link da loja!</p>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- MODALS -->

    <div id="lightbox-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4 no-print">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" onclick="closeModal('lightbox-modal')"></div>
        <div class="relative z-10 max-w-4xl max-h-[90vh] w-full flex flex-col items-center modal-scale-enter" id="lightbox-content">
            <button onclick="closeModal('lightbox-modal')" class="absolute -top-10 right-0 text-white hover:text-f91-lime text-3xl transition-colors">&times;</button>
            <img id="lightbox-img" src="" alt="Ampliada" class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-black/50">
            <p id="lightbox-caption" class="text-white mt-4 text-lg font-medium"></p>
        </div>
    </div>

    <div id="category-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4 no-print">
        <div class="absolute inset-0 bg-f91-navy/40 backdrop-blur-sm cursor-pointer" onclick="closeModal('category-modal')"></div>
        <div class="bg-white dark:bg-f91-card rounded-2xl shadow-xl w-full max-w-md relative z-10 modal-scale-enter overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="text-lg font-semibold text-f91-text">Nova Categoria</h3>
                <button onclick="closeModal('category-modal')" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
            </div>
            <form id="add-category-form" class="p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-f91-text mb-1">Nome da Categoria</label>
                    <input type="text" id="cat-name" required class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200" placeholder="Ex: Câmeras HD">
                </div>
                <div>
                    <label class="block text-sm font-medium text-f91-text mb-1">Cor</label>
                    <select id="cat-color" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 cursor-pointer">
                        <option value="bg-gray-100 text-gray-800">Cinza Escuro</option>
                        <option value="bg-red-100 text-red-800">Vermelho</option>
                        <option value="bg-blue-100 text-blue-800">Azul</option>
                        <option value="bg-green-100 text-green-800">Verde</option>
                        <option value="bg-yellow-100 text-yellow-800">Amarelo</option>
                        <option value="bg-purple-100 text-purple-800">Roxo</option>
                        <option value="bg-pink-100 text-pink-800">Rosa</option>
                        <option value="bg-teal-100 text-teal-800">Teal</option>
                        <option value="bg-orange-100 text-orange-800">Laranja</option>
                        <option value="bg-indigo-100 text-indigo-800">Indigo</option>
                    </select>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeModal('category-modal')" class="px-4 py-2 text-sm text-f91-text hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" class="px-4 py-2 text-sm bg-f91-navy hover:bg-f91-navyLight text-white rounded-lg transition-colors font-medium">Adicionar</button>
                </div>
            </form>
        </div>
    </div>

    <div id="export-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4 no-print">
        <div class="absolute inset-0 bg-f91-navy/40 backdrop-blur-sm cursor-pointer no-print" onclick="closeModal('export-modal')"></div>
        <div class="bg-white dark:bg-f91-card rounded-2xl shadow-xl w-full max-w-lg relative z-10 modal-scale-enter overflow-hidden max-h-[85vh] flex flex-col">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 no-print">
                <h3 class="text-lg font-semibold text-f91-text">Lista de Compras</h3>
                <button onclick="closeModal('export-modal')" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
            </div>
            <div class="overflow-y-auto p-6" id="print-area">
                <h2 class="text-xl font-bold text-f91-text mb-1">FPV91 — Lista de Compras</h2>
                <p class="text-xs text-f91-muted mb-4" id="export-date"></p>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-f91-muted border-b border-gray-200">
                            <th class="py-2 font-medium">Item</th>
                            <th class="py-2 font-medium">Categoria</th>
                            <th class="py-2 font-medium text-right">Preço</th>
                            <th class="py-2 font-medium text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody id="export-table-body"></tbody>
                </table>
                <div class="flex justify-between font-bold text-f91-text border-t-2 border-gray-200 mt-2 pt-3">
                    <span>Total</span><span id="export-total">R$ 0,00</span>
                </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 no-print">
                <button onclick="closeModal('export-modal')" class="px-4 py-2 text-sm text-f91-text hover:bg-gray-100 rounded-lg transition-colors">Fechar</button>
                <button onclick="window.print()" class="px-4 py-2 text-sm bg-f91-navy hover:bg-f91-navyLight text-white rounded-lg transition-colors font-medium flex items-center gap-2">
                    <i class="ph ph-printer"></i> Imprimir
                </button>
            </div>
        </div>
    </div>

    <div id="appToast" class="fixed bottom-6 right-6 z-[70] max-w-sm bg-white dark:bg-f91-card rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3 translate-y-4 opacity-0 pointer-events-none transition-all duration-300 no-print" role="status" aria-live="polite">
        <div class="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
            <i class="ph-bold ph-check"></i>
        </div>
        <p id="appToastMessage" class="text-sm font-medium text-f91-text"></p>
    </div>

    <script src="/js/fpv_planner.js?v=20260802-2"></script>
</body>
</html>
