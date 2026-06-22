(() => {
    const STORAGE_LANGUAGE_KEY = "f91_survey_language";
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztCzoDzxzzEyg70Mkc6PHDSsICsi0nFcXqpBhepeMWhstrZI46_peAlBh6nNAd7lEn/exec";
    const SURVEY_ENDPOINT = `${SCRIPT_URL}?action=submitSurvey`;
    const SURVEY_CONFIG = {
        slug: "locacao-para-eventos",
        title: "F91 - Soluções Operacionais: Locação para Eventos",
        niche: "Locação para Eventos",
        version: "2026-03-31",
        sourceFile: "survey_event_rental.html"
    };

    const t = (pt, en, es) => ({ pt, en, es });
    const option = (value, en, es) => ({ value, label: t(value, en, es) });

    const translations = {
        pt: {
            brand_alt: "F91 - Soluções Operacionais",
            meta_description: "Pesquisa da F91 para validar uma solução operacional voltada à locação para eventos, com foco em propostas, negociações, disponibilidade e eficiência comercial.",
            meta_keywords: "F91, locação para eventos, pesquisa, orçamento para eventos, propostas comerciais, locação de equipamentos, locação de itens, operação de eventos",
            og_title: "F91 - Soluções Operacionais: Locação para Eventos",
            og_description: "Validação de uma solução operacional da F91 para empresas de locação para eventos.",
            survey_eyebrow: "Pesquisa de validação",
            survey_title: "F91 - Soluções Operacionais: Locação para Eventos",
            survey_subtitle: "Ajude-nos a desenhar a solução operacional ideal para empresas de locação de equipamentos e itens para eventos.",
            estimated_time: "Tempo estimado: 3 minutos",
            back_btn: "Voltar",
            skip_btn: "Pular",
            next_btn: "Próximo",
            submit_btn: "Enviar",
            sending: "Enviando",
            thank_you_title: "Obrigado!",
            thank_you_text: "Sua resposta foi registrada. Se houver aderência, podemos convidar sua empresa para os próximos testes.",
            restart_link: "Enviar outra resposta",
            step_indicator: "Passo",
            question_of: "de",
            question_num: "Pergunta",
            select_placeholder: "Selecione uma opção",
            validation_required: "Por favor responda esta pergunta.",
            validation_multiselect: "Por favor selecione ao menos uma opção.",
            validation_max_choices: "Você pode selecionar no máximo",
            validation_max_choices_end: "opções.",
            validation_scale: "Selecione um valor na escala.",
            validation_email: "Digite um e-mail válido.",
            validation_phone: "Digite um telefone válido.",
            error_send: "Ocorreu um erro ao enviar. Tente novamente mais tarde.",
            error_connection: "Falha ao enviar. Verifique sua conexão."
        },
        en: {
            brand_alt: "F91 - Operational Solutions",
            meta_description: "F91 survey to validate an operational solution for event rental companies, focused on proposals, negotiations, availability, and commercial efficiency.",
            meta_keywords: "F91, event rental, survey, event quotes, commercial proposals, equipment rental, event items, event operations",
            og_title: "F91 - Operational Solutions: Event Rentals",
            og_description: "Validation of an F91 operational solution for event rental companies.",
            survey_eyebrow: "Validation survey",
            survey_title: "F91 - Operational Solutions: Event Rentals",
            survey_subtitle: "Help us design the ideal operational solution for companies that rent equipment and event items.",
            estimated_time: "Estimated time: 3 minutes",
            back_btn: "Back",
            skip_btn: "Skip",
            next_btn: "Next",
            submit_btn: "Submit",
            sending: "Sending",
            thank_you_title: "Thank you!",
            thank_you_text: "Your response has been recorded. If there is a fit, we may invite your company to the next tests.",
            restart_link: "Submit another response",
            step_indicator: "Step",
            question_of: "of",
            question_num: "Question",
            select_placeholder: "Select an option",
            validation_required: "Please answer this question.",
            validation_multiselect: "Please select at least one option.",
            validation_max_choices: "You can select a maximum of",
            validation_max_choices_end: "options.",
            validation_scale: "Please select a value on the scale.",
            validation_email: "Enter a valid email address.",
            validation_phone: "Enter a valid phone number.",
            error_send: "An error occurred while sending. Please try again later.",
            error_connection: "Failed to send. Check your connection."
        },
        es: {
            brand_alt: "F91 - Soluciones Operativas",
            meta_description: "Encuesta de F91 para validar una solución operativa para empresas de alquiler para eventos, con foco en propuestas, negociaciones, disponibilidad y eficiencia comercial.",
            meta_keywords: "F91, alquiler para eventos, encuesta, presupuestos, propuestas comerciales, alquiler de equipos, artículos para eventos, operaciones de eventos",
            og_title: "F91 - Soluciones Operativas: Alquiler para Eventos",
            og_description: "Validación de una solución operativa de F91 para empresas de alquiler para eventos.",
            survey_eyebrow: "Encuesta de validación",
            survey_title: "F91 - Soluciones Operativas: Alquiler para Eventos",
            survey_subtitle: "Ayúdanos a diseñar la solución operativa ideal para empresas que alquilan equipos y artículos para eventos.",
            estimated_time: "Tiempo estimado: 3 minutos",
            back_btn: "Atrás",
            skip_btn: "Omitir",
            next_btn: "Siguiente",
            submit_btn: "Enviar",
            sending: "Enviando",
            thank_you_title: "¡Gracias!",
            thank_you_text: "Su respuesta ha sido registrada. Si hay encaje, podremos invitar a su empresa a las próximas pruebas.",
            restart_link: "Enviar otra respuesta",
            step_indicator: "Paso",
            question_of: "de",
            question_num: "Pregunta",
            select_placeholder: "Seleccione una opción",
            validation_required: "Por favor responda esta pregunta.",
            validation_multiselect: "Por favor seleccione al menos una opción.",
            validation_max_choices: "Puede seleccionar un máximo de",
            validation_max_choices_end: "opciones.",
            validation_scale: "Seleccione un valor en la escala.",
            validation_email: "Ingrese un correo válido.",
            validation_phone: "Ingrese un teléfono válido.",
            error_send: "Ocurrió un error al enviar. Intente nuevamente más tarde.",
            error_connection: "Error al enviar. Verifique su conexión."
        }
    };

    const QUESTIONS = [
        {
            key: "empresa_nome",
            type: "text",
            label: t("Nome da empresa", "Company name", "Nombre de la empresa"),
            placeholder: t("Ex.: StagePro Eventos", "Ex.: StagePro Events", "Ej.: StagePro Eventos"),
            required: true
        },
        {
            key: "cidade_estado",
            type: "text",
            label: t("Cidade / Estado", "City / State", "Ciudad / Estado"),
            placeholder: t("Ex.: Campinas / SP", "Ex.: Miami / FL", "Ej.: Campinas / SP"),
            required: true
        },
        {
            key: "tipo_operacao",
            type: "multiselect",
            label: t(
                "O que a empresa mais loca para eventos?",
                "What does the company mostly rent for events?",
                "¿Qué alquila principalmente la empresa para eventos?"
            ),
            description: t(
                "Selecione até 3 frentes principais.",
                "Select up to 3 core fronts.",
                "Seleccione hasta 3 frentes principales."
            ),
            options: [
                option("Som, iluminação e LED", "Sound, lighting, and LED", "Sonido, iluminación y LED"),
                option("Mobiliário e decoração", "Furniture and decor", "Mobiliario y decoración"),
                option("Estruturas, tendas e pisos", "Structures, tents, and flooring", "Estructuras, carpas y pisos"),
                option("Itens de buffet e utilidades", "Buffet items and utilities", "Artículos de buffet y utilidades"),
                option("Equipamentos audiovisuais", "Audiovisual equipment", "Equipos audiovisuales"),
                option("Operação mista / catálogo variado", "Mixed operation / broad catalog", "Operación mixta / catálogo variado"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true,
            maxChoices: 3
        },
        {
            key: "orcamentos_mes",
            type: "select",
            label: t(
                "Quantos orçamentos/propostas vocês enviam por mês, em média?",
                "How many quotes/proposals do you send per month on average?",
                "¿Cuántos presupuestos/propuestas envían por mes, en promedio?"
            ),
            options: [
                option("Até 10", "Up to 10", "Hasta 10"),
                option("11 a 30", "11 to 30", "11 a 30"),
                option("31 a 60", "31 to 60", "31 a 60"),
                option("61 a 120", "61 to 120", "61 a 120"),
                option("Mais de 120", "More than 120", "Más de 120")
            ],
            required: true
        },
        {
            key: "canais_entrada",
            type: "multiselect",
            label: t(
                "Por quais canais os pedidos de orçamento costumam chegar?",
                "Through which channels do quote requests usually arrive?",
                "¿Por qué canales suelen llegar las solicitudes de presupuesto?"
            ),
            description: t(
                "Selecione todos os canais relevantes.",
                "Select all relevant channels.",
                "Seleccione todos los canales relevantes."
            ),
            options: [
                option("WhatsApp", "WhatsApp", "WhatsApp"),
                option("E-mail", "Email", "Correo electrónico"),
                option("Telefone", "Phone", "Teléfono"),
                option("Instagram e redes sociais", "Instagram and social media", "Instagram y redes sociales"),
                option("Site / formulário", "Website / form", "Sitio web / formulario"),
                option("Parceiros e indicações", "Partners and referrals", "Socios y referencias"),
                option("Marketplaces", "Marketplaces", "Marketplaces"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true
        },
        {
            key: "como_monta_proposta",
            type: "multiselect",
            label: t(
                "Como vocês montam e enviam as propostas hoje?",
                "How do you build and send proposals today?",
                "¿Cómo arman y envían las propuestas hoy?"
            ),
            description: t(
                "Escolha todas as formas que fazem parte do processo atual.",
                "Choose all methods that are part of the current process.",
                "Elija todas las formas que forman parte del proceso actual."
            ),
            options: [
                option("Manual no Word ou PDF", "Manual in Word or PDF", "Manual en Word o PDF"),
                option("Planilha com modelo pronto", "Spreadsheet with a ready-made template", "Hoja de cálculo con plantilla lista"),
                option("Sistema de locação / ERP", "Rental system / ERP", "Sistema de alquiler / ERP"),
                option("CRM comercial", "Sales CRM", "CRM comercial"),
                option("Sistema próprio", "Custom-built system", "Sistema propio"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true
        },
        {
            key: "tempo_envio_proposta",
            type: "select",
            label: t(
                "Quanto tempo costuma levar entre o pedido e o envio da proposta?",
                "How long does it usually take between the request and sending the proposal?",
                "¿Cuánto tiempo suele pasar entre el pedido y el envío de la propuesta?"
            ),
            options: [
                option("Menos de 30 min", "Less than 30 min", "Menos de 30 min"),
                option("30 a 60 min", "30 to 60 min", "30 a 60 min"),
                option("1 a 3 horas", "1 to 3 hours", "1 a 3 horas"),
                option("3 a 6 horas", "3 to 6 hours", "3 a 6 horas"),
                option("Mais de 6 horas", "More than 6 hours", "Más de 6 horas")
            ],
            required: true
        },
        {
            key: "controle_status",
            type: "multiselect",
            label: t(
                "Como vocês controlam o status das negociações em andamento?",
                "How do you track the status of active negotiations?",
                "¿Cómo controlan el estado de las negociaciones en curso?"
            ),
            options: [
                option("WhatsApp e e-mail", "WhatsApp and email", "WhatsApp y correo"),
                option("Planilha", "Spreadsheet", "Hoja de cálculo"),
                option("CRM / Kanban", "CRM / Kanban", "CRM / Kanban"),
                option("Sistema de locação / ERP", "Rental system / ERP", "Sistema de alquiler / ERP"),
                option("Lembretes individuais", "Individual reminders", "Recordatorios individuales"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true
        },
        {
            key: "principais_gargalos",
            type: "multiselect",
            label: t(
                "Quais são hoje os principais gargalos do processo comercial?",
                "What are the main bottlenecks in the commercial process today?",
                "¿Cuáles son hoy los principales cuellos de botella del proceso comercial?"
            ),
            description: t(
                "Selecione até 4 gargalos que mais pesam na operação.",
                "Select up to 4 bottlenecks that hurt the operation the most.",
                "Seleccione hasta 4 cuellos de botella que más afectan la operación."
            ),
            options: [
                option("Checar disponibilidade dos itens", "Checking item availability", "Verificar disponibilidad de los artículos"),
                option("Montar a composição do orçamento", "Building the quote composition", "Armar la composición del presupuesto"),
                option("Precificar e aplicar descontos", "Pricing and discounting", "Definir precios y aplicar descuentos"),
                option("Gerar proposta bonita e rápida", "Generating a polished proposal quickly", "Generar una propuesta atractiva y rápida"),
                option("Fazer follow-up no tempo certo", "Following up at the right time", "Hacer seguimiento en el momento correcto"),
                option("Evitar erro manual e retrabalho", "Avoiding manual errors and rework", "Evitar errores manuales y retrabajo"),
                option("Integrar comercial com operação / estoque", "Connecting sales with operations / stock", "Integrar comercial con operación / stock"),
                option("Manter histórico do cliente", "Keeping customer history", "Mantener historial del cliente"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true,
            maxChoices: 4
        },
        {
            key: "controle_disponibilidade",
            type: "select",
            label: t(
                "Vocês controlam a disponibilidade dos itens por data em algum sistema?",
                "Do you track item availability by date in any system?",
                "¿Controlan la disponibilidad de los artículos por fecha en algún sistema?"
            ),
            options: [
                option("Sim, em sistema", "Yes, in a system", "Sí, en un sistema"),
                option("Parcialmente", "Partially", "Parcialmente"),
                option("Não", "No", "No")
            ],
            required: true
        },
        {
            key: "conflito_reserva",
            type: "select",
            label: t(
                "Quando não há controle total em sistema, como evitam conflito de reserva ou item duplicado?",
                "When there is no full system control, how do you avoid booking conflicts or duplicated items?",
                "Cuando no hay control total en sistema, ¿cómo evitan conflictos de reserva o artículos duplicados?"
            ),
            options: [
                option("Checagem manual item por item", "Manual item-by-item checking", "Revisión manual artículo por artículo"),
                option("Planilha compartilhada", "Shared spreadsheet", "Hoja compartida"),
                option("Consulta interna com a equipe", "Internal check with the team", "Consulta interna con el equipo"),
                option("Primeiro que fechar leva", "Whoever closes first gets it", "El primero que cierra se lo queda"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true,
            when: (answers) => ["Parcialmente", "Não"].includes(answers.controle_disponibilidade)
        },
        {
            key: "sistema_disponibilidade",
            type: "select",
            label: t(
                "Qual solução vocês usam hoje para controlar a disponibilidade?",
                "What solution do you use today to control availability?",
                "¿Qué solución usan hoy para controlar la disponibilidad?"
            ),
            options: [
                option("Sistema de locação / ERP", "Rental system / ERP", "Sistema de alquiler / ERP"),
                option("Sistema próprio", "Custom-built system", "Sistema propio"),
                option("Planilha integrada", "Integrated spreadsheet", "Hoja integrada"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true,
            when: (answers) => answers.controle_disponibilidade === "Sim, em sistema"
        },
        {
            key: "info_proposta",
            type: "multiselect",
            label: t(
                "O que normalmente precisa aparecer em uma proposta/orçamento?",
                "What usually needs to appear in a proposal/quote?",
                "¿Qué suele necesitar aparecer en una propuesta/presupuesto?"
            ),
            description: t(
                "Selecione os elementos que costumam ser obrigatórios.",
                "Select the elements that are usually mandatory.",
                "Seleccione los elementos que suelen ser obligatorios."
            ),
            options: [
                option("Itens e quantidades", "Items and quantities", "Artículos y cantidades"),
                option("Fotos ou anexos", "Photos or attachments", "Fotos o adjuntos"),
                option("Valores unitários e total", "Unit prices and total", "Valores unitarios y total"),
                option("Frete e logística", "Freight and logistics", "Flete y logística"),
                option("Montagem e desmontagem", "Setup and teardown", "Montaje y desmontaje"),
                option("Condições de pagamento", "Payment terms", "Condiciones de pago"),
                option("Validade da proposta", "Proposal validity", "Validez de la propuesta"),
                option("Contrato ou termos", "Contract or terms", "Contrato o términos"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true
        },
        {
            key: "integracao_areas",
            type: "select",
            label: t(
                "Comercial, operação e estoque/logística ficam integrados no mesmo fluxo?",
                "Are sales, operations, and stock/logistics integrated in the same workflow?",
                "¿Comercial, operación y stock/logística están integrados en el mismo flujo?"
            ),
            options: [
                option("Sim, total", "Yes, fully", "Sí, totalmente"),
                option("Parcial", "Partial", "Parcial"),
                option("Não", "No", "No")
            ],
            required: true
        },
        {
            key: "quebra_processo",
            type: "select",
            label: t(
                "Onde o processo mais costuma quebrar entre comercial e operação?",
                "Where does the process usually break most between sales and operations?",
                "¿Dónde suele romperse más el proceso entre comercial y operación?"
            ),
            options: [
                option("Comercial vende item indisponível", "Sales sells an unavailable item", "Comercial vende un artículo no disponible"),
                option("Informações ficam espalhadas", "Information gets scattered", "La información queda dispersa"),
                option("Operação recebe briefing incompleto", "Operations receives an incomplete briefing", "Operación recibe un briefing incompleto"),
                option("Financeiro perde controle das alterações", "Finance loses track of changes", "Finanzas pierde el control de los cambios"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true,
            when: (answers) => answers.integracao_areas && answers.integracao_areas !== "Sim, total"
        },
        {
            key: "recursos_desejados",
            type: "multiselect",
            label: t(
                "Quais recursos teriam maior impacto em uma solução ideal para sua empresa?",
                "Which features would have the biggest impact in an ideal solution for your company?",
                "¿Qué recursos tendrían mayor impacto en una solución ideal para su empresa?"
            ),
            description: t(
                "Selecione até 5 prioridades.",
                "Select up to 5 priorities.",
                "Seleccione hasta 5 prioridades."
            ),
            options: [
                option("Catálogo com itens e composições", "Catalog with items and packages", "Catálogo con artículos y composiciones"),
                option("Disponibilidade automática por data", "Automatic availability by date", "Disponibilidad automática por fecha"),
                option("Geração rápida de proposta / PDF", "Fast proposal / PDF generation", "Generación rápida de propuesta / PDF"),
                option("Histórico de clientes e negociações", "Customer and negotiation history", "Historial de clientes y negociaciones"),
                option("Follow-up automático", "Automatic follow-up", "Seguimiento automático"),
                option("Aprovação interna da proposta", "Internal proposal approval", "Aprobación interna de la propuesta"),
                option("Aceite ou assinatura digital", "Digital acceptance or signature", "Aceptación o firma digital"),
                option("Integração com WhatsApp e e-mail", "Integration with WhatsApp and email", "Integración con WhatsApp y correo"),
                option("Integração com estoque / logística", "Integration with stock / logistics", "Integración con stock / logística"),
                option("Indicadores de conversão", "Conversion metrics", "Indicadores de conversión"),
                option("Precificação inteligente", "Smart pricing", "Precios inteligentes"),
                option("Outro...", "Other...", "Otro...")
            ],
            required: true,
            maxChoices: 5
        },
        {
            key: "interesse_teste",
            type: "select",
            label: t(
                "Se essa solução existisse com os recursos certos, faria sentido testar?",
                "If this solution existed with the right features, would it make sense to test it?",
                "Si existiera esta solución con los recursos correctos, ¿tendría sentido probarla?"
            ),
            options: [
                option("Sim, com certeza", "Yes, definitely", "Sí, con certeza"),
                option("Talvez", "Maybe", "Tal vez"),
                option("Não no momento", "Not right now", "No por ahora")
            ],
            required: true
        },
        {
            key: "participar_piloto",
            type: "select",
            label: t(
                "Sua empresa teria interesse em participar como piloto da solução?",
                "Would your company be interested in participating as a pilot customer?",
                "¿Su empresa tendría interés en participar como piloto de la solución?"
            ),
            options: [
                option("Sim", "Yes", "Sí"),
                option("Talvez", "Maybe", "Tal vez"),
                option("Não", "No", "No")
            ],
            required: true,
            when: (answers) => answers.interesse_teste && answers.interesse_teste !== "Não no momento"
        },
        {
            key: "responsavel_nome",
            type: "text",
            label: t("Nome do responsável", "Contact name", "Nombre del responsable"),
            placeholder: t("Ex.: Maria Oliveira", "Ex.: Maria Oliveira", "Ej.: Maria Oliveira"),
            required: true
        },
        {
            key: "responsavel_email",
            type: "email",
            label: t("E-mail para contato", "Contact email", "Correo de contacto"),
            placeholder: t("email@empresa.com", "email@company.com", "correo@empresa.com"),
            required: true
        },
        {
            key: "responsavel_telefone",
            type: "tel",
            label: t("Telefone para contato", "Contact phone", "Teléfono de contacto"),
            placeholder: t("Preferencialmente com WhatsApp", "Preferably with WhatsApp", "Preferiblemente con WhatsApp"),
            required: true
        }
    ];

    const state = {};
    let currentIndex = 0;

    const Qcontainer = document.getElementById("questionContainer");
    const progressBar = document.getElementById("progressBar");
    const backBtn = document.getElementById("backBtn");
    const skipBtn = document.getElementById("skipBtn");
    const nextBtn = document.getElementById("nextBtn");
    const stepMeta = document.getElementById("stepMeta");
    const form = document.getElementById("surveyForm");
    const thankyou = document.getElementById("thankyou");
    const restart = document.getElementById("restart");
    const nextBtnLabel = nextBtn ? nextBtn.querySelector("span") : null;

    function getCurrentLang() {
        return window.languageManager ? window.languageManager.currentLang : "pt";
    }

    function getCurrentTexts() {
        return translations[getCurrentLang()] || translations.pt;
    }

    function getLocalizedText(content, lang = getCurrentLang()) {
        if (content == null) {
            return "";
        }

        if (typeof content === "string") {
            return content;
        }

        return content[lang] || content.pt || content.en || content.es || "";
    }

    function getCanonicalText(content) {
        if (content == null) {
            return "";
        }

        if (typeof content === "string") {
            return content;
        }

        return content.pt || content.en || content.es || "";
    }

    function getOptionValue(item) {
        return typeof item === "string" ? item : item.value;
    }

    function getOptionLabel(item, lang = getCurrentLang()) {
        if (typeof item === "string") {
            return item;
        }

        return getLocalizedText(item.label, lang);
    }

    function slugifyId(value) {
        return String(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function getVisibleQuestions() {
        return QUESTIONS.filter((question) => !question.when || question.when(state));
    }

    function cleanupHiddenAnswers() {
        const visibleKeys = new Set(getVisibleQuestions().map((question) => question.key));

        QUESTIONS.forEach((question) => {
            if (question.when && !visibleKeys.has(question.key)) {
                delete state[question.key];
            }
        });
    }

    function updateActionButtons() {
        const texts = getCurrentTexts();
        const visibleQuestions = getVisibleQuestions();
        const isLastQuestion = currentIndex >= visibleQuestions.length - 1;

        if (nextBtnLabel) {
            nextBtnLabel.textContent = isLastQuestion ? texts.submit_btn : texts.next_btn;
        }
    }

    function updateProgress() {
        const texts = getCurrentTexts();
        const visibleQuestions = getVisibleQuestions();
        const total = visibleQuestions.length;
        const safeIndex = Math.min(currentIndex, Math.max(total - 1, 0));
        const percent = total ? Math.round(((safeIndex + 1) / total) * 100) : 0;

        progressBar.style.width = `${percent}%`;
        stepMeta.textContent = `${texts.question_num} ${Math.min(safeIndex + 1, total)} ${texts.question_of} ${total}`;
        updateActionButtons();
    }

    function createTextNode(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }

    function getPhoneDigits(value) {
        return String(value || "").replace(/\D/g, "");
    }

    function isEmailValid(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());
    }

    function formatPtPhone(value) {
        const rawValue = String(value || "");
        const digits = getPhoneDigits(rawValue).slice(0, 13);
        if (!digits) {
            return "";
        }

        const hasCountryCode = rawValue.trim().startsWith("+") || digits.length > 11;
        if (hasCountryCode) {
            const country = digits.slice(0, 2);
            const area = digits.slice(2, 4);
            const local = digits.slice(4);

            let formatted = country ? `+${country}` : "";
            if (area) {
                formatted += ` ${area}`;
            }

            if (local) {
                if (local.length <= 8) {
                    const main = local.slice(0, 4);
                    const tail = local.slice(4);
                    formatted += ` ${main}${tail ? `-${tail}` : ""}`;
                } else {
                    const lead = local.slice(0, 1);
                    const main = local.slice(1, 5);
                    const tail = local.slice(5);
                    formatted += ` ${lead}`;
                    if (main) {
                        formatted += ` ${main}`;
                    }
                    if (tail) {
                        formatted += `-${tail}`;
                    }
                }
            }

            return formatted.trim();
        }

        const area = digits.slice(0, 2);
        const local = digits.slice(2);

        if (digits.length <= 2) {
            return `(${area}`;
        }

        let formatted = `(${area})`;
        if (!local) {
            return formatted;
        }

        if (local.length <= 8) {
            const main = local.slice(0, 4);
            const tail = local.slice(4);
            formatted += ` ${main}${tail ? `-${tail}` : ""}`;
            return formatted;
        }

        const lead = local.slice(0, 1);
        const main = local.slice(1, 5);
        const tail = local.slice(5);
        formatted += ` ${lead}`;
        if (main) {
            formatted += ` ${main}`;
        }
        if (tail) {
            formatted += `-${tail}`;
        }
        return formatted;
    }

    function isPhoneValid(value, lang = getCurrentLang()) {
        const digits = getPhoneDigits(value);
        if (lang === "pt") {
            return [10, 11, 12, 13].includes(digits.length);
        }

        return digits.length >= 7 && digits.length <= 15;
    }

    function applyFieldEnhancements(question, input) {
        if (!question || !input) {
            return;
        }

        if (question.type === "email") {
            input.autocomplete = "email";
            input.inputMode = "email";
            return;
        }

        if (question.type !== "tel") {
            return;
        }

        input.autocomplete = "tel";
        input.inputMode = "numeric";
        input.maxLength = 18;

        if (getCurrentLang() === "pt") {
            input.value = formatPtPhone(input.value);
            input.addEventListener("input", () => {
                input.value = formatPtPhone(input.value);
            });
        }
    }

    function renderQuestion(index) {
        const visibleQuestions = getVisibleQuestions();
        if (!visibleQuestions.length) {
            return;
        }

        currentIndex = Math.max(0, Math.min(index, visibleQuestions.length - 1));
        const question = visibleQuestions[currentIndex];
        const texts = getCurrentTexts();
        const lang = getCurrentLang();
        const currentValue = state[question.key];

        Qcontainer.innerHTML = "";

        const stepDiv = document.createElement("div");
        stepDiv.className = "step-indicator";

        const stepNumber = document.createElement("div");
        stepNumber.className = "num";
        stepNumber.textContent = String(currentIndex + 1);

        const stepLabel = document.createElement("p");
        stepLabel.textContent = texts.step_indicator;

        stepDiv.appendChild(stepNumber);
        stepDiv.appendChild(stepLabel);

        const body = document.createElement("div");
        body.className = "question-body";
        body.appendChild(createTextNode("div", "question-text", getLocalizedText(question.label, lang)));

        if (question.description) {
            body.appendChild(createTextNode("div", "question-desc", getLocalizedText(question.description, lang)));
        }

        if (question.type === "text" || question.type === "email" || question.type === "tel") {
            const input = document.createElement("input");
            input.type = question.type;
            input.className = "input";
            input.id = "inputField";
            input.required = Boolean(question.required);
            input.value = typeof currentValue === "string" ? currentValue : "";
            input.placeholder = question.placeholder ? getLocalizedText(question.placeholder, lang) : "";
            body.appendChild(input);
            applyFieldEnhancements(question, input);
        } else if (question.type === "textarea") {
            const textarea = document.createElement("textarea");
            textarea.className = "input";
            textarea.id = "inputField";
            textarea.rows = 4;
            textarea.required = Boolean(question.required);
            textarea.value = typeof currentValue === "string" ? currentValue : "";
            textarea.placeholder = question.placeholder ? getLocalizedText(question.placeholder, lang) : "";
            body.appendChild(textarea);
        } else if (question.type === "select") {
            const select = document.createElement("select");
            select.className = "input";
            select.id = "inputField";
            select.required = Boolean(question.required);

            const placeholderOption = document.createElement("option");
            placeholderOption.value = "";
            placeholderOption.disabled = Boolean(question.required);
            placeholderOption.textContent = texts.select_placeholder;
            select.appendChild(placeholderOption);

            question.options.forEach((item) => {
                const optionElement = document.createElement("option");
                optionElement.value = getOptionValue(item);
                optionElement.textContent = getOptionLabel(item, lang);
                select.appendChild(optionElement);
            });

            select.value = typeof currentValue === "string" ? currentValue : "";
            body.appendChild(select);
        } else if (question.type === "multiselect") {
            const choiceGroup = document.createElement("div");
            choiceGroup.className = "choice-group";

            question.options.forEach((item) => {
                const value = getOptionValue(item);
                const label = document.createElement("label");
                label.className = "choice-item";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = value;
                checkbox.id = `chk_${question.key}_${slugifyId(value)}`;
                checkbox.checked = Array.isArray(currentValue) && currentValue.includes(value);

                const text = document.createElement("span");
                text.textContent = getOptionLabel(item, lang);

                label.appendChild(checkbox);
                label.appendChild(text);
                choiceGroup.appendChild(label);
            });

            body.appendChild(choiceGroup);
        } else if (question.type === "scale") {
            const scaleGroup = document.createElement("div");
            scaleGroup.className = "scale-group";

            for (let value = question.min; value <= question.max; value += 1) {
                const label = document.createElement("label");
                label.className = "scale-item";

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = `scale_${question.key}`;
                radio.value = String(value);
                radio.checked = String(currentValue) === String(value);

                const text = document.createElement("span");
                text.textContent = String(value);

                label.appendChild(radio);
                label.appendChild(text);
                scaleGroup.appendChild(label);
            }

            body.appendChild(scaleGroup);
        }

        Qcontainer.appendChild(stepDiv);
        Qcontainer.appendChild(body);

        backBtn.style.visibility = currentIndex === 0 ? "hidden" : "visible";
        skipBtn.style.display = question.required ? "none" : "inline-block";

        updateProgress();

        window.setTimeout(() => {
            const input = document.getElementById("inputField");
            if (input) {
                input.focus();
            }
        }, 50);
    }

    function collectAnswer() {
        const question = getVisibleQuestions()[currentIndex];
        if (!question) {
            return true;
        }

        const texts = getCurrentTexts();
        let value = null;

        if (question.type === "text" || question.type === "email" || question.type === "tel" || question.type === "textarea" || question.type === "select") {
            const input = document.getElementById("inputField");
            if (!input) {
                return true;
            }

            value = input.value ? input.value.trim() : "";

            if (question.required && !value) {
                alert(texts.validation_required);
                input.focus();
                return false;
            }

            if (question.type === "email" && value && !isEmailValid(value)) {
                alert(texts.validation_email);
                input.focus();
                return false;
            }

            if (question.type === "tel" && value) {
                if (getCurrentLang() === "pt") {
                    value = formatPtPhone(value);
                    input.value = value;
                }

                if (!isPhoneValid(value)) {
                    alert(texts.validation_phone);
                    input.focus();
                    return false;
                }
            }
        } else if (question.type === "multiselect") {
            value = Array.from(Qcontainer.querySelectorAll('input[type="checkbox"]:checked')).map((checkbox) => checkbox.value);

            if (question.required && value.length === 0) {
                alert(texts.validation_multiselect);
                return false;
            }

            if (question.maxChoices && value.length > question.maxChoices) {
                alert(`${texts.validation_max_choices} ${question.maxChoices} ${texts.validation_max_choices_end}`);
                return false;
            }
        } else if (question.type === "scale") {
            const checked = Qcontainer.querySelector('input[type="radio"]:checked');
            value = checked ? checked.value : "";

            if (question.required && !value) {
                alert(texts.validation_scale);
                return false;
            }
        }

        state[question.key] = value === null ? "" : value;
        cleanupHiddenAnswers();
        return true;
    }

    function createResponseId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return `resp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    function normalizeAnswerValue(value) {
        if (Array.isArray(value)) {
            return value.filter((item) => item !== null && item !== undefined && item !== "");
        }

        return value ?? "";
    }

    function serializeAnswerValue(value) {
        if (Array.isArray(value)) {
            return value.join(" | ");
        }

        return value == null ? "" : String(value);
    }

    function buildSurveyPayload() {
        const responseId = createResponseId();
        const submittedAt = new Date().toISOString();
        const language = getCurrentLang();
        const visibleQuestions = getVisibleQuestions();
        const answers = {};
        const questions = visibleQuestions.map((question, index) => {
            const normalizedValue = normalizeAnswerValue(state[question.key]);
            answers[question.key] = normalizedValue;

            return {
                order: index + 1,
                key: question.key,
                label: getCanonicalText(question.label),
                type: question.type,
                value: normalizedValue
            };
        });

        const payload = {
            action: "submitSurvey",
            response_id: responseId,
            submitted_at: submittedAt,
            language,
            survey_slug: SURVEY_CONFIG.slug,
            survey_title: SURVEY_CONFIG.title,
            survey_niche: SURVEY_CONFIG.niche,
            survey_version: SURVEY_CONFIG.version,
            source_file: SURVEY_CONFIG.sourceFile,
            source_url: window.location.href,
            survey: {
                slug: SURVEY_CONFIG.slug,
                title: SURVEY_CONFIG.title,
                niche: SURVEY_CONFIG.niche,
                version: SURVEY_CONFIG.version,
                sourceFile: SURVEY_CONFIG.sourceFile,
                sourceUrl: window.location.href
            },
            questions,
            answers
        };

        questions.forEach((question) => {
            payload[question.key] = serializeAnswerValue(question.value);
        });

        return payload;
    }

    function buildSurveyFormPayload(payload) {
        const formPayload = new URLSearchParams();

        Object.entries(payload).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                formPayload.append(key, "");
                return;
            }

            if (typeof value === "object") {
                formPayload.append(key, JSON.stringify(value));
                return;
            }

            formPayload.append(key, String(value));
        });

        return formPayload;
    }

    function goToPreviousQuestion() {
        if (currentIndex <= 0) {
            return;
        }

        currentIndex -= 1;
        renderQuestion(currentIndex);
    }

    async function goToNextQuestion() {
        const visibleQuestions = getVisibleQuestions();

        if (currentIndex < visibleQuestions.length - 1) {
            currentIndex += 1;
            renderQuestion(currentIndex);
            return;
        }

        await submitSurvey();
    }

    async function submitSurvey() {
        const texts = getCurrentTexts();

        nextBtn.disabled = true;
        backBtn.disabled = true;
        skipBtn.disabled = true;

        if (nextBtnLabel) {
            nextBtnLabel.textContent = texts.sending;
        }

        try {
            const payload = buildSurveyPayload();
            const formPayload = buildSurveyFormPayload(payload);
            const response = await fetch(SURVEY_ENDPOINT, {
                method: "POST",
                body: formPayload
            });

            const result = await response.json().catch(() => null);

            if (!response.ok || (result && result.success === false)) {
                const message = result && result.message ? result.message : "Invalid server response.";
                console.error("Survey submit error:", message);
                alert(texts.error_send);
                nextBtn.disabled = false;
                backBtn.disabled = false;
                skipBtn.disabled = false;
                updateActionButtons();
                return;
            }

            form.style.display = "none";
            thankyou.style.display = "block";
            progressBar.style.width = "100%";
        } catch (error) {
            console.error(error);
            alert(texts.error_connection);
            nextBtn.disabled = false;
            backBtn.disabled = false;
            skipBtn.disabled = false;
            updateActionButtons();
        }
    }

    class LanguageManager {
        constructor() {
            this.currentLang = localStorage.getItem(STORAGE_LANGUAGE_KEY) || "pt";
            this.attachEventListeners();
            this.applyLanguage();
        }

        switchLanguage(lang) {
            if (!translations[lang]) {
                return;
            }

            this.currentLang = lang;
            localStorage.setItem(STORAGE_LANGUAGE_KEY, lang);
            this.applyLanguage();
            renderQuestion(currentIndex);
        }

        applyLanguage() {
            const current = translations[this.currentLang] || translations.pt;
            document.documentElement.lang = this.currentLang === "pt" ? "pt-BR" : this.currentLang;
            document.title = current.og_title || current.survey_title;

            document.querySelectorAll("[data-i18n]").forEach((element) => {
                const key = element.dataset.i18n;
                const attr = element.dataset.i18nAttr;
                const value = current[key];

                if (value == null) {
                    return;
                }

                if (attr) {
                    element.setAttribute(attr, value);
                    return;
                }

                element.textContent = value;
            });

            document.querySelectorAll(".language-btn").forEach((button) => {
                button.classList.toggle("active", button.dataset.lang === this.currentLang);
            });

            updateActionButtons();
            updateProgress();
        }

        attachEventListeners() {
            document.querySelectorAll(".language-btn").forEach((button) => {
                button.addEventListener("click", () => this.switchLanguage(button.dataset.lang));
            });
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!collectAnswer()) {
            return;
        }

        await goToNextQuestion();
    });

    backBtn.addEventListener("click", (event) => {
        event.preventDefault();
        goToPreviousQuestion();
    });

    skipBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        const visibleQuestions = getVisibleQuestions();
        const currentQuestion = visibleQuestions[currentIndex];
        if (!currentQuestion) {
            return;
        }

        state[currentQuestion.key] = "";
        cleanupHiddenAnswers();
        await goToNextQuestion();
    });

    restart.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.reload();
    });

    window.languageManager = new LanguageManager();
    renderQuestion(0);
})();
