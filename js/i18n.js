(function () {
  'use strict';

  const DEFAULT_LANG = 'pt';
  const SUPPORTED_LANGS = ['pt', 'en', 'es'];
  const LANGUAGE_LABELS = {
    pt: 'PT',
    en: 'EN',
    es: 'ES',
  };
  const LANGUAGE_NAMES = {
    pt: 'Português',
    en: 'English',
    es: 'Español',
  };

  const translations = {
    pt: {
      'global.nav.home': 'Início',
      'global.nav.about': 'Quem sou eu',
      'global.nav.what': 'O que faço',
      'global.nav.how': 'Como faço',
      'global.nav.blog': 'Blog',

      'global.nav.contact': 'Fala comigo!',
      'global.nav.contact_short': 'Fala comigo!',
      'global.nav.client_area': '<i class="bi bi-person-circle"></i> Área do cliente',
      'global.cta.free_trial': 'Teste GRÁTIS!',
      'global.cta.free_trial_long': 'QUERO UM TESTE GRÁTIS!',
      'global.cta.learn_more': 'Saiba mais',
      'global.form.contact_name': 'Seu Nome',
      'global.form.contact_email': 'Seu Email',
      'global.form.contact_phone': 'Seu Telefone/WhatsApp',
      'global.form.contact_company': 'Nome da Empresa',
      'global.form.submit': '<i class="bi bi-arrow-return-right"></i> Enviar',
      'global.form.next': 'Próximo ➟',
      'global.form.prev': '🠔 Anterior',
      'global.form.send': 'Enviar',
      'global.form.select': 'Selecione',
      'global.form.only_numbers': 'Digite apenas números',
      'global.gender.male': 'Masculino',
      'global.gender.female': 'Feminino',
      'global.gender.other': 'Outro',
      'global.footer.terms': 'Termos e Condições',
      'global.footer.policy': 'Política de Privacidade',
      'global.footer.partner': 'Seja um Parceiro',
      'global.form.response.success': 'Formulário enviado com sucesso!',
      'global.form.response.error': 'Erro ao enviar o formulário. Tente novamente.',
      'global.form.response.parse_error': 'Erro inesperado ao interpretar a resposta do servidor.',
      'global.form.response.connection': 'Erro de conexão com o servidor.',
      'index.meta.description': 'F91 - Soluções Operacionais: soluções sob medida para PMEs aumentarem eficiência, produtividade e reduzirem custos.',
      'index.title': 'F91 - Soluções Operacionais | Seu Negócio + Eficiente e Produtivo!',
      'index.hero.title': 'seu negócio mais<br> <strong>Eficiente</strong> e <strong>Produtivo!</strong>',
      'index.hero.subtitle': 'Conheça nossas soluções operacionais <strong>sob medida</strong> para seu negócio alcançar o <strong id="maxpot">MÁXIMO POTENCIAL!</strong>',
      'index.hero.video_title': 'Vídeo institucional da F91',
      'index.hero.video_thumb_alt': 'Vídeo thumbnail',
      'index.hero.cta': 'QUERO UM TESTE GRÁTIS! <i class="bi bi-arrow-right"></i>',
      'index.about.title': 'Quem <span>sou eu?</span>',
      'index.about.text': 'Promovo <strong>inovação operacional</strong> por meio de <strong>serviços de apoio administrativo</strong> focado em atender PMEs que visam melhorar suas entregas e executar tarefas de forma mais otimizada, explorando a máxima <strong>eficiência</strong> e <strong>produtividade</strong>. Para isso, utilizo meu <i>know-how</i> e experiência para desenvolver <strong>soluções <i>low-cost</i></strong> para o cliente obter sua melhor performance e competitividade.',
      'index.about.mission': '<i class="fas fa-bullseye"></i> <strong>Missão:</strong> Oferecer a melhor solução estratégica operacional para empresas de pequeno e médio porte.',
      'index.about.vision': '<i class="fas fa-search-plus"></i> <strong>Visão:</strong> Acreditamos que é possível executar trabalhos e entregas de forma bem pensada, colaborativa e sustentável, explorando o máximo potencial que os recursos tecnológicos da atualidade podem oferecer.',
      'index.about.values': '<i class="fas fa-medal"></i> <strong>Valores:</strong> Ética, transparência e excelência são indispensáveis, assim como a consciência de toda responsabilidade socioambiental.',
      'index.team.title': 'Sobre <span>mim</span>',
      'index.team.intro': 'Olá, eu sou o Filipe, muito prazer! Meu objetivo aqui é <strong>promover inovação operacional</strong> por meio de <strong>serviços de apoio administrativo</strong> focado em atender PMEs que visam melhorar suas entregas e executar tarefas de forma mais otimizada, explorando a <strong>máxima eficiência</strong> e <strong>produtividade</strong>. Para isso, busco utilizar meu know-how e experiência, sempre fechando parcerias estratégicas para desenvolver a melhor solução low-cost para o cliente obter sua melhor performance e competitividade.',
      'index.team.member1.alt': 'Foto de Filipe Oliveira',
      'index.team.member1.role': 'Gestão de Operações',
      'index.actions.ventures': 'Empreendimentos',
      'index.actions.portfolio': 'Portf\u00f3lio',
      'index.actions.recommendations': 'Recomenda\u00e7\u00f5es',
      'index.actions.community': 'Comunidade',
      'index.modal.close': 'Fechar',
      'index.modal.ventures.title': 'Empreendimentos',
      'index.modal.ventures.desc': 'Aqui est\u00e3o as startups em que estou envolvido atualmente.',
      'index.modal.ventures.item1.desc': 'SellaStay: startup no setor hoteleiro, um SaaS de gest\u00e3o de negocia\u00e7\u00e3o de grupos e eventos.',
      'index.modal.ventures.item2.role': 'Growth partner',
      'index.modal.ventures.item2.desc': 'Sync Softwares: apoio em crescimento e estrat\u00e9gia de expans\u00e3o.',
      'index.modal.portfolio.title': 'Portf\u00f3lio',
      'index.modal.portfolio.desc': 'Clique em um servi\u00e7o para abrir o case em uma nova aba.',
      'index.modal.portfolio.item1': 'Servi\u00e7o 1',
      'index.modal.portfolio.item2': 'Servi\u00e7o 2',
      'index.modal.portfolio.item3': 'Servi\u00e7o 3',
      'index.modal.portfolio.item4': 'Servi\u00e7o 4',
      'index.modal.portfolio.item5': 'Servi\u00e7o 5',
      'index.modal.recommendations.title': 'Recomenda\u00e7\u00f5es',
      'index.modal.recommendations.desc': 'Alguns testemunhos de pessoas que j\u00e1 trabalharam comigo.',
      'index.modal.recommendations.prev': 'Anterior',
      'index.modal.recommendations.next': 'Pr\u00f3ximo',
      'index.modal.recommendations.avatar': 'Foto de perfil',
      'index.modal.recommendations.item1.text': 'Filipe entregou resultados acima do esperado e sempre com muita clareza.',
      'index.modal.recommendations.item1.name': 'Marina Costa',
      'index.modal.recommendations.item1.role': 'COO, Empresa X',
      'index.modal.recommendations.item2.text': 'Excelente parceiro estrat\u00e9gico, organizado e comprometido com qualidade.',
      'index.modal.recommendations.item2.name': 'Lucas Pereira',
      'index.modal.recommendations.item2.role': 'Sócio, Startup Y',
      'index.modal.recommendations.item3.text': 'Vis\u00e3o anal\u00edtica e execu\u00e7\u00e3o r\u00e1pida. Recomendo sem reservas.',
      'index.modal.recommendations.item3.name': 'Ana Rodrigues',
      'index.modal.recommendations.item3.role': 'Gerente de Opera\u00e7\u00f5es',
      'index.modal.community.title': 'Comunidade',
      'index.modal.community.desc': 'Preencha seus dados para receber o convite do grupo no Telegram.',
      'index.modal.community.form.name': 'Seu nome',
      'index.modal.community.form.email': 'Seu e-mail',
      'index.modal.community.form.phone': 'Seu telefone',
      'index.modal.community.form.submit': 'Quero participar',
      'index.modal.community.note': 'Enviarei o convite assim que sua solicita\u00e7\u00e3o for recebida.',

      'index.what.title': 'O que<span> faço?</span>',
      'index.what.subtitle': 'Te ajudamos a encontrar a <span>melhor solução custo-benefício</span> para o seu negócio atingir o <strong>máximo potencial</strong>, podendo <strong>economizar até 40% do custo operacional!</strong> Na prática, funciona assim:',
      'index.what.step1.title': '<strong style="font-size: 18px;">1. </strong> Diagnóstico',
      'index.what.step1.desc': 'Realizamos um diagnóstico completo do seu negócio em até <strong>5 dias</strong> e te entregamos um <strong>Relatório Geral</strong> com todas as soluções sugeridas para implementação.',
      'index.what.step2.title': '<strong style="font-size: 18px;">2. </strong> Solução',
      'index.what.step2.desc': 'Desenvolvemos a melhor solução <strong>sob medida</strong> de acordo com a sua necessidade e objetivo, utilizando uma metodologia inteligente e colaborativa de criação.',
      'index.what.step3.title': '<strong style="font-size: 18px;">3. </strong> Implementação',
      'index.what.step3.desc': '<strong>Definimos juntos</strong> os detalhes do serviço e implementamos a solução desevolvida, oferecendo <strong>garantia e suporte</strong> durante 1 ano por um valor que cabe no seu bolso.',
      'index.what.solutions_title': 'Confira baixo <span>as principais soluções</span> que geralmente desenvolvemos:',
      'index.what.service1.title': '<span>Gestão de </span>Dados <span>e</span> CRM',
      'index.what.service1.desc': 'Gerencie seus dados com facilidade. Entre os principais serviços estão a inserção de dados, implementação de sistema, atualização e organização de dados, contagem e controle de estoque, banco de dados e aprimoramento de planilhas <strong>Excel</strong> e <strong>Google Sheets</strong>.',
      'index.what.service2.title': 'Automatização<span> de Processos</span>',
      'index.what.service2.desc': 'Automatizamos processos administrativos e tarefas repetitivas para aumentar a eficiência e reduzir erros. Inclui faturamento, gestão de dados, gestão financeira, relatórios automatizados e etc.',
      'index.what.service3.title': 'Suporte<span> ao Cliente</span>',
      'index.what.service3.desc': 'Implementamos chatbots e sistemas de helpdesk para melhorar o atendimento ao cliente, oferecendo respostas <strong>rápidas</strong> e <strong>eficientes </strong>às suas dúvidas.',
      'index.what.service4.title': '<span>Design </span>Gráfico <span>e</span> Web',
      'index.what.service4.desc': 'Oferecemos serviços de <strong>Design Gráfico</strong> e <strong>Design Web</strong>, especializados na criação de landing pages, sites completos e responsivos. Criamos identidades visuais, logotipos, materiais de marketing e outras soluções gráficas.',
      'index.what.service5.title': 'Treinamento<span> de colaboradores</span>',
      'index.what.service5.desc': 'Oferecemos diversos treinamentos com <strong>metodologia prática</strong> para que sua equipe esteja 100% alinhada com as novidades tecnológicas do mercado e possa desempenhar melhores resultados na operação.',
      'index.how.title': 'Como <span>faço?</span>',
      'index.how.step1.title': '<strong>1. </strong>Entender <span>as necessidades</span>',
      'index.how.step1.desc': 'Conversaremos com você para <strong>compreender profundamente</strong> suas necessidades, desafios e objetivos, observaremos suas operações e faremos perguntas-chave para entender melhor as "dores" do seu negócio.',
      'index.how.step2.title': '<strong>2. </strong>Identificar <span> os problemas</span>',
      'index.how.step2.desc': 'Analisaremos as informações coletadas na 1ª fase e trabalharemos juntos para <strong>definir o problema central</strong> que precisa ser resolvido.',
      'index.how.step3.title': '<strong>3. </strong><span>Gerar</span> ideias criativas',
      'index.how.step3.desc': 'Realizaremos sessões de <i>brainstorming</i>, onde discutiremos e exploraremos as diversas possibilidades para <strong>solucionar o problema</strong> definido.',
      'index.how.step4.title': '<strong>4. </strong><span>Criar versões</span> aplicáveis',
      'index.how.step4.desc': 'Criaremos versões simples e funcionais das melhores ideias e desenvolvemos <strong>protótipos</strong> (modelos ou esboços) das soluções propostas, para que possamos <strong>visualizá-las</strong> e <strong>entender melhor</strong> como funcionariam na prática.',
      'index.how.step5.title': '<strong>5. </strong>Validar <span>e</span> aperfeiçoar <span>as soluções</span>',
      'index.how.step5.desc': '<strong>Testaremos</strong> os protótipos com você e, possivelmente, com outros usuários, <strong>coletaremos feedback</strong> e faremos ajustes para melhorar a solução.',
      'index.how.note': 'Essas etapas são cíclicas, o que significa que podemos revisitar e refinar cada etapa conforme necessário até encontrarmos a solução ideal que atenda às suas necessidades e expectativas.',
      'index.portfolio.title': 'Em até <strong>5 dias</strong> entregamos um <strong>relatório geral</strong> do seu negócio com um mapeamento completo de todas as intervenções necessárias e também como implementá-las para que o seu negócio alcance o <strong>MÁXIMO POTENCIAL!</strong>',
      'index.portfolio.cta': 'Que tal <strong>testar gratuitamente</strong> nosso serviço e obter o <b>Relatório Geral</b> do seu negócio?',
      'index.contact.title': '<strong>Que tal fazer um contato?</strong>',
      'index.contact.desc': 'Estou disponível de <strong>segunda</strong> à <strong>sexta</strong>, das <strong>9h</strong> às <strong>18h</strong>. Ao lado, <strong>preencha o formulário</strong> que em menos de 24 horas entrarei em contato com você.',
      'learn1.title': 'F91 - Soluções Operacionais | Seu Negócio + Eficiente e Produtivo!',
      'learn1.hero.title': '<strong>Turbine suas planilhas! </strong><i class="bi bi-rocket-takeoff"></i>',
      'learn1.hero.subtitle': 'Continue usando suas planilhas, mas de uma forma totalmente nova e <strong id="maxpot">MUUUITO MAIS EFICIENTE!</strong> Fique tranquilo que todos os dados serão mantidos ainda em registro nas mesmas planilhas com toda segurança.',
      'learn1.hero.scroll': 'Role para saber como',
      'learn1.about.title': 'Planilha <i style="color: #c0d000;" class="bi bi-filetype-xls"></i> <span><i class="bi bi-arrow-left-right"></i></span><strong> <i class="bi bi-motherboard" style="color: #c0d000;"></i> CRM Completo! ;)</strong>',
      'learn1.about.text1': 'Ainda usa planilhas e/ou ainda faz seus controles no excel mas sente falta de ter mais recursos que só um <strong>sistema CRM completo</strong> pode oferecer... mas não quer pagar todo mês por uma assinatura caríssima?',
      'learn1.about.text2': 'Então você precisa conhecer nossas soluções em <strong>Gestão de Dados e CRM</strong> que transformam qualquer planilha em um <strong>sistema CRM completo</strong> com todos os recursos que você precisa para ter uma operação mais eficiênte no dia-a-dia, por um preço que pode ser menos até do que um cafézinho! <strong><i class="bi bi-cup-hot"></i></strong>',
      'learn1.about.cta': '<span>Quer saber como?</span> Preencha o formulário abaixo que entraremos em contato!',
      'learn1.about.label': 'No video abaixo explicamos com detalhes como funciona:',
      'learn2.title': 'F91 - Soluções Operacionais | Seu Negócio + Eficiente e Produtivo!',
      'learn2.hero.title': '<strong>Tarefas repetitivas nunca mais!</strong>',
      'learn2.hero.subtitle': 'Automatizamos todo tipo de tarefas repetitivas e também implementamos <i>help desks</i> e <i>Chat Bots</i> para automatizar seus atendimentos via WhatsApp e garantir que o seu negócio alcance mais eficiência nos atendimentos.',
      'learn2.about.title': 'Operação <del>manual</del><i style="color: #e23226;" class="bi bi-hand-thumbs-down"></i> <span> <i class="bi bi-arrow-left-right"></i></span> <i style="color: #c0d000;" class="bi bi-hand-thumbs-up-fill"></i><strong>Automatizada! ;)</strong>',
      'learn2.about.text': 'Te ajudamos a deixar sua operação mais eficiênte e produtiva com <strong>automatizações sob medida</strong> para que sua equipe pare de perder tanto tempo em tarefas chatas e repetitivas.',
      'learn2.about.cta': '<span>Quer saber como?</span> Preencha o formulário abaixo que entraremos em contato!',
      'learn2.about.label': 'No video abaixo explicamos com detalhes como funciona:',
      'learnmore.title': 'F91 - Soluções Operacionais | Página em construção',
      'learnmore.content.title': '<i class="bi bi-emoji-frown-fill"></i> DESCULPE!',
      'learnmore.content.subtitle': 'Este conteúdo não está disponível no momento.',
      'learnmore.content.text': 'Muito em breve esta página estará pronta!',
      'blog.title': 'F91 - Soluções Operacionais | Blog',
      'blog.coming_soon': '<span>Em breve...</span>',

            'blog.hero.badge': 'Atualiza\u00e7\u00f5es do Blog',
            'blog.hero.title': 'Novos conte\u00fados para converter mais leads',
            'blog.hero.subtitle': 'Confira os 3 artigos mais recentes da F91.',
            'blog.read_more': 'Leia mais',
            'blog.article1.category': 'Convers\u00e3o',
            'blog.article1.date': '18 Dez 2025',
            'blog.article1.title': '5 Estrat\u00e9gias para Converter Mais Leads',
            'blog.article1.excerpt': 'Ajustes simples de posicionamento, prova social e CTA para aumentar a taxa de resposta.',
            'blog.article1.read': 'Leitura: 6 min',
            'blog.article2.category': 'Automatiza\u00e7\u00e3o',
            'blog.article2.date': '12 Dez 2025',
            'blog.article2.title': 'Como Automatizar seu Processo de Prospec\u00e7\u00e3o',
            'blog.article2.excerpt': 'Cad\u00eancias inteligentes, gatilhos e scoring para reduzir trabalho manual.',
            'blog.article2.read': 'Leitura: 7 min',
            'blog.article3.category': 'Nutri\u00e7\u00e3o',
            'blog.article3.date': '05 Dez 2025',
            'blog.article3.title': 'Dicas de E-mail para Nutrir Leads Frios',
            'blog.article3.excerpt': 'Assuntos objetivos e conte\u00fado \u00fatil para reaquecer contatos.',
            'blog.article3.read': 'Leitura: 5 min',

      'form.title': 'F91 - Soluções Operacionais | Formulário',
      'form.step.name.title': 'Qual é o seu nome?',
      'form.full_name': 'Nome completo',
      'form.step.email.title': 'Qual é o seu email?',
      'form.email': 'E-mail',
      'form.step.phone.title': 'Qual é o seu telefone?',
      'form.phone': 'Telefone',
      'form.step.gender.title': 'Qual é o seu gênero?',
      'form.step.business.title': 'Qual é o nome do seu negócio?',
      'form.business_name': 'Razão Social e nome fantasia',
      'form.step.cnpj.title': 'Qual o CNPJ?',
      'form.step.help.title': 'Como podemos te ajudar?',
      'form.need_desc': 'Descreva sua necessidade',
      'form.step.source.title': 'Por fim, diga como nos conheceu...',
      'form.source.instagram': 'Instagram',
      'form.source.linkedin': 'Linkedin',
      'form.source.indication': 'Indicação',
      'form.source.google': 'Pesquisa no Google',
      'form.source.youtube': 'YouTube',
      'form.source.other': 'Outro',
      'partner.title': 'F91 - Soluções Operacionais | Seja um parceiro',
      'partner.step.name.title': 'Qual é o seu nome completo?',
      'partner.step.birth.title': 'Qual é a sua data de nascimento?',
      'partner.step.cpf.title': 'Qual é o seu CPF?',
      'partner.step.rg.title': 'Qual é o seu RG?',
      'partner.step.sex.title': 'Qual é o seu sexo?',
      'partner.step.email.title': 'Qual é o seu e-mail?',
      'partner.step.whatsapp.title': 'Qual é o seu WhatsApp?',
      'partner.whatsapp_number': 'Número do WhatsApp',
      'partner.step.linkedin.title': 'Linkedin',
      'partner.optional_blank': 'Se não tiver, deixe em branco',
      'partner.step.site.title': 'Site/portfolio',
      'partner.step.education.title': 'Escolaridade',
      'partner.education.high_school': 'Ensino médio completo',
      'partner.education.college_paused': 'Superior trancado',
      'partner.education.college_in_progress': 'Superior cursando',
      'partner.education.college_complete': 'Superior Completo',
      'partner.education.postgrad_paused': 'Pós/MBA trancado',
      'partner.education.postgrad_in_progress': 'Pós/MBA cursando',
      'partner.education.postgrad_complete': 'Pós/MBA completo',
      'partner.step.course.title': 'Curso',
      'partner.related_previous': 'Referente a pergunta anterior',
      'partner.step.occupation.title': 'Ocupação atual',
      'partner.occupation_placeholder': 'Ocupação atual',
      'partner.step.company.title': 'Empresa',
      'partner.step.skills.title': 'Principais habilidades',
      'partner.skills_desc': 'Descreva suas principais habilidades',
      'partner.step.summary.title': 'Breve resumo',
      'partner.summary_desc': 'Faça um breve resumo sobre você',
      'partner.step.photo.title': 'Envie uma foto de perfil',
      'partner.photo_preview_alt': 'Prévia da foto de perfil',
      'partner.button.select_photo': 'Selecionar foto',
      'partner.button.finish': 'Finalizar',
      'terms.title': 'F91 - Soluções Operacionais | Termos e Condições',
      'terms.heading': 'Leia atentamente nossos <span>Termos e Condições</span> de uso:',
      'terms.updated': 'Última atualização: 04/09/2024.',
      'terms.section1.title': '1. Definições',
      'terms.section1.desc': 'Para os fins deste documento, consideram-se as seguintes definições:',
      'terms.section1.item1': '<strong>Usuário:</strong> qualquer pessoa física ou jurídica que utilize os serviços da F91.',
      'terms.section1.item2': '<strong>Serviços:</strong> serviços de consultoria, terceirização de processos e soluções digitais oferecidos pela F91.',
      'terms.section2.title': '2. Aceitação dos Termos',
      'terms.section2.desc': 'Ao utilizar os serviços oferecidos pela F91, o usuário concorda com os presentes Termos e Condições, obrigando-se aos seus termos. Caso o usuário não concorde com as condições estabelecidas, deverá abster-se de utilizar os serviços.',
      'terms.section3.title': '3. Modificações dos Termos',
      'terms.section3.desc': 'A F91 se reserva o direito de modificar ou atualizar estes Termos e Condições a qualquer momento, mediante publicação no site oficial. É responsabilidade do usuário verificar periodicamente a existência de modificações.',
      'terms.section4.title': '4. Descrição dos Serviços',
      'terms.section4.desc': 'A F91 oferece serviços de consultoria em produtividade, terceirização de processos digitais, automação de tarefas, e soluções tecnológicas para empresas, com o objetivo de melhorar a eficiência operacional.',
      'terms.section5.title': '5. Teste Grátis de 5 Dias',
      'terms.section5.desc1': 'A F91 oferece aos novos usuários um período de teste grátis de 5 (cinco) dias para experimentar os serviços. O teste é gratuito para aqueles que efetivamente contratarem algum dos serviços terceirizados oferecidos pela F91 após o período de teste.',
      'terms.section5.desc2': 'Caso o usuário não contrate os serviços ao final do período de teste, será cobrada uma taxa de R$ 99,90 pelo uso dos serviços durante o período de teste.',
      'terms.section6.title': '6. Contratação de Serviços',
      'terms.section6.desc': 'Após o período de teste, o usuário que desejar continuar utilizando os serviços da F91 deverá formalizar a contratação mediante aceite de proposta comercial, que especificará o escopo dos serviços, prazos e valores.',
      'terms.section7.title': '7. Cancelamento e Rescisão',
      'terms.section7.desc': 'O usuário poderá cancelar a utilização dos serviços a qualquer momento, observando as condições contratuais. No caso de rescisão antecipada, poderá haver penalidades conforme o contrato acordado entre as partes.',
      'terms.section8.title': '8. Responsabilidades do Usuário',
      'terms.section8.desc': 'O usuário concorda em utilizar os serviços da F91 de forma responsável, comprometendo-se a não violar nenhuma lei ou direito de terceiros. O usuário também é responsável por fornecer informações verdadeiras e precisas ao contratar os serviços.',
      'terms.section9.title': '9. Limitação de Responsabilidade',
      'terms.section9.desc': 'A F91 não se responsabiliza por danos diretos, indiretos ou consequentes que possam surgir do uso ou da incapacidade de utilizar os serviços prestados. A F91 se exime de responsabilidade por eventos fora de seu controle, como falhas na internet, ataques cibernéticos ou problemas de terceiros que possam impactar a prestação dos serviços.',
      'terms.section10.title': '10. Disposições Finais',
      'terms.section10.desc': 'Estes Termos e Condições são regidos pelas leis da República Federativa do Brasil. Quaisquer controvérsias ou litígios decorrentes da utilização dos serviços deverão ser resolvidos no foro da comarca de São Paulo - SP, com renúncia expressa a qualquer outro.',
      'policy.title': 'F91 - Soluções Operacionais | Política de Privacidade',
      'policy.heading': '<span>Política de Privacidade:</span>',
      'policy.updated': 'Última atualização: 14/09/2024.',
      'policy.section1.title': '1. Informações Coletadas',
      'policy.section1.desc': 'A F91 coleta informações pessoais que você nos fornece voluntariamente ao preencher formulários no nosso site ou ao se inscrever para nossos serviços. Essas informações podem incluir:',
      'policy.section1.item1': 'Nome completo',
      'policy.section1.item2': 'Endereço de e-mail',
      'policy.section1.item3': 'Telefone',
      'policy.section1.item4': 'Endereço físico',
      'policy.section1.item5': 'Informações de pagamento',
      'policy.section2.title': '2. Uso das Informações',
      'policy.section2.desc': 'As informações coletadas são usadas para fornecer e melhorar nossos serviços, comunicar novidades, oferecer suporte ao cliente e realizar análises de dados para personalizar sua experiência.',
      'policy.section3.title': '3. Compartilhamento de Informações',
      'policy.section3.desc': 'A F91 compartilha informações pessoais com prestadores de serviços terceirizados que auxiliam na operação do nosso site e na entrega de nossos serviços. Garantimos que esses prestadores estão vinculados por contratos que protegem seus dados.',
      'policy.section4.title': '4. Segurança das Informações',
      'policy.section4.desc': 'Adotamos medidas de segurança adequadas para proteger suas informações contra perda, uso indevido e acesso não autorizado. No entanto, nenhum sistema de segurança é infalível e não podemos garantir a segurança absoluta.',
      'policy.section5.title': '5. Retenção de Dados',
      'policy.section5.desc': 'Mantemos suas informações apenas pelo tempo necessário para cumprir os propósitos descritos nesta Política de Privacidade ou conforme exigido por lei.',
      'policy.section6.title': '6. Direitos do Usuário',
      'policy.section6.desc': 'Você tem o direito de acessar, corrigir, excluir ou restringir o uso de suas informações pessoais. Para exercer esses direitos, entre em contato conosco através dos canais indicados.',
      'policy.section7.title': '7. Alterações na Política de Privacidade',
      'policy.section7.desc': 'A F91 pode modificar esta Política de Privacidade periodicamente. Notificaremos qualquer alteração significativa publicando a política revisada em nosso site.',
      'policy.section8.title': '8. Contato',
      'policy.section8.desc': 'Se você tiver dúvidas sobre nossa Política de Privacidade, entre em contato conosco pelo e-mail <strong>filoliveira.me@gmail.com</strong>.',
    },
    en: {
      'global.nav.home': 'Home',
      'global.nav.about': 'Who I am',
      'global.nav.what': 'What I do',
      'global.nav.how': 'How I do it',
      'global.nav.blog': 'Blog',

      'global.nav.contact': 'Contact me',
      'global.nav.contact_short': 'Contact me',
      'global.nav.client_area': '<i class="bi bi-person-circle"></i> Client area',
      'global.cta.free_trial': 'Free Trial!',
      'global.cta.free_trial_long': 'I WANT A FREE TRIAL!',
      'global.cta.learn_more': 'Learn more',
      'global.form.contact_name': 'Your Name',
      'global.form.contact_email': 'Your Email',
      'global.form.contact_phone': 'Your Phone/WhatsApp',
      'global.form.contact_company': 'Company Name',
      'global.form.submit': '<i class="bi bi-arrow-return-right"></i> Send',
      'global.form.next': 'Next ➟',
      'global.form.prev': '🠔 Previous',
      'global.form.send': 'Send',
      'global.form.select': 'Select',
      'global.form.only_numbers': 'Enter numbers only',
      'global.gender.male': 'Male',
      'global.gender.female': 'Female',
      'global.gender.other': 'Other',
      'global.footer.terms': 'Terms and Conditions',
      'global.footer.policy': 'Privacy Policy',
      'global.footer.partner': 'Become a Partner',
      'global.form.response.success': 'Form submitted successfully!',
      'global.form.response.error': 'Error sending the form. Please try again.',
      'global.form.response.parse_error': 'Unexpected error while reading the server response.',
      'global.form.response.connection': 'Connection error with the server.',
      'index.meta.description': 'F91 - Soluções Operacionais: tailored solutions for SMEs to boost efficiency, productivity, and reduce costs.',
      'index.title': 'F91 - Soluções Operacionais | A More Efficient and Productive Business!',
      'index.hero.title': 'your business more<br> <strong>Efficient</strong> and <strong>Productive!</strong>',
      'index.hero.subtitle': 'Discover our <strong>tailor-made</strong> operational solutions for your business to reach its <strong id="maxpot">MAXIMUM POTENTIAL!</strong>',
      'index.hero.video_title': 'F91 institutional video',
      'index.hero.video_thumb_alt': 'Video thumbnail',
      'index.hero.cta': 'I WANT A FREE TRIAL! <i class="bi bi-arrow-right"></i>',
      'index.about.title': 'Who <span>am I?</span>',
      'index.about.text': 'I promote <strong>operational innovation</strong> through <strong>administrative support services</strong> focused on serving SMEs that aim to improve their deliveries and execute tasks in a more optimized way, exploring maximum <strong>efficiency</strong> and <strong>productivity</strong>. To do that, I use my <i>know-how</i> and experience to develop <strong><i>low-cost</i> solutions</strong> so clients can reach their best performance and competitiveness.',
      'index.about.mission': '<i class="fas fa-bullseye"></i> <strong>Mission:</strong> Provide the best strategic operational solution for small and medium-sized companies.',
      'index.about.vision': '<i class="fas fa-search-plus"></i> <strong>Vision:</strong> We believe it is possible to execute work and deliveries in a thoughtful, collaborative, and sustainable way, maximizing the potential that current technological resources can offer.',
      'index.about.values': '<i class="fas fa-medal"></i> <strong>Values:</strong> Ethics, transparency, and excellence are indispensable, as well as awareness of all social and environmental responsibility.',
      'index.team.title': 'About <span>me</span>',
      'index.team.intro': 'Hi, I am Filipe, nice to meet you! My goal here is to promote operational innovation through administrative support services focused on serving SMEs that want to improve their deliveries and execute tasks in a more optimized way, exploring maximum efficiency and productivity. To achieve this, I leverage my know-how and experience, always building strategic partnerships to develop the best low-cost solution so clients can achieve their best performance and competitiveness.',
      'index.team.member1.alt': 'Photo of Filipe Oliveira',
      'index.team.member1.role': 'Operations Management',
      'index.actions.ventures': 'Ventures',
      'index.actions.portfolio': 'Portfolio',
      'index.actions.recommendations': 'Recommendations',
      'index.actions.community': 'Community',
      'index.modal.close': 'Close',
      'index.modal.ventures.title': 'Ventures',
      'index.modal.ventures.desc': 'Here are the startups I am currently involved with.',
      'index.modal.ventures.item1.desc': 'SellaStay: hospitality startup, a SaaS for group and event negotiation management.',
      'index.modal.ventures.item2.role': 'Growth partner',
      'index.modal.ventures.item2.desc': 'Sync Softwares: support in growth and expansion strategy.',
      'index.modal.portfolio.title': 'Portfolio',
      'index.modal.portfolio.desc': 'Click a service to open the case in a new tab.',
      'index.modal.portfolio.item1': 'Service 1',
      'index.modal.portfolio.item2': 'Service 2',
      'index.modal.portfolio.item3': 'Service 3',
      'index.modal.portfolio.item4': 'Service 4',
      'index.modal.portfolio.item5': 'Service 5',
      'index.modal.recommendations.title': 'Recommendations',
      'index.modal.recommendations.desc': 'A few testimonials from people who have worked with me.',
      'index.modal.recommendations.prev': 'Previous',
      'index.modal.recommendations.next': 'Next',
      'index.modal.recommendations.avatar': 'Profile photo',
      'index.modal.recommendations.item1.text': 'Filipe delivered results above expectations and always with clarity.',
      'index.modal.recommendations.item1.name': 'Marina Costa',
      'index.modal.recommendations.item1.role': 'COO, Company X',
      'index.modal.recommendations.item2.text': 'Excellent strategic partner, organized and committed to quality.',
      'index.modal.recommendations.item2.name': 'Lucas Pereira',
      'index.modal.recommendations.item2.role': 'Partner, Startup Y',
      'index.modal.recommendations.item3.text': 'Analytical view and fast execution. I recommend without reservations.',
      'index.modal.recommendations.item3.name': 'Ana Rodrigues',
      'index.modal.recommendations.item3.role': 'Operations Manager',
      'index.modal.community.title': 'Community',
      'index.modal.community.desc': 'Fill in your details to receive the invitation to my Telegram group.',
      'index.modal.community.form.name': 'Your name',
      'index.modal.community.form.email': 'Your email',
      'index.modal.community.form.phone': 'Your phone',
      'index.modal.community.form.submit': 'Join the community',
      'index.modal.community.note': 'I will send the invite as soon as your request is received.',

      'index.what.title': 'What<span> I do?</span>',
      'index.what.subtitle': 'We help you find the <span>best cost-benefit solution</span> for your business to reach its <strong>maximum potential</strong>, saving <strong>up to 40% of operational cost!</strong> In practice, it works like this:',
      'index.what.step1.title': '<strong style="font-size: 18px;">1. </strong> Diagnosis',
      'index.what.step1.desc': 'We carry out a complete diagnosis of your business in up to <strong>5 days</strong> and deliver a <strong>General Report</strong> with all solutions suggested for implementation.',
      'index.what.step2.title': '<strong style="font-size: 18px;">2. </strong> Solution',
      'index.what.step2.desc': 'We develop the best <strong>tailor-made</strong> solution according to your needs and goals, using a smart and collaborative creation methodology.',
      'index.what.step3.title': '<strong style="font-size: 18px;">3. </strong> Implementation',
      'index.what.step3.desc': 'We <strong>define together</strong> the service details and implement the solution developed, offering <strong>warranty and support</strong> for 1 year at a price that fits your budget.',
      'index.what.solutions_title': 'See below <span>the main solutions</span> we usually develop:',
      'index.what.service1.title': '<span>Data </span>Management <span>and</span> CRM',
      'index.what.service1.desc': 'Manage your data with ease. Key services include data entry, system implementation, data updates and organization, inventory counting and control, databases, and improving <strong>Excel</strong> and <strong>Google Sheets</strong> spreadsheets.',
      'index.what.service2.title': 'Process<span> Automation</span>',
      'index.what.service2.desc': 'We automate administrative processes and repetitive tasks to increase efficiency and reduce errors. It includes billing, data management, financial management, automated reports, and more.',
      'index.what.service3.title': 'Customer<span> Support</span>',
      'index.what.service3.desc': 'We implement chatbots and helpdesk systems to improve customer service, offering <strong>fast</strong> and <strong>efficient</strong> answers to your questions.',
      'index.what.service4.title': '<span>Graphic </span>Design <span>and</span> Web',
      'index.what.service4.desc': 'We offer <strong>Graphic Design</strong> and <strong>Web Design</strong> services, specializing in landing pages, complete and responsive websites. We create visual identities, logos, marketing materials, and other graphic solutions.',
      'index.what.service5.title': 'Employee<span> Training</span>',
      'index.what.service5.desc': 'We offer a range of trainings with a <strong>practical methodology</strong> so your team is fully aligned with the latest market technologies and can perform better operationally.',
      'index.how.title': 'How <span>I do it?</span>',
      'index.how.step1.title': '<strong>1. </strong>Understand <span>the needs</span>',
      'index.how.step1.desc': 'We will talk with you to <strong>deeply understand</strong> your needs, challenges, and goals, observe your operations, and ask key questions to better understand your business pain points.',
      'index.how.step2.title': '<strong>2. </strong>Identify <span>the problems</span>',
      'index.how.step2.desc': 'We will analyze the information collected in phase 1 and work together to <strong>define the core problem</strong> that needs to be solved.',
      'index.how.step3.title': '<strong>3. </strong><span>Generate</span> creative ideas',
      'index.how.step3.desc': 'We will run <i>brainstorming</i> sessions where we discuss and explore different possibilities to <strong>solve the defined problem</strong>.',
      'index.how.step4.title': '<strong>4. </strong><span>Create versions</span> you can apply',
      'index.how.step4.desc': 'We will create simple, functional versions of the best ideas and develop <strong>prototypes</strong> (models or sketches) of the proposed solutions so we can <strong>visualize</strong> them and <strong>better understand</strong> how they would work in practice.',
      'index.how.step5.title': '<strong>5. </strong>Validate <span>and</span> improve <span>the solutions</span>',
      'index.how.step5.desc': '<strong>We will test</strong> the prototypes with you and possibly with other users, <strong>collect feedback</strong>, and make adjustments to improve the solution.',
      'index.how.note': 'These steps are cyclical, which means we can revisit and refine each stage as needed until we find the ideal solution that meets your needs and expectations.',
      'index.portfolio.title': 'In up to <strong>5 days</strong>, we deliver a <strong>general report</strong> on your business with a full mapping of all required interventions and how to implement them so your business reaches its <strong>MAXIMUM POTENTIAL!</strong>',
      'index.portfolio.cta': 'How about <strong>testing our service for free</strong> and getting your business <b>General Report</b>?',
      'index.contact.title': '<strong>How about getting in touch?</strong>',
      'index.contact.desc': 'I am available from <strong>Monday</strong> to <strong>Friday</strong>, from <strong>9am</strong> to <strong>6pm</strong>. On the side, <strong>fill out the form</strong> and I will contact you in less than 24 hours.',
      'learn1.title': 'F91 - Operational Solutions | A More Efficient and Productive Business!',
      'learn1.hero.title': '<strong>Boost your spreadsheets! </strong><i class="bi bi-rocket-takeoff"></i>',
      'learn1.hero.subtitle': 'Keep using your spreadsheets, but in a completely new and <strong id="maxpot">MUCH MORE EFFICIENT!</strong> way. Rest assured that all data will remain recorded in the same spreadsheets safely.',
      'learn1.hero.scroll': 'Scroll to learn how',
      'learn1.about.title': 'Spreadsheet <i style="color: #c0d000;" class="bi bi-filetype-xls"></i> <span><i class="bi bi-arrow-left-right"></i></span><strong> <i class="bi bi-motherboard" style="color: #c0d000;"></i> Complete CRM! ;)</strong>',
      'learn1.about.text1': 'Do you still use spreadsheets and/or do your controls in Excel but miss having more resources that only a <strong>complete CRM system</strong> can offer... but do not want to pay an expensive monthly subscription?',
      'learn1.about.text2': 'Then you need to know our <strong>Data Management and CRM</strong> solutions that turn any spreadsheet into a <strong>complete CRM system</strong> with all the resources you need to run a more efficient day-to-day operation, for a price that can be less than a cup of coffee! <strong><i class="bi bi-cup-hot"></i></strong>',
      'learn1.about.cta': '<span>Want to know how?</span> Fill out the form below and we will contact you!',
      'learn1.about.label': 'In the video below we explain in detail how it works:',
      'learn2.title': 'F91 - Soluções Operacionais | A More Efficient and Productive Business!',
      'learn2.hero.title': '<strong>No more repetitive tasks!</strong>',
      'learn2.hero.subtitle': 'We automate all kinds of repetitive tasks and also implement <i>help desks</i> and <i>chatbots</i> to automate your WhatsApp support and ensure your business achieves more efficiency in service.',
      'learn2.about.title': 'Operation <del>manual</del><i style="color: #e23226;" class="bi bi-hand-thumbs-down"></i> <span> <i class="bi bi-arrow-left-right"></i></span> <i style="color: #c0d000;" class="bi bi-hand-thumbs-up-fill"></i><strong>Automated! ;)</strong>',
      'learn2.about.text': 'We help make your operation more efficient and productive with <strong>tailor-made automations</strong> so your team stops wasting so much time on boring and repetitive tasks.',
      'learn2.about.cta': '<span>Want to know how?</span> Fill out the form below and we will contact you!',
      'learn2.about.label': 'In the video below we explain in detail how it works:',
      'learnmore.title': 'F91 - Soluções Operacionais | Page under construction',
      'learnmore.content.title': '<i class="bi bi-emoji-frown-fill"></i> SORRY!',
      'learnmore.content.subtitle': 'This content is not available at the moment.',
      'learnmore.content.text': 'This page will be ready very soon!',
      'blog.title': 'F91 - Soluções Operacionais | Blog',
      'blog.coming_soon': '<span>Coming soon...</span>',

            'blog.hero.badge': 'Blog Updates',
            'blog.hero.title': 'New content to convert more leads',
            'blog.hero.subtitle': 'Explore the 3 latest F91 articles.',
            'blog.read_more': 'Read more',
            'blog.article1.category': 'Conversion',
            'blog.article1.date': 'Dec 18, 2025',
            'blog.article1.title': '5 Strategies to Convert More Leads',
            'blog.article1.excerpt': 'Simple positioning, social proof, and CTA tweaks to boost reply rate.',
            'blog.article1.read': 'Read: 6 min',
            'blog.article2.category': 'Automation',
            'blog.article2.date': 'Dec 12, 2025',
            'blog.article2.title': 'How to Automate Your Prospecting Process',
            'blog.article2.excerpt': 'Smart cadences, triggers, and scoring to cut manual work.',
            'blog.article2.read': 'Read: 7 min',
            'blog.article3.category': 'Nurture',
            'blog.article3.date': 'Dec 05, 2025',
            'blog.article3.title': 'Email Tips to Nurture Cold Leads',
            'blog.article3.excerpt': 'Clear subject lines and useful content to warm up contacts.',
            'blog.article3.read': 'Read: 5 min',

      'form.title': 'F91 - Soluções Operacionais | Form',
      'form.step.name.title': 'What is your name?',
      'form.full_name': 'Full name',
      'form.step.email.title': 'What is your email?',
      'form.email': 'Email',
      'form.step.phone.title': 'What is your phone number?',
      'form.phone': 'Phone',
      'form.step.gender.title': 'What is your gender?',
      'form.step.business.title': 'What is your business name?',
      'form.business_name': 'Legal name and trade name',
      'form.step.cnpj.title': 'What is the CNPJ?',
      'form.step.help.title': 'How can we help you?',
      'form.need_desc': 'Describe your need',
      'form.step.source.title': 'Finally, tell us how you heard about us...',
      'form.source.instagram': 'Instagram',
      'form.source.linkedin': 'LinkedIn',
      'form.source.indication': 'Referral',
      'form.source.google': 'Google search',
      'form.source.youtube': 'YouTube',
      'form.source.other': 'Other',
      'partner.title': 'F91 - Soluções Operacionais | Become a partner',
      'partner.step.name.title': 'What is your full name?',
      'partner.step.birth.title': 'What is your date of birth?',
      'partner.step.cpf.title': 'What is your CPF?',
      'partner.step.rg.title': 'What is your RG?',
      'partner.step.sex.title': 'What is your gender?',
      'partner.step.email.title': 'What is your email?',
      'partner.step.whatsapp.title': 'What is your WhatsApp?',
      'partner.whatsapp_number': 'WhatsApp number',
      'partner.step.linkedin.title': 'LinkedIn',
      'partner.optional_blank': 'If you do not have one, leave blank',
      'partner.step.site.title': 'Website/portfolio',
      'partner.step.education.title': 'Education level',
      'partner.education.high_school': 'High school complete',
      'partner.education.college_paused': 'College on hold',
      'partner.education.college_in_progress': 'College in progress',
      'partner.education.college_complete': 'College complete',
      'partner.education.postgrad_paused': 'Postgrad/MBA on hold',
      'partner.education.postgrad_in_progress': 'Postgrad/MBA in progress',
      'partner.education.postgrad_complete': 'Postgrad/MBA complete',
      'partner.step.course.title': 'Course',
      'partner.related_previous': 'Related to the previous question',
      'partner.step.occupation.title': 'Current occupation',
      'partner.occupation_placeholder': 'Current occupation',
      'partner.step.company.title': 'Company',
      'partner.step.skills.title': 'Main skills',
      'partner.skills_desc': 'Describe your main skills',
      'partner.step.summary.title': 'Brief summary',
      'partner.summary_desc': 'Write a brief summary about yourself',
      'partner.step.photo.title': 'Upload a profile photo',
      'partner.photo_preview_alt': 'Profile picture preview',
      'partner.button.select_photo': 'Select photo',
      'partner.button.finish': 'Finish',
      'terms.title': 'F91 - Soluções Operacionais | Terms and Conditions',
      'terms.heading': 'Please read our <span>Terms and Conditions</span> of use carefully:',
      'terms.updated': 'Last updated: 04/09/2024.',
      'terms.section1.title': '1. Definitions',
      'terms.section1.desc': 'For the purposes of this document, the following definitions apply:',
      'terms.section1.item1': '<strong>User:</strong> any individual or legal entity that uses F91 services.',
      'terms.section1.item2': '<strong>Services:</strong> consulting services, process outsourcing, and digital solutions offered by F91.',
      'terms.section2.title': '2. Acceptance of Terms',
      'terms.section2.desc': 'By using the services offered by F91, the user agrees to these Terms and Conditions and is bound by them. If the user does not agree with the conditions established, they must refrain from using the services.',
      'terms.section3.title': '3. Modifications to the Terms',
      'terms.section3.desc': 'F91 reserves the right to modify or update these Terms and Conditions at any time, by publishing on the official website. It is the user responsibility to periodically check for changes.',
      'terms.section4.title': '4. Description of Services',
      'terms.section4.desc': 'F91 offers consulting services in productivity, outsourcing of digital processes, task automation, and technological solutions for companies, with the objective of improving operational efficiency.',
      'terms.section5.title': '5. 5-Day Free Trial',
      'terms.section5.desc1': 'F91 offers new users a free trial period of 5 (five) days to experience the services. The trial is free for those who effectively hire any of the outsourced services offered by F91 after the trial period.',
      'terms.section5.desc2': 'If the user does not hire the services at the end of the trial period, a fee of R$ 99,90 will be charged for the use of the services during the trial period.',
      'terms.section6.title': '6. Hiring Services',
      'terms.section6.desc': 'After the trial period, the user who wishes to continue using F91 services must formalize the hiring by accepting a commercial proposal, which will specify the scope of services, deadlines, and values.',
      'terms.section7.title': '7. Cancellation and Termination',
      'terms.section7.desc': 'The user may cancel the use of the services at any time, observing the contractual conditions. In the case of early termination, there may be penalties as agreed in the contract between the parties.',
      'terms.section8.title': '8. User Responsibilities',
      'terms.section8.desc': 'The user agrees to use F91 services responsibly, committing not to violate any law or third-party rights. The user is also responsible for providing true and accurate information when hiring services.',
      'terms.section9.title': '9. Limitation of Liability',
      'terms.section9.desc': 'F91 is not responsible for direct, indirect, or consequential damages that may arise from the use or inability to use the services provided. F91 disclaims liability for events beyond its control, such as internet failures, cyberattacks, or third-party problems that may impact service delivery.',
      'terms.section10.title': '10. Final Provisions',
      'terms.section10.desc': 'These Terms and Conditions are governed by the laws of the Federative Republic of Brazil. Any disputes or litigation arising from the use of the services shall be resolved in the courts of São Paulo - SP, with express waiver of any other.',
      'policy.title': 'F91 - Soluções Operacionais | Privacy Policy',
      'policy.heading': '<span>Privacy Policy:</span>',
      'policy.updated': 'Last updated: 14/09/2024.',
      'policy.section1.title': '1. Information Collected',
      'policy.section1.desc': 'F91 collects personal information that you voluntarily provide when filling out forms on our website or signing up for our services. This information may include:',
      'policy.section1.item1': 'Full name',
      'policy.section1.item2': 'Email address',
      'policy.section1.item3': 'Phone number',
      'policy.section1.item4': 'Physical address',
      'policy.section1.item5': 'Payment information',
      'policy.section2.title': '2. Use of Information',
      'policy.section2.desc': 'The collected information is used to provide and improve our services, communicate updates, offer customer support, and perform data analysis to personalize your experience.',
      'policy.section3.title': '3. Sharing of Information',
      'policy.section3.desc': 'F91 shares personal information with third-party service providers that assist in operating our website and delivering our services. We ensure these providers are bound by contracts that protect your data.',
      'policy.section4.title': '4. Information Security',
      'policy.section4.desc': 'We adopt appropriate security measures to protect your information against loss, misuse, and unauthorized access. However, no security system is infallible and we cannot guarantee absolute security.',
      'policy.section5.title': '5. Data Retention',
      'policy.section5.desc': 'We keep your information only for as long as necessary to fulfill the purposes described in this Privacy Policy or as required by law.',
      'policy.section6.title': '6. User Rights',
      'policy.section6.desc': 'You have the right to access, correct, delete, or restrict the use of your personal information. To exercise these rights, contact us through the indicated channels.',
      'policy.section7.title': '7. Changes to Privacy Policy',
      'policy.section7.desc': 'F91 may modify this Privacy Policy periodically. We will notify any significant changes by publishing the revised policy on our website.',
      'policy.section8.title': '8. Contact',
      'policy.section8.desc': 'If you have questions about our Privacy Policy, contact us at <strong>filoliveira.me@gmail.com</strong>.',
    },
    es: {
      'global.nav.home': 'Inicio',
      'global.nav.about': 'Quién soy',
      'global.nav.what': 'Qué hago',
      'global.nav.how': 'Cómo lo hago',
      'global.nav.blog': 'Blog',

      'global.nav.contact': 'Contáctame',
      'global.nav.contact_short': 'Contáctame',
      'global.nav.client_area': '<i class="bi bi-person-circle"></i> Área del cliente',
      'global.cta.free_trial': '¡Prueba GRATIS!',
      'global.cta.free_trial_long': '¡QUIERO UNA PRUEBA GRATIS!',
      'global.cta.learn_more': 'Saber más',
      'global.form.contact_name': 'Tu Nombre',
      'global.form.contact_email': 'Tu Email',
      'global.form.contact_phone': 'Tu Teléfono/WhatsApp',
      'global.form.contact_company': 'Nombre de la Empresa',
      'global.form.submit': '<i class="bi bi-arrow-return-right"></i> Enviar',
      'global.form.next': 'Siguiente ➟',
      'global.form.prev': '🠔 Anterior',
      'global.form.send': 'Enviar',
      'global.form.select': 'Seleccione',
      'global.form.only_numbers': 'Ingrese solo números',
      'global.gender.male': 'Masculino',
      'global.gender.female': 'Femenino',
      'global.gender.other': 'Otro',
      'global.footer.terms': 'Términos y Condiciones',
      'global.footer.policy': 'Política de Privacidad',
      'global.footer.partner': 'Sea un Socio',
      'global.form.response.success': '¡Formulario enviado con éxito!',
      'global.form.response.error': 'Error al enviar el formulario. Inténtalo de nuevo.',
      'global.form.response.parse_error': 'Error inesperado al interpretar la respuesta del servidor.',
      'global.form.response.connection': 'Error de conexión con el servidor.',
      'index.meta.description': 'F91 - Soluções Operacionais: soluciones a medida para pymes que buscan aumentar la eficiencia, la productividad y reducir costos.',
      'index.title': 'F91 - Soluções Operacionais | ¡Un negocio más eficiente y productivo!',
      'index.hero.title': 'tu negocio más<br> <strong>Eficiente</strong> y <strong>Productivo!</strong>',
      'index.hero.subtitle': 'Conoce nuestras soluciones operativas <strong>a medida</strong> para que tu negocio alcance su <strong id="maxpot">MÁXIMO POTENCIAL!</strong>',
      'index.hero.video_title': 'Video institucional de F91',
      'index.hero.video_thumb_alt': 'Miniatura de video',
      'index.hero.cta': '¡QUIERO UNA PRUEBA GRATIS! <i class="bi bi-arrow-right"></i>',
      'index.about.title': 'Quién <span>soy?</span>',
      'index.about.text': 'Promuevo la <strong>innovación operativa</strong> a través de <strong>servicios de apoyo administrativo</strong> enfocados en atender a las pymes que buscan mejorar sus entregas y ejecutar tareas de forma más optimizada, explorando la máxima <strong>eficiencia</strong> y <strong>productividad</strong>. Para ello, utilizo mi <i>know-how</i> y experiencia para desarrollar <strong>soluciones <i>low-cost</i></strong> para que el cliente logre su mejor desempeño y competitividad.',
      'index.about.mission': '<i class="fas fa-bullseye"></i> <strong>Misión:</strong> Ofrecer la mejor solución estratégica operativa para pequeñas y medianas empresas.',
      'index.about.vision': '<i class="fas fa-search-plus"></i> <strong>Visión:</strong> Creemos que es posible ejecutar trabajos y entregas de forma bien pensada, colaborativa y sostenible, maximizando el potencial que los recursos tecnológicos actuales pueden ofrecer.',
      'index.about.values': '<i class="fas fa-medal"></i> <strong>Valores:</strong> Ética, transparencia y excelencia son indispensables, así como la conciencia de toda responsabilidad socioambiental.',
      'index.team.title': 'Sobre <span>mí</span>',
      'index.team.intro': 'Hola, soy Filipe, ¡mucho gusto! Mi objetivo aquí es promover la innovación operativa a través de servicios de apoyo administrativo enfocados en atender a las pymes que buscan mejorar sus entregas y ejecutar tareas de forma más optimizada, explorando la máxima eficiencia y productividad. Para ello, busco utilizar mi know-how y experiencia, siempre cerrando alianzas estratégicas para desarrollar la mejor solución low-cost para que el cliente obtenga su mejor desempeño y competitividad.',
      'index.team.member1.alt': 'Foto de Filipe Oliveira',
      'index.team.member1.role': 'Gestión de Operaciones',
      'index.actions.ventures': 'Emprendimientos',
      'index.actions.portfolio': 'Portafolio',
      'index.actions.recommendations': 'Recomendaciones',
      'index.actions.community': 'Comunidad',
      'index.modal.close': 'Cerrar',
      'index.modal.ventures.title': 'Emprendimientos',
      'index.modal.ventures.desc': 'Aqu\u00ed est\u00e1n las startups en las que estoy involucrado actualmente.',
      'index.modal.ventures.item1.desc': 'SellaStay: startup del sector hotelero, un SaaS de gesti\u00f3n de negociaci\u00f3n de grupos y eventos.',
      'index.modal.ventures.item2.role': 'Socio de crecimiento',
      'index.modal.ventures.item2.desc': 'Sync Softwares: apoyo en crecimiento y estrategia de expansi\u00f3n.',
      'index.modal.portfolio.title': 'Portafolio',
      'index.modal.portfolio.desc': 'Haz clic en un servicio para abrir el caso en una nueva pesta\u00f1a.',
      'index.modal.portfolio.item1': 'Servicio 1',
      'index.modal.portfolio.item2': 'Servicio 2',
      'index.modal.portfolio.item3': 'Servicio 3',
      'index.modal.portfolio.item4': 'Servicio 4',
      'index.modal.portfolio.item5': 'Servicio 5',
      'index.modal.recommendations.title': 'Recomendaciones',
      'index.modal.recommendations.desc': 'Algunos testimonios de personas que ya han trabajado conmigo.',
      'index.modal.recommendations.prev': 'Anterior',
      'index.modal.recommendations.next': 'Siguiente',
      'index.modal.recommendations.avatar': 'Foto de perfil',
      'index.modal.recommendations.item1.text': 'Filipe entreg\u00f3 resultados por encima de lo esperado y siempre con claridad.',
      'index.modal.recommendations.item1.name': 'Marina Costa',
      'index.modal.recommendations.item1.role': 'COO, Empresa X',
      'index.modal.recommendations.item2.text': 'Excelente socio estrat\u00e9gico, organizado y comprometido con la calidad.',
      'index.modal.recommendations.item2.name': 'Lucas Pereira',
      'index.modal.recommendations.item2.role': 'Socio, Startup Y',
      'index.modal.recommendations.item3.text': 'Visi\u00f3n anal\u00edtica y ejecuci\u00f3n r\u00e1pida. Recomiendo sin reservas.',
      'index.modal.recommendations.item3.name': 'Ana Rodrigues',
      'index.modal.recommendations.item3.role': 'Gerente de Operaciones',
      'index.modal.community.title': 'Comunidad',
      'index.modal.community.desc': 'Completa tus datos para recibir la invitaci\u00f3n al grupo de Telegram.',
      'index.modal.community.form.name': 'Tu nombre',
      'index.modal.community.form.email': 'Tu correo',
      'index.modal.community.form.phone': 'Tu tel\u00e9fono',
      'index.modal.community.form.submit': 'Quiero participar',
      'index.modal.community.note': 'Enviar\u00e9 la invitaci\u00f3n en cuanto reciba tu solicitud.',

      'index.what.title': 'Qué<span> hago?</span>',
      'index.what.subtitle': 'Te ayudamos a encontrar la <span>mejor solución costo-beneficio</span> para que tu negocio alcance su <strong>máximo potencial</strong>, pudiendo <strong>ahorrar hasta un 40% del costo operativo.</strong> En la práctica, funciona así:',
      'index.what.step1.title': '<strong style="font-size: 18px;">1. </strong> Diagnóstico',
      'index.what.step1.desc': 'Realizamos un diagnóstico completo de tu negocio en hasta <strong>5 días</strong> y te entregamos un <strong>Informe General</strong> con todas las soluciones sugeridas para su implementación.',
      'index.what.step2.title': '<strong style="font-size: 18px;">2. </strong> Solución',
      'index.what.step2.desc': 'Desarrollamos la mejor solución <strong>a medida</strong> de acuerdo con tu necesidad y objetivo, utilizando una metodología inteligente y colaborativa de creación.',
      'index.what.step3.title': '<strong style="font-size: 18px;">3. </strong> Implementación',
      'index.what.step3.desc': '<strong>Definimos juntos</strong> los detalles del servicio e implementamos la solución desarrollada, ofreciendo <strong>garantía y soporte</strong> durante 1 año por un valor que cabe en tu presupuesto.',
      'index.what.solutions_title': 'Mira abajo <span>las principales soluciones</span> que solemos desarrollar:',
      'index.what.service1.title': '<span>Gestión de </span>Datos <span>y</span> CRM',
      'index.what.service1.desc': 'Gestiona tus datos con facilidad. Entre los principales servicios están la carga de datos, la implementación de sistemas, la actualización y organización de datos, el conteo y control de inventario, bases de datos y la mejora de hojas de cálculo <strong>Excel</strong> y <strong>Google Sheets</strong>.',
      'index.what.service2.title': 'Automatización<span> de Procesos</span>',
      'index.what.service2.desc': 'Automatizamos procesos administrativos y tareas repetitivas para aumentar la eficiencia y reducir errores. Incluye facturación, gestión de datos, gestión financiera, informes automatizados, etc.',
      'index.what.service3.title': 'Soporte<span> al Cliente</span>',
      'index.what.service3.desc': 'Implementamos chatbots y sistemas de helpdesk para mejorar la atención al cliente, ofreciendo respuestas <strong>rápidas</strong> y <strong>eficientes</strong> a tus dudas.',
      'index.what.service4.title': '<span>Diseño </span>Gráfico <span>y</span> Web',
      'index.what.service4.desc': 'Ofrecemos servicios de <strong>Diseño Gráfico</strong> y <strong>Diseño Web</strong>, especializados en landing pages, sitios completos y responsivos. Creamos identidades visuales, logotipos, materiales de marketing y otras soluciones gráficas.',
      'index.what.service5.title': 'Capacitación<span> de colaboradores</span>',
      'index.what.service5.desc': 'Ofrecemos diversos entrenamientos con <strong>metodología práctica</strong> para que tu equipo esté 100% alineado con las novedades tecnológicas del mercado y pueda obtener mejores resultados en la operación.',
      'index.how.title': 'Cómo <span>lo hago?</span>',
      'index.how.step1.title': '<strong>1. </strong>Entender <span>las necesidades</span>',
      'index.how.step1.desc': 'Conversaremos contigo para <strong>comprender a fondo</strong> tus necesidades, desafíos y objetivos, observaremos tus operaciones y haremos preguntas clave para entender mejor los dolores de tu negocio.',
      'index.how.step2.title': '<strong>2. </strong>Identificar <span>los problemas</span>',
      'index.how.step2.desc': 'Analizaremos la información recopilada en la fase 1 y trabajaremos juntos para <strong>definir el problema central</strong> que necesita ser resuelto.',
      'index.how.step3.title': '<strong>3. </strong><span>Generar</span> ideas creativas',
      'index.how.step3.desc': 'Realizaremos sesiones de <i>brainstorming</i> donde discutiremos y exploraremos diversas posibilidades para <strong>solucionar el problema</strong> definido.',
      'index.how.step4.title': '<strong>4. </strong><span>Crear versiones</span> aplicables',
      'index.how.step4.desc': 'Crearemos versiones simples y funcionales de las mejores ideas y desarrollaremos <strong>prototipos</strong> (modelos o bocetos) de las soluciones propuestas, para que podamos <strong>visualizarlas</strong> y <strong>entender mejor</strong> cómo funcionarían en la práctica.',
      'index.how.step5.title': '<strong>5. </strong>Validar <span>y</span> mejorar <span>las soluciones</span>',
      'index.how.step5.desc': '<strong>Probamos</strong> los prototipos contigo y, posiblemente, con otros usuarios, <strong>recopilamos feedback</strong> y hacemos ajustes para mejorar la solución.',
      'index.how.note': 'Estas etapas son cíclicas, lo que significa que podemos revisitar y refinar cada etapa según sea necesario hasta encontrar la solución ideal que satisfaga tus necesidades y expectativas.',
      'index.portfolio.title': 'En hasta <strong>5 días</strong> entregamos un <strong>informe general</strong> de tu negocio con un mapeo completo de todas las intervenciones necesarias y también cómo implementarlas para que tu negocio alcance el <strong>MÁXIMO POTENCIAL!</strong>',
      'index.portfolio.cta': '¿Qué tal <strong>probar gratis</strong> nuestro servicio y obtener el <b>Informe General</b> de tu negocio?',
      'index.contact.title': '<strong>¿Qué tal hacer un contacto?</strong>',
      'index.contact.desc': 'Estoy disponible de <strong>lunes</strong> a <strong>viernes</strong>, de <strong>9h</strong> a <strong>18h</strong>. Al lado, <strong>rellena el formulario</strong> y en menos de 24 horas haré contacto contigo.',
      'learn1.title': 'F91 - Soluciones Operacionales | ¡Un negocio más eficiente y productivo!',
      'learn1.hero.title': '<strong>¡Potencia tus hojas de cálculo! </strong><i class="bi bi-rocket-takeoff"></i>',
      'learn1.hero.subtitle': 'Sigue usando tus hojas de cálculo, pero de una forma totalmente nueva y <strong id="maxpot">¡MUCHO MÁS EFICIENTE!</strong> Quédate tranquilo que todos los datos seguirán registrados en las mismas hojas con total seguridad.',
      'learn1.hero.scroll': 'Desliza para saber cómo',
      'learn1.about.title': 'Hoja de cálculo <i style="color: #c0d000;" class="bi bi-filetype-xls"></i> <span><i class="bi bi-arrow-left-right"></i></span><strong> <i class="bi bi-motherboard" style="color: #c0d000;"></i> CRM completo! ;)</strong>',
      'learn1.about.text1': '¿Aún usas hojas de cálculo y/o haces tus controles en Excel pero te falta tener más recursos que solo un <strong>sistema CRM completo</strong> puede ofrecer... pero no quieres pagar una suscripción mensual carísima?',
      'learn1.about.text2': 'Entonces necesitas conocer nuestras soluciones de <strong>Gestión de Datos y CRM</strong> que convierten cualquier hoja de cálculo en un <strong>sistema CRM completo</strong> con todos los recursos que necesitas para tener una operación más eficiente en el día a día, por un precio que puede ser incluso menor que un café! <strong><i class="bi bi-cup-hot"></i></strong>',
      'learn1.about.cta': '<span>¿Quieres saber cómo?</span> Completa el formulario de abajo y nos pondremos en contacto contigo!',
      'learn1.about.label': 'En el video de abajo explicamos con detalles cómo funciona:',
      'learn2.title': 'F91 - Soluções Operacionais | ¡Un negocio más eficiente y productivo!',
      'learn2.hero.title': '<strong>¡Nunca más tareas repetitivas!</strong>',
      'learn2.hero.subtitle': 'Automatizamos todo tipo de tareas repetitivas y también implementamos <i>help desks</i> y <i>chatbots</i> para automatizar tus atenciones vía WhatsApp y garantizar que tu negocio logre más eficiencia en el servicio.',
      'learn2.about.title': 'Operación <del>manual</del><i style="color: #e23226;" class="bi bi-hand-thumbs-down"></i> <span> <i class="bi bi-arrow-left-right"></i></span> <i style="color: #c0d000;" class="bi bi-hand-thumbs-up-fill"></i><strong>¡Automatizada! ;)</strong>',
      'learn2.about.text': 'Te ayudamos a dejar tu operación más eficiente y productiva con <strong>automatizaciones a medida</strong> para que tu equipo deje de perder tanto tiempo en tareas aburridas y repetitivas.',
      'learn2.about.cta': '<span>¿Quieres saber cómo?</span> Completa el formulario de abajo y nos pondremos en contacto contigo!',
      'learn2.about.label': 'En el video de abajo explicamos con detalles cómo funciona:',
      'learnmore.title': 'F91 - Soluções Operacionais | Página en construcción',
      'learnmore.content.title': '<i class="bi bi-emoji-frown-fill"></i> ¡LO SENTIMOS!',
      'learnmore.content.subtitle': 'Este contenido no está disponible en este momento.',
      'learnmore.content.text': '¡Muy pronto esta página estará lista!',
      'blog.title': 'F91 - Soluções Operacionais | Blog',
      'blog.coming_soon': '<span>Muy pronto...</span>',

            'blog.hero.badge': 'Actualizaciones del Blog',
            'blog.hero.title': 'Nuevos contenidos para convertir m\u00e1s leads',
            'blog.hero.subtitle': 'Conoce los 3 art\u00edculos m\u00e1s recientes de F91.',
            'blog.read_more': 'Leer m\u00e1s',
            'blog.article1.category': 'Conversi\u00f3n',
            'blog.article1.date': '18 Dic 2025',
            'blog.article1.title': '5 Estrategias para Convertir M\u00e1s Leads',
            'blog.article1.excerpt': 'Ajustes simples de posicionamiento, prueba social y CTA para aumentar la respuesta.',
            'blog.article1.read': 'Lectura: 6 min',
            'blog.article2.category': 'Automatizaci\u00f3n',
            'blog.article2.date': '12 Dic 2025',
            'blog.article2.title': 'C\u00f3mo Automatizar tu Proceso de Prospecci\u00f3n',
            'blog.article2.excerpt': 'Cadencias inteligentes, disparadores y scoring para reducir trabajo manual.',
            'blog.article2.read': 'Lectura: 7 min',
            'blog.article3.category': 'Nutrici\u00f3n',
            'blog.article3.date': '05 Dic 2025',
            'blog.article3.title': 'Consejos de E-mail para Nutrir Leads Fr\u00edos',
            'blog.article3.excerpt': 'Asuntos claros y contenido \u00fatil para reactivar contactos.',
            'blog.article3.read': 'Lectura: 5 min',

      'form.title': 'F91 - Soluções Operacionais | Formulario',
      'form.step.name.title': '¿Cuál es tu nombre?',
      'form.full_name': 'Nombre completo',
      'form.step.email.title': '¿Cuál es tu email?',
      'form.email': 'Correo electrónico',
      'form.step.phone.title': '¿Cuál es tu teléfono?',
      'form.phone': 'Teléfono',
      'form.step.gender.title': '¿Cuál es tu género?',
      'form.step.business.title': '¿Cuál es el nombre de tu negocio?',
      'form.business_name': 'Razón social y nombre comercial',
      'form.step.cnpj.title': '¿Cuál es el CNPJ?',
      'form.step.help.title': '¿Cómo podemos ayudarte?',
      'form.need_desc': 'Describe tu necesidad',
      'form.step.source.title': 'Por último, cuéntanos cómo nos conociste...',
      'form.source.instagram': 'Instagram',
      'form.source.linkedin': 'LinkedIn',
      'form.source.indication': 'Recomendación',
      'form.source.google': 'Búsqueda en Google',
      'form.source.youtube': 'YouTube',
      'form.source.other': 'Otro',
      'partner.title': 'F91 - Soluções Operacionais | Sea un socio',
      'partner.step.name.title': '¿Cuál es tu nombre completo?',
      'partner.step.birth.title': '¿Cuál es tu fecha de nacimiento?',
      'partner.step.cpf.title': '¿Cuál es tu CPF?',
      'partner.step.rg.title': '¿Cuál es tu RG?',
      'partner.step.sex.title': '¿Cuál es tu sexo?',
      'partner.step.email.title': '¿Cuál es tu correo electrónico?',
      'partner.step.whatsapp.title': '¿Cuál es tu WhatsApp?',
      'partner.whatsapp_number': 'Número de WhatsApp',
      'partner.step.linkedin.title': 'LinkedIn',
      'partner.optional_blank': 'Si no tienes, déjalo en blanco',
      'partner.step.site.title': 'Sitio/portafolio',
      'partner.step.education.title': 'Nivel educativo',
      'partner.education.high_school': 'Secundaria completa',
      'partner.education.college_paused': 'Universidad pausada',
      'partner.education.college_in_progress': 'Universidad en curso',
      'partner.education.college_complete': 'Universidad completa',
      'partner.education.postgrad_paused': 'Posgrado/MBA pausado',
      'partner.education.postgrad_in_progress': 'Posgrado/MBA en curso',
      'partner.education.postgrad_complete': 'Posgrado/MBA completo',
      'partner.step.course.title': 'Carrera',
      'partner.related_previous': 'Relacionado con la pregunta anterior',
      'partner.step.occupation.title': 'Ocupación actual',
      'partner.occupation_placeholder': 'Ocupación actual',
      'partner.step.company.title': 'Empresa',
      'partner.step.skills.title': 'Habilidades principales',
      'partner.skills_desc': 'Describe tus principales habilidades',
      'partner.step.summary.title': 'Resumen breve',
      'partner.summary_desc': 'Haz un breve resumen sobre ti',
      'partner.step.photo.title': 'Sube una foto de perfil',
      'partner.photo_preview_alt': 'Vista previa de la foto de perfil',
      'partner.button.select_photo': 'Seleccionar foto',
      'partner.button.finish': 'Finalizar',
      'terms.title': 'F91 - Soluções Operacionais | Términos y Condiciones',
      'terms.heading': 'Lea atentamente nuestros <span>Términos y Condiciones</span> de uso:',
      'terms.updated': 'Última actualización: 04/09/2024.',
      'terms.section1.title': '1. Definiciones',
      'terms.section1.desc': 'Para los fines de este documento, se consideran las siguientes definiciones:',
      'terms.section1.item1': '<strong>Usuario:</strong> cualquier persona física o jurídica que utilice los servicios de F91.',
      'terms.section1.item2': '<strong>Servicios:</strong> servicios de consultoría, tercerización de procesos y soluciones digitales ofrecidos por F91.',
      'terms.section2.title': '2. Aceptación de los Términos',
      'terms.section2.desc': 'Al utilizar los servicios ofrecidos por F91, el usuario acepta los presentes Términos y Condiciones, quedando obligado por ellos. Si el usuario no está de acuerdo con las condiciones establecidas, deberá abstenerse de utilizar los servicios.',
      'terms.section3.title': '3. Modificaciones de los Términos',
      'terms.section3.desc': 'F91 se reserva el derecho de modificar o actualizar estos Términos y Condiciones en cualquier momento, mediante publicación en el sitio oficial. Es responsabilidad del usuario verificar periódicamente la existencia de modificaciones.',
      'terms.section4.title': '4. Descripción de los Servicios',
      'terms.section4.desc': 'F91 ofrece servicios de consultoría en productividad, tercerización de procesos digitales, automatización de tareas y soluciones tecnológicas para empresas, con el objetivo de mejorar la eficiencia operativa.',
      'terms.section5.title': '5. Prueba gratis de 5 días',
      'terms.section5.desc1': 'F91 ofrece a los nuevos usuarios un periodo de prueba gratis de 5 (cinco) días para experimentar los servicios. La prueba es gratuita para quienes efectivamente contraten alguno de los servicios tercerizados ofrecidos por F91 después del período de prueba.',
      'terms.section5.desc2': 'Si el usuario no contrata los servicios al final del período de prueba, se cobrará una tarifa de R$ 99,90 por el uso de los servicios durante el período de prueba.',
      'terms.section6.title': '6. Contratación de Servicios',
      'terms.section6.desc': 'Después del período de prueba, el usuario que desee continuar utilizando los servicios de F91 deberá formalizar la contratación mediante la aceptación de una propuesta comercial, que especificará el alcance de los servicios, plazos y valores.',
      'terms.section7.title': '7. Cancelación y Rescisión',
      'terms.section7.desc': 'El usuario podrá cancelar el uso de los servicios en cualquier momento, observando las condiciones contractuales. En caso de rescisión anticipada, podrán existir penalidades conforme al contrato acordado entre las partes.',
      'terms.section8.title': '8. Responsabilidades del Usuario',
      'terms.section8.desc': 'El usuario acepta utilizar los servicios de F91 de forma responsable, comprometiéndose a no violar ninguna ley ni derechos de terceros. El usuario también es responsable de proporcionar información verdadera y precisa al contratar los servicios.',
      'terms.section9.title': '9. Limitación de Responsabilidad',
      'terms.section9.desc': 'F91 no se responsabiliza por daños directos, indirectos o consecuentes que puedan surgir del uso o de la imposibilidad de usar los servicios prestados. F91 se exime de responsabilidad por eventos fuera de su control, como fallas en internet, ciberataques o problemas de terceros que puedan afectar la prestación de los servicios.',
      'terms.section10.title': '10. Disposiciones Finales',
      'terms.section10.desc': 'Estos Términos y Condiciones se rigen por las leyes de la República Federativa de Brasil. Cualquier controversia o litigio derivado del uso de los servicios deberá resolverse en el foro de la comarca de São Paulo - SP, con renuncia expresa a cualquier otro.',
      'policy.title': 'F91 - Soluções Operacionais | Política de Privacidad',
      'policy.heading': '<span>Política de Privacidad:</span>',
      'policy.updated': 'Última actualización: 14/09/2024.',
      'policy.section1.title': '1. Información recopilada',
      'policy.section1.desc': 'F91 recopila información personal que usted proporciona voluntariamente al completar formularios en nuestro sitio o al registrarse para nuestros servicios. Esta información puede incluir:',
      'policy.section1.item1': 'Nombre completo',
      'policy.section1.item2': 'Dirección de correo electrónico',
      'policy.section1.item3': 'Teléfono',
      'policy.section1.item4': 'Dirección física',
      'policy.section1.item5': 'Información de pago',
      'policy.section2.title': '2. Uso de la información',
      'policy.section2.desc': 'La información recopilada se utiliza para proporcionar y mejorar nuestros servicios, comunicar novedades, ofrecer soporte al cliente y realizar análisis de datos para personalizar su experiencia.',
      'policy.section3.title': '3. Compartir información',
      'policy.section3.desc': 'F91 comparte información personal con proveedores de servicios terceros que ayudan en la operación de nuestro sitio y en la entrega de nuestros servicios. Garantizamos que estos proveedores están vinculados por contratos que protegen sus datos.',
      'policy.section4.title': '4. Seguridad de la información',
      'policy.section4.desc': 'Adoptamos medidas de seguridad adecuadas para proteger su información contra pérdida, uso indebido y acceso no autorizado. Sin embargo, ningún sistema de seguridad es infalible y no podemos garantizar una seguridad absoluta.',
      'policy.section5.title': '5. Retención de datos',
      'policy.section5.desc': 'Conservamos su información solo durante el tiempo necesario para cumplir los fines descritos en esta Política de Privacidad o según lo exija la ley.',
      'policy.section6.title': '6. Derechos del usuario',
      'policy.section6.desc': 'Usted tiene derecho a acceder, corregir, eliminar o restringir el uso de su información personal. Para ejercer estos derechos, póngase en contacto con nosotros a través de los canales indicados.',
      'policy.section7.title': '7. Cambios en la Política de Privacidad',
      'policy.section7.desc': 'F91 puede modificar esta Política de Privacidad periódicamente. Notificaremos cualquier cambio significativo publicando la política revisada en nuestro sitio.',
      'policy.section8.title': '8. Contacto',
      'policy.section8.desc': 'Si tiene preguntas sobre nuestra Política de Privacidad, póngase en contacto con nosotros por el correo <strong>filoliveira.me@gmail.com</strong>.',
    },
  };

  function normalizeLang(lang) {
    if (!lang) {
      return DEFAULT_LANG;
    }

    const lower = String(lang).toLowerCase();
    if (lower.startsWith('pt')) {
      return 'pt';
    }
    if (lower.startsWith('en')) {
      return 'en';
    }
    if (lower.startsWith('es')) {
      return 'es';
    }

    return DEFAULT_LANG;
  }

  function getLangFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (!langParam) {
      return null;
    }

    const normalized = normalizeLang(langParam);
    if (SUPPORTED_LANGS.includes(normalized)) {
      return normalized;
    }

    return null;
  }

  function detectLang() {
    const stored = localStorage.getItem('site_lang');
    if (stored && SUPPORTED_LANGS.includes(stored)) {
      return stored;
    }

    const candidates = [];
    if (Array.isArray(navigator.languages)) {
      candidates.push(...navigator.languages);
    }
    if (navigator.language) {
      candidates.push(navigator.language);
    }

    for (const candidate of candidates) {
      const normalized = normalizeLang(candidate);
      if (SUPPORTED_LANGS.includes(normalized)) {
        return normalized;
      }
    }

    return DEFAULT_LANG;
  }

  function updateLanguageControls(lang) {
    document.querySelectorAll('[data-lang-switch]').forEach((button) => {
      const target = normalizeLang(button.getAttribute('data-lang-switch'));
      const isActive = target === lang;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-lang-select]').forEach((select) => {
      if (select.value !== lang) {
        select.value = lang;
      }
    });

    const label = LANGUAGE_LABELS[lang] || lang.toUpperCase();
    const name = LANGUAGE_NAMES[lang] || label;
    document.querySelectorAll('[data-lang-current]').forEach((el) => {
      el.textContent = label;
    });
    document.querySelectorAll('[data-lang-toggle]').forEach((toggle) => {
      toggle.setAttribute('aria-label', name);
      toggle.setAttribute('title', name);
    });
  }

  function bindLanguageControls() {
    document.querySelectorAll('[data-lang-switch]').forEach((button) => {
      button.addEventListener('click', () => {
        setLanguage(button.getAttribute('data-lang-switch'));
      });
    });

    document.querySelectorAll('[data-lang-select]').forEach((select) => {
      select.addEventListener('change', () => {
        setLanguage(select.value);
      });
    });
  }

  function closeLanguageDropdowns() {
    document.querySelectorAll('[data-lang-menu]').forEach((menu) => {
      const wrapper = menu.closest('.lang-switcher');
      if (!wrapper) {
        return;
      }

      wrapper.classList.remove('is-open');
      const toggle = wrapper.querySelector('[data-lang-toggle]');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function bindLanguageDropdowns() {
    document.querySelectorAll('[data-lang-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const wrapper = toggle.closest('.lang-switcher');
        if (!wrapper) {
          return;
        }

        const isOpen = wrapper.classList.contains('is-open');
        closeLanguageDropdowns();
        if (!isOpen) {
          wrapper.classList.add('is-open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.lang-switcher')) {
        closeLanguageDropdowns();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeLanguageDropdowns();
      }
    });
  }

  function applyTranslations(lang) {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    const htmlLang = lang === 'pt' ? 'pt-br' : lang;

    document.documentElement.setAttribute('lang', htmlLang);
    document.documentElement.setAttribute('data-lang', lang);

    const elements = document.querySelectorAll('[data-i18n], [data-i18n-html]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-html');
      if (!key) {
        return;
      }

      const value = dict[key] ?? translations[DEFAULT_LANG][key];
      if (value == null) {
        return;
      }

      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }

      const attrList = el.getAttribute('data-i18n-attr');
      if (!attrList) {
        return;
      }

      attrList
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((attr) => {
          const attrKey = `${key}.${attr}`;
          const attrValue = dict[attrKey] ?? translations[DEFAULT_LANG][attrKey] ?? value;
          if (attrValue != null) {
            el.setAttribute(attr, attrValue);
          }
        });
    });
  }

  let currentLang = DEFAULT_LANG;

  function setLanguage(lang, persist = true) {
    const normalized = normalizeLang(lang);
    currentLang = normalized;

    if (persist) {
      localStorage.setItem('site_lang', normalized);
    }

    applyTranslations(normalized);
    updateLanguageControls(normalized);
    closeLanguageDropdowns();
  }

  function t(key) {
    const dict = translations[currentLang] || translations[DEFAULT_LANG];
    return dict[key] ?? translations[DEFAULT_LANG][key] ?? key;
  }

  window.I18N = {
    t,
    setLanguage,
    getLanguage: () => currentLang,
    supported: SUPPORTED_LANGS.slice(),
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindLanguageControls();
    bindLanguageDropdowns();
    const urlLang = getLangFromUrl();
    if (urlLang) {
      setLanguage(urlLang, true);
      return;
    }

    const lang = detectLang();
    setLanguage(lang, false);
  });
})();
