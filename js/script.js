
let navBar = document.querySelector('#header')

if (navBar) {
    document.addEventListener("scroll", ()=>{
        let scrollTop = window.scrollY

        if(scrollTop > 0){
            navBar.classList.add('roll')
        } else {
            navBar.classList.remove('roll')
        }

    })
}

// script.js
const footer = document.getElementById('footer');
const contactSection = document.getElementById('contact');

if (footer && !contactSection) {
    footer.style.transform = 'translateY(0)';
}

window.addEventListener('scroll', function() {
    if (!footer || !contactSection) {
        return;
    }

    // Verifica se a seção 'contact' está visível
    const contactTop = contactSection.offsetTop;
    const scrollPosition = window.scrollY + window.innerHeight;

    // Verifica se o scroll chegou ao final da página OU na seção 'contact'
    if (scrollPosition >= contactTop || window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        footer.style.transform = 'translateY(0)';
    } else {
        footer.style.transform = 'translateY(100%)';
    }
});



document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetElement = document.querySelector(this.getAttribute('href'));
            if (!targetElement) {
                return;
            }

            // Polyfill para navegadores mais antigos
            const scrollToElement = (element) => {
                window.scrollTo({
                    top: element.offsetTop,
                    behavior: 'smooth'
                });
            };

            // Verificar se a função scrollIntoView suporta o comportamento 'smooth'
            if ('scrollBehavior' in document.documentElement.style) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            } else {
                scrollToElement(targetElement);
            }
        });
    });
});

  // Seleciona todos os links de navegação
  const menuLinks = document.querySelectorAll('nav ul li a');

  // Seleciona todas as seções que correspondem aos IDs dos links
  const sections = document.querySelectorAll('section[id]');

  // Função para remover a classe 'active' de todos os links
  function removeActiveClass() {
      menuLinks.forEach(link => {
          link.classList.remove('active');
      });
  }

  // Função para adicionar a classe 'active' ao link correspondente à seção atual
  function addActiveClass(currentSection) {
      menuLinks.forEach(link => {
          if (link.getAttribute('href') === `#${currentSection}`) {
              link.classList.add('active');
          }
      });
  }

  // Função para monitorar o scroll e identificar a seção visível
  window.addEventListener('scroll', function() {
      const scrollPosition = window.scrollY;

      // Verifica cada seção para ver se está visível
      sections.forEach(section => {
          const sectionTop = section.offsetTop - 100;  // Ajuste para quando a seção começar a aparecer
          const sectionHeight = section.offsetHeight;

          // Verifica se o scroll está dentro dos limites da seção atual
          if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
              const currentSection = section.getAttribute('id');
              removeActiveClass();  // Remove a classe de todos os links
              addActiveClass(currentSection);  // Adiciona a classe ao link da seção visível
          }
      });

      // Se o scroll estiver no topo (home), remover a classe 'active' de todos os links
      if (scrollPosition === 0) {
          removeActiveClass(); // Remove 'active' de todos os links quando estiver no topo
      }
  });


//   Multilanguage website menu
//   document.addEventListener('DOMContentLoaded', function () {
//     const dropdown = document.querySelector('.dropdownlang');
//     const menu = dropdown.querySelector('.dropdownlang-menu');
  
//     dropdown.addEventListener('mouseenter', () => {
//       menu.style.display = 'block';
//     });
  
//     dropdown.addEventListener('mouseleave', () => {
//       menu.style.display = 'none';
//     });
//   });

// Video hero play
function loadVideo(container) {
    const videoId = '9ICaItcXYMs';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '100%');
    iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0`);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    iframe.setAttribute('allowfullscreen', '');
    container.innerHTML = '';
    container.appendChild(iframe);
}



//   --- Arrow animatino hero section
window.addEventListener("load", function () {
    setTimeout(() => {
        const cta = document.getElementById("scroll-cta");
        if (cta) {
            cta.style.opacity = '1'; // aparece suavemente
            cta.classList.add("start-float", "start-trail"); // ativa animações
        }
    }, 2000);
});

function scrollDown() {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  }
//   --- /Arrow animatino hero section

  const year = new Date().getFullYear();
  const yearPrimary = document.getElementById("anoAtual");
  const yearSecondary = document.getElementById("anoAtualz");

  if (yearPrimary) {
      yearPrimary.textContent = year;
  }

  if (yearSecondary) {
      yearSecondary.textContent = year;
  }
