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
            @page { margin: 1.5cm; }
            body { background: #fff !important; }
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #export-modal, #export-modal * { overflow: visible !important; max-height: none !important; }
            #export-modal { position: static !important; }
            #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                color: #334155;
            }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body class="bg-f91-bg text-f91-text font-sans antialiased min-h-screen flex flex-col transition-colors duration-300">

    <div class="flex flex-col flex-1 no-print">
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

                    <button id="shareButton" type="button" title="Compartilhar minha lista" class="relative text-sm text-f91-text hover:text-f91-limeDark transition-colors flex items-center gap-1 font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                        <i class="ph ph-share-network"></i> <span class="hidden sm:inline">Compartilhar</span>
                        <span id="shareBadge" class="hidden absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-f91-lime text-white text-[10px] font-bold items-center justify-center"></span>
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
                    </div>

                    <div class="flex items-center justify-between mb-5">
                        <span class="text-xs text-f91-muted font-medium">Exibir valores em</span>
                        <div id="currency-switch" class="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 text-xs font-bold" role="group" aria-label="Moeda de exibição"></div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <p class="text-sm text-f91-muted font-medium mb-1">Custo total do setup</p>
                            <h3 class="text-3xl font-bold text-f91-text" id="display-total-cost">R$ 0,00</h3>
                        </div>

                        <div class="pt-1">
                            <div class="flex justify-between text-xs font-medium mb-1.5">
                                <span class="text-f91-text">Progresso da compra</span>
                                <span id="display-progress-pct" class="text-f91-limeDark font-bold">0%</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="progress-track">
                                <div id="progress-bar" class="bg-f91-lime h-3 transition-all duration-700 ease-out" style="width: 0%"></div>
                                <div id="progress-bar-covered" class="bg-f91-lime opacity-40 h-3 transition-all duration-700 ease-out" style="width: 0%"></div>
                            </div>
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-f91-muted">
                                <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-f91-lime"></span> Comprado <strong id="legend-purchased-pct" class="text-f91-text">0%</strong></span>
                                <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-f91-lime opacity-40"></span> Coberto pela carteira <strong id="legend-covered-pct" class="text-f91-text">0%</strong></span>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            <div>
                                <p class="text-xs text-f91-muted font-medium mb-1">Já comprado</p>
                                <p class="text-lg font-semibold text-green-600" id="display-purchased">R$ 0,00</p>
                            </div>
                            <div>
                                <p class="text-xs text-f91-muted font-medium mb-1">Falta comprar</p>
                                <p class="text-lg font-semibold text-f91-text" id="display-to-buy">R$ 0,00</p>
                            </div>
                            <div>
                                <p class="text-xs text-f91-muted font-medium mb-1">Na carteira</p>
                                <p class="text-lg font-semibold text-f91-text" id="display-saved">R$ 0,00</p>
                            </div>
                            <div>
                                <p class="text-xs text-f91-muted font-medium mb-1">Falta juntar</p>
                                <p class="text-lg font-semibold text-red-500" id="display-remaining">R$ 0,00</p>
                            </div>
                        </div>

                        <p class="text-xs text-f91-muted leading-relaxed min-h-[16px]" id="summary-note"></p>
                    </div>
                </div>

                <div class="bg-f91-card rounded-2xl p-6 shadow-sm border border-gray-100" id="wallet-card">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-f91-text flex items-center gap-2">
                            <i class="ph-fill ph-wallet text-f91-lime"></i> Carteira
                        </h2>
                    </div>

                    <p class="text-sm text-f91-muted font-medium mb-1">Saldo disponível</p>
                    <h3 class="text-3xl font-bold text-green-600" id="display-wallet-balance">R$ 0,00</h3>
                    <p class="text-xs text-f91-muted mt-1 min-h-[16px]" id="wallet-balance-hint"></p>

                    <div class="grid grid-cols-2 gap-2 mt-4">
                        <button type="button" id="wallet-add-button" class="px-3 py-2 bg-f91-navy hover:bg-f91-navyLight text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5">
                            <i class="ph-bold ph-plus"></i> Adicionar
                        </button>
                        <button type="button" id="wallet-withdraw-button" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-f91-text text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5">
                            <i class="ph-bold ph-minus"></i> Retirar
                        </button>
                    </div>

                    <div class="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div class="bg-gray-50 rounded-xl py-2 px-1">
                            <p class="text-[10px] uppercase tracking-wider text-f91-muted">Entradas</p>
                            <p class="text-xs font-bold text-f91-text mt-0.5" id="wallet-stat-in">R$ 0,00</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl py-2 px-1">
                            <p class="text-[10px] uppercase tracking-wider text-f91-muted">Compras</p>
                            <p class="text-xs font-bold text-f91-text mt-0.5" id="wallet-stat-purchases">R$ 0,00</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl py-2 px-1">
                            <p class="text-[10px] uppercase tracking-wider text-f91-muted">Retiradas</p>
                            <p class="text-xs font-bold text-f91-text mt-0.5" id="wallet-stat-out">R$ 0,00</p>
                        </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-gray-100">
                        <p class="text-xs font-semibold uppercase tracking-wider text-f91-muted mb-2 flex items-center gap-1.5"><i class="ph ph-list-bullets"></i> Extrato</p>
                        <ul id="wallet-statement" class="space-y-1 max-h-64 overflow-y-auto pr-1"></ul>
                    </div>
                </div>

                <div class="bg-f91-card rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold text-f91-text flex items-center gap-2">
                            <i class="ph-fill ph-target text-f91-lime"></i> Planejamento
                        </h2>
                    </div>

                    <form id="planning-form" class="space-y-4" onsubmit="return false;">
                        <div>
                            <label class="block text-sm font-medium text-f91-text mb-1">Data meta</label>
                            <input type="date" id="input-date" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm transition-all outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 text-f91-text">
                            <p class="text-[11px] text-f91-muted mt-1.5">O cálculo considera o que falta comprar menos o saldo da carteira.</p>
                        </div>
                    </form>

                    <div class="mt-5 p-5 bg-f91-navy rounded-xl text-white relative overflow-hidden">
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

                    <form id="add-item-form" class="space-y-3" autocomplete="off">
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i class="ph ph-link text-gray-400"></i>
                            </div>
                            <input type="text" inputmode="url" id="item-url" class="block w-full pl-9 pr-24 sm:pr-32 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="Cole o link do produto (AliExpress, Amazon, Shopee, Mercado Livre…)">
                            <button type="button" id="import-link-button" title="Buscar nome, foto e preço a partir do link" class="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-f91-navy hover:bg-f91-navyLight text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                                <i class="ph-bold ph-magic-wand" id="import-link-icon"></i> <span class="hidden sm:inline" id="import-link-label">Preencher</span>
                            </button>
                        </div>

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

                        <div class="flex flex-col md:flex-row gap-3 md:items-center">
                            <div class="flex w-full md:w-56 flex-shrink-0">
                                <select id="item-price-currency" aria-label="Moeda do preço" class="px-2 py-2 border border-r-0 border-gray-200 rounded-l-xl bg-gray-100 text-xs font-bold text-f91-text outline-none focus:ring-f91-lime cursor-pointer"></select>
                                <input type="number" id="item-price" required step="0.01" min="0" class="block w-full min-w-0 px-3 py-2 border border-gray-200 rounded-r-xl focus:ring-f91-lime focus:border-f91-lime sm:text-sm outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="0.00">
                            </div>

                            <p id="item-form-hint" class="flex-grow text-xs text-f91-muted leading-snug min-h-[16px]" aria-live="polite"></p>

                            <button type="submit" class="w-full md:w-auto px-6 py-2 bg-f91-navy hover:bg-f91-navyLight text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-f91-navy h-[38px]">
                                <i class="ph-bold ph-plus"></i> Salvar
                            </button>
                        </div>

                        <button type="button" id="open-clip-modal" class="text-[11px] text-f91-muted hover:text-f91-text underline underline-offset-2 decoration-dotted transition-colors flex items-center gap-1">
                            <i class="ph ph-cursor-click"></i> A loja bloqueou a leitura ou não trouxe o preço? Use o botão mágico do FPV91
                        </button>
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

    <div id="export-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4">
        <div class="absolute inset-0 bg-f91-navy/40 backdrop-blur-sm cursor-pointer no-print" onclick="closeModal('export-modal')"></div>
        <div class="bg-white dark:bg-f91-card rounded-2xl shadow-xl w-full max-w-xl relative z-10 modal-scale-enter overflow-hidden max-h-[85vh] flex flex-col">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 no-print">
                <h3 class="text-lg font-semibold text-f91-text">Lista de Compras</h3>
                <button onclick="closeModal('export-modal')" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
            </div>
            <div class="overflow-y-auto p-6 sm:p-8 flex-1 min-h-0 bg-white" id="print-area">
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                        <img src="/<?= fpv_asset_v('img/fpv_logo.png') ?>" alt="FPV91" class="h-6 w-auto">
                        <h2 class="text-lg font-bold text-slate-800">Lista de Compras</h2>
                    </div>
                    <span class="text-xs font-semibold text-slate-400" id="export-item-count"></span>
                </div>
                <p class="text-xs text-slate-400 mb-5" id="export-date"></p>

                <div id="export-table-body" class="divide-y divide-slate-100"></div>

                <div class="flex justify-between items-center font-bold text-slate-800 border-t-2 border-slate-200 mt-2 pt-4">
                    <span>Total</span><span id="export-total" class="text-lg">R$ 0,00</span>
                </div>
                <div id="export-summary" class="mt-2 space-y-1 text-xs text-slate-500"></div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 no-print">
                <button onclick="closeModal('export-modal')" class="px-4 py-2 text-sm text-f91-text hover:bg-gray-100 rounded-lg transition-colors">Fechar</button>
                <button type="button" id="exportShareButton" class="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-f91-text rounded-lg transition-colors font-medium flex items-center gap-2">
                    <i class="ph ph-share-network"></i> Compartilhar link
                </button>
                <button onclick="printShoppingList()" id="printShoppingListButton" class="px-4 py-2 text-sm bg-f91-navy hover:bg-f91-navyLight text-white rounded-lg transition-colors font-medium flex items-center gap-2">
                    <i class="ph ph-printer"></i> Imprimir
                </button>
            </div>
        </div>
    </div>

    <div id="edit-item-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4 no-print">
        <div class="absolute inset-0 bg-f91-navy/40 backdrop-blur-sm cursor-pointer" onclick="closeModal('edit-item-modal')"></div>
        <div class="bg-white dark:bg-f91-card rounded-2xl shadow-xl w-full max-w-md relative z-10 modal-scale-enter overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="text-lg font-semibold text-f91-text">Editar Item</h3>
                <button onclick="closeModal('edit-item-modal')" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
            </div>
            <form id="edit-item-form" class="p-6 space-y-4">
                <input type="hidden" id="edit-item-uuid">
                <div class="flex gap-3 items-end">
                    <div class="flex-shrink-0">
                        <label class="cursor-pointer flex flex-col items-center justify-center w-16 h-16 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-f91-muted relative overflow-hidden group" title="Trocar foto">
                            <i class="ph ph-camera text-lg group-hover:scale-110 transition-transform" id="edit-image-placeholder-icon"></i>
                            <input type="file" id="edit-item-image" accept="image/*" class="hidden">
                            <div id="edit-image-preview" class="absolute inset-0 bg-cover bg-center hidden z-10"></div>
                        </label>
                    </div>
                    <div class="flex-grow">
                        <label class="block text-sm font-medium text-f91-text mb-1">Nome</label>
                        <input type="text" id="edit-item-name" required class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-f91-text mb-1">Categoria</label>
                    <select id="edit-item-category" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 cursor-pointer"></select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-f91-text mb-1">Link da loja</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i class="ph ph-link text-gray-400"></i>
                        </div>
                        <input type="text" inputmode="url" id="edit-item-url" class="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="https://...">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-f91-text mb-1">Preço</label>
                    <div class="flex">
                        <select id="edit-item-price-currency" aria-label="Moeda do preço" class="px-2 py-2 border border-r-0 border-gray-200 rounded-l-xl bg-gray-100 text-xs font-bold text-f91-text outline-none focus:ring-f91-lime cursor-pointer"></select>
                        <input type="number" id="edit-item-price" required step="0.01" min="0" class="block w-full min-w-0 px-3 py-2 border border-gray-200 rounded-r-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all">
                    </div>
                    <div class="flex items-start justify-between gap-3 mt-1.5">
                        <p id="edit-item-hint" class="text-[11px] text-f91-muted leading-snug min-h-[14px]"></p>
                        <button type="button" id="edit-refresh-price" class="text-[11px] font-semibold text-f91-text hover:text-f91-limeDark whitespace-nowrap flex items-center gap-1 transition-colors"><i class="ph ph-arrows-clockwise" id="edit-refresh-icon"></i> Atualizar pelo link</button>
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeModal('edit-item-modal')" class="px-4 py-2 text-sm text-f91-text hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" class="px-4 py-2 text-sm bg-f91-navy hover:bg-f91-navyLight text-white rounded-lg transition-colors font-medium">Salvar</button>
                </div>
            </form>
        </div>
    </div>

    <div id="wallet-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4 no-print">
        <div class="absolute inset-0 bg-f91-navy/40 backdrop-blur-sm cursor-pointer" onclick="closeModal('wallet-modal')"></div>
        <div class="bg-white dark:bg-f91-card rounded-2xl shadow-xl w-full max-w-md relative z-10 modal-scale-enter overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="text-lg font-semibold text-f91-text flex items-center gap-2"><i class="ph-fill ph-wallet text-f91-lime"></i> <span id="wallet-modal-title">Adicionar dinheiro</span></h3>
                <button onclick="closeModal('wallet-modal')" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
            </div>
            <form id="wallet-form" class="p-6 space-y-4" autocomplete="off">
                <input type="hidden" id="wallet-type" value="deposit">
                <div>
                    <label class="block text-sm font-medium text-f91-text mb-1">Valor</label>
                    <div class="flex">
                        <select id="wallet-currency" aria-label="Moeda" class="px-2 py-2 border border-r-0 border-gray-200 rounded-l-xl bg-gray-100 text-xs font-bold text-f91-text outline-none focus:ring-f91-lime cursor-pointer"></select>
                        <input type="number" id="wallet-amount" required step="0.01" min="0.01" class="block w-full min-w-0 px-3 py-2 border border-gray-200 rounded-r-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="0.00">
                    </div>
                    <p id="wallet-convert-hint" class="text-[11px] text-f91-muted mt-1.5 min-h-[14px]"></p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-f91-text mb-1">Descrição <span class="text-f91-muted font-normal">(opcional)</span></label>
                    <input type="text" id="wallet-note" maxlength="100" class="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-f91-lime outline-none bg-gray-50 focus:bg-white dark:focus:bg-f91-gray-200 transition-all" placeholder="Ex: salário, venda de uma peça usada…">
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeModal('wallet-modal')" class="px-4 py-2 text-sm text-f91-text hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" id="wallet-submit" class="px-4 py-2 text-sm bg-f91-navy hover:bg-f91-navyLight text-white rounded-lg transition-colors font-medium">Adicionar</button>
                </div>
            </form>
        </div>
    </div>

    <div id="clip-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4 no-print">
        <div class="absolute inset-0 bg-f91-navy/40 backdrop-blur-sm cursor-pointer" onclick="closeModal('clip-modal')"></div>
        <div class="bg-white dark:bg-f91-card rounded-2xl shadow-xl w-full max-w-lg relative z-10 modal-scale-enter overflow-hidden max-h-[88vh] flex flex-col">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="text-lg font-semibold text-f91-text flex items-center gap-2"><i class="ph-fill ph-magic-wand text-f91-lime"></i> Botão mágico do FPV91</h3>
                <button onclick="closeModal('clip-modal')" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
            </div>
            <div class="p-6 space-y-5 overflow-y-auto text-sm text-f91-text">
                <p class="leading-relaxed">Shopee, Mercado Livre e AliExpress escondem o <strong>preço</strong> de leitores automáticos. O botão mágico resolve: ele lê a página que <strong>você mesmo está vendo</strong> no navegador e traz nome, foto e preço para o seu planner.</p>

                <ol class="space-y-4">
                    <li class="flex gap-3">
                        <span class="w-6 h-6 rounded-full bg-f91-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                        <div>
                            <p class="font-medium mb-2">Arraste este botão para a sua barra de favoritos</p>
                            <a id="clip-bookmarklet" href="#" draggable="true" class="inline-flex items-center gap-2 px-4 py-2 bg-f91-navy text-white text-sm font-semibold rounded-xl shadow-sm cursor-grab select-none" onclick="return false;">
                                <i class="ph-bold ph-plus-circle"></i> Adicionar ao FPV91
                            </a>
                            <p class="text-[11px] text-f91-muted mt-2">Não vê a barra de favoritos? No Chrome/Edge use <kbd class="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Ctrl</kbd>+<kbd class="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Shift</kbd>+<kbd class="px-1 py-0.5 bg-gray-100 rounded text-[10px]">B</kbd>.</p>
                        </div>
                    </li>
                    <li class="flex gap-3">
                        <span class="w-6 h-6 rounded-full bg-f91-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                        <p class="font-medium">Abra a página do produto na loja que você quiser.</p>
                    </li>
                    <li class="flex gap-3">
                        <span class="w-6 h-6 rounded-full bg-f91-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                        <p class="font-medium">Clique em <em>Adicionar ao FPV91</em> nos favoritos. O planner abre com tudo preenchido — é só conferir a categoria e salvar.</p>
                    </li>
                </ol>

                <div class="bg-gray-50 rounded-xl p-4 text-xs text-f91-muted leading-relaxed">
                    <p class="font-semibold text-f91-text mb-1 flex items-center gap-1.5"><i class="ph ph-device-mobile"></i> No celular?</p>
                    <p>Crie um favorito qualquer no navegador, edite-o e cole este código no lugar do endereço:</p>
                    <button type="button" id="clip-copy-button" class="mt-2 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-f91-text font-semibold flex items-center gap-1.5 transition-colors">
                        <i class="ph ph-copy"></i> <span>Copiar código do botão</span>
                    </button>
                </div>

                <p class="text-[11px] text-f91-muted leading-relaxed">O botão só lê o que já está aberto na sua tela (título, foto e o preço em destaque) e envia para a sua conta FPV91. Ele não coleta senhas nem dados de pagamento.</p>
            </div>
        </div>
    </div>

    <div id="share-modal" class="fixed inset-0 z-50 flex items-center justify-center modal-enter p-4 no-print">
        <div class="absolute inset-0 bg-f91-navy/40 backdrop-blur-sm cursor-pointer" onclick="closeModal('share-modal')"></div>
        <div class="bg-white dark:bg-f91-card rounded-2xl shadow-xl w-full max-w-2xl relative z-10 modal-scale-enter overflow-hidden max-h-[90vh] flex flex-col">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="text-lg font-semibold text-f91-text flex items-center gap-2"><i class="ph-fill ph-share-network text-f91-lime"></i> Compartilhar minha lista</h3>
                <button onclick="closeModal('share-modal')" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
            </div>
            <div class="overflow-y-auto flex-1 min-h-0" id="share-modal-body">
                <p class="p-8 text-center text-sm text-f91-muted">Carregando…</p>
            </div>
        </div>
    </div>

    <div id="appToast" class="fixed bottom-6 right-6 z-[70] max-w-sm bg-white dark:bg-f91-card rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3 translate-y-4 opacity-0 pointer-events-none transition-all duration-300 no-print" role="status" aria-live="polite">
        <div class="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
            <i class="ph-bold ph-check"></i>
        </div>
        <p id="appToastMessage" class="text-sm font-medium text-f91-text"></p>
    </div>

    <script src="/<?= fpv_asset_v('js/fpv_money.js') ?>"></script>
    <script src="/<?= fpv_asset_v('js/fpv_clip.js') ?>"></script>
    <script src="/<?= fpv_asset_v('js/fpv_planner.js') ?>"></script>
    <script src="/<?= fpv_asset_v('js/fpv_share.js') ?>"></script>
</body>
</html>
