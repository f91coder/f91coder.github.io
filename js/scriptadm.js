const body = document.querySelector('body'),
    sidebar = body.querySelector('nav'),
    toggle = body.querySelector(".toggle"),
    searchBtn = body.querySelector(".search-box"),
    modeSwitch = body.querySelector(".toggle-switch"),
    modeText = body.querySelector(".mode-text"),
    logo = body.querySelector('.image img'),
    logoAvi = document.getElementById('logoavi');

// Verificar e aplicar o tema salvo
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
    body.classList.add(savedTheme);
    if (savedTheme === "dark") {
        modeText.innerText = "Light mode";
        logo.src = "img/ologo_.png";
        logoAvi.src = "img/aviat_.png";
    } else {
        modeText.innerText = "Dark mode";
        logo.src = "img/ologo.png";
        logoAvi.src = "img/aviat.png";
    }
}

// Verificar e aplicar o estado do sidebar salvo
const savedSidebarState = localStorage.getItem("sidebar");
if (savedSidebarState === "close") {
    sidebar.classList.add("close");
} else {
    sidebar.classList.remove("close");
}

// Função para desativar animações temporariamente
function disableAnimations() {
    body.style.transition = 'none';
    sidebar.style.transition = 'none';
    logoAvi.style.transition = 'none';
    logo.style.transition = 'none';
}

// Função para reativar animações após um tempo
function enableAnimations() {
    setTimeout(() => {
        body.style.transition = '';
        sidebar.style.transition = '';
        logoAvi.style.transition = '';
        logo.style.transition = '';
    }, 300); // Intervalo suficiente para evitar animações na carga da página
}

// Desativar as animações ao carregar a página
disableAnimations();
window.addEventListener('load', enableAnimations);

toggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");
    localStorage.setItem("sidebar", sidebar.classList.contains("close") ? "close" : "open");
});

searchBtn.addEventListener("click", () => {
    sidebar.classList.remove("close");
    localStorage.setItem("sidebar", "open");
});

modeSwitch.addEventListener("click", () => {
    body.classList.toggle("dark");

    if (body.classList.contains("dark")) {
        modeText.innerText = "Light mode";
        logo.src = "img/ologo_.png";
        logoAvi.src = "img/aviat_.png";
        localStorage.setItem("theme", "dark");
    } else {
        modeText.innerText = "Dark mode";
        logo.src = "img/ologo.png";
        logoAvi.src = "img/aviat.png";
        localStorage.setItem("theme", "light");
    }
});

document.getElementById("anoAtual").textContent = new Date().getFullYear();