// ═══════════════════════════════════════════════════════════════════════════════
// Google Apps Script - F91 Complete API v8.0
// Funcionalidades: Survey genérica + Hotels + Lead Mapping + Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

const SPREADSHEET_ID = "1M0RIW4aCHzMXyHxMkKGGasKWZjZkzYi8JqyPq2iidKM"; 
const SHEET_SURVEY_RESPONSES = "survey_responses";
const SHEET_SURVEY_ANSWERS = "survey_answers";
const SHEET_HOTELS = "hotels";
const HEADER_ROW = 4;
const SHEET_DMS = "dms";
const DMS_HEADER_ROW = 4;
const BRAND_PRIMARY = "#002050";
const BRAND_ACCENT = "#c0d000";
const BRAND_ACCENT_SOFT = "#F4F8D7";
const BRAND_SURFACE = "#F7F9FC";
const BRAND_BORDER = "#D9E2EC";
const DM_HEADERS = [
  "hotel_name",
  "dm1_name", "dm1_position", "dm1_linkedin",
  "dm2_name", "dm2_position", "dm2_linkedin",
  "dm3_name", "dm3_position", "dm3_linkedin",
  "dm4_name", "dm4_position", "dm4_linkedin"
];
const SURVEY_RESPONSE_HEADERS = [
  "response_id",
  "submitted_at",
  "survey_slug",
  "survey_title",
  "survey_niche",
  "survey_version",
  "source_file",
  "source_url",
  "language",
  "question_count",
  "answered_count",
  "primary_label",
  "primary_value",
  "contact_name",
  "contact_email",
  "contact_phone",
  "answers_json"
];
const SURVEY_ANSWER_HEADERS = [
  "response_id",
  "submitted_at",
  "survey_slug",
  "survey_title",
  "survey_niche",
  "survey_version",
  "language",
  "question_order",
  "question_key",
  "question_label",
  "question_type",
  "answer_value",
  "answer_json"
];
const RESERVED_SURVEY_KEYS = {
  action: true,
  response_id: true,
  submitted_at: true,
  language: true,
  survey: true,
  questions: true,
  answers: true,
  response: true,
  survey_slug: true,
  survey_title: true,
  survey_niche: true,
  survey_version: true,
  source_file: true,
  source_url: true
};

const EMAIL_TO = "filoliveira.me@gmail.com,f91.adm@gmail.com";
const DASHBOARD_PASSWORD_PROPERTY = "SURVEY_DASHBOARD_PASSWORD";
const DASHBOARD_SESSION_PREFIX = "survey_dashboard_session_";
const DASHBOARD_SESSION_TTL_SECONDS = 60 * 60 * 6;
const DASHBOARD_MAX_LATEST_RESPONSES = 80;
const DASHBOARD_MAX_TOP_QUESTIONS = 10;
const DASHBOARD_MAX_TOP_ANSWERS = 6;

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLERS HTTP - doGet, doPost, doOptions
// ═══════════════════════════════════════════════════════════════════════════════

function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  let result;
  
  try {
    switch(action) {
      case 'getSurveyResponses':
      case 'survey':
        result = obterRespostasSurvey();
        break;

      case 'getSurveyDashboard':
      case 'surveyDashboard':
        result = obterSurveyDashboard(e);
        break;

      case 'getSurveyResponseDetail':
      case 'surveyResponseDetail':
        result = obterDetalheRespostaSurvey(e);
        break;
        
      case 'getHotels':
      case 'hotels':
        result = obterHoteis();
        break;
        
      case 'getAllData':
        result = obterTodosDados();
        break;
        
      case 'getDMs':
      case 'dms':
        result = obterDMs();
        break;
        
      case 'status':
        result = {
          success: true,
          status: 'ready',
          version: '8.0',
          timestamp: new Date().toISOString()
        };
        break;
        
      default:
        result = { success: false, message: 'Ação não reconhecida: ' + action };
    }
  } catch (error) {
    Logger.log("Erro em doGet: " + error.toString());
    result = { success: false, message: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;
  
  try {
    const data = parseRequestPayload(e);
    const action = data.action || (e && e.parameter ? e.parameter.action : "");
    
    switch(action) {
      case 'submitSurvey':
        result = salvarRespostaSurvey(data);
        break;

      case 'loginSurveyDashboard':
        result = autenticarSurveyDashboard(data);
        break;

      case 'logoutSurveyDashboard':
        result = encerrarSessaoSurveyDashboard(data);
        break;
        
      case 'addHotel':
        result = adicionarHotel(data);
        break;
        
      case 'addMultipleHotels':
        result = addMultipleHotels(data);
        break;
        
      case 'saveDMs':
        result = salvarDMs(data);
        break;
        
      default:
        result = { success: false, message: 'Ação não reconhecida: ' + action };
    }
  } catch (error) {
    Logger.log("Erro em doPost: " + error.toString());
    result = { success: false, message: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES - SURVEY (MODELO GENÉRICO E ESCALÁVEL)
// ═══════════════════════════════════════════════════════════════════════════════

function openSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim()) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.create("F91 - Soluções Operacionais");
}

function ensureSheetWithHeaders(ss, sheetName, headers, headerRow) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const headerRange = sheet.getRange(headerRow, 1, 1, headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsSetup = headers.some(function(header, index) {
    return currentHeaders[index] !== header;
  });

  if (needsSetup) {
    headerRange.clearContent();
    headerRange.setValues([headers]);
    styleHeaderRange(headerRange);
    sheet.setFrozenRows(headerRow);
    sheet.autoResizeColumns(1, headers.length);
  }

  return sheet;
}

function styleHeaderRange(headerRange) {
  headerRange.setBackground(BRAND_PRIMARY);
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
}

function ensureSurveySheets() {
  const ss = openSpreadsheet();
  return {
    responsesSheet: ensureSheetWithHeaders(ss, SHEET_SURVEY_RESPONSES, SURVEY_RESPONSE_HEADERS, HEADER_ROW),
    answersSheet: ensureSheetWithHeaders(ss, SHEET_SURVEY_ANSWERS, SURVEY_ANSWER_HEADERS, HEADER_ROW)
  };
}

function parseRequestPayload(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
  const params = e && e.parameter ? e.parameter : {};

  if (!raw) {
    return params || {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    if (params && Object.keys(params).length > 0) {
      return params;
    }
    return parseFormEncodedPayload(raw);
  }
}

function parseFormEncodedPayload(raw) {
  if (!raw) return {};

  return raw.split("&").reduce(function(acc, pair) {
    if (!pair) return acc;
    const pieces = pair.split("=");
    const key = decodeURIComponent((pieces[0] || "").replace(/\+/g, " "));
    const value = decodeURIComponent((pieces.slice(1).join("=") || "").replace(/\+/g, " "));
    acc[key] = value;
    return acc;
  }, {});
}

function salvarRespostaSurvey(data) {
  try {
    const surveyResponse = normalizeSurveyPayload(data || {});
    const sheets = ensureSurveySheets();

    sheets.responsesSheet.appendRow(buildSurveyResponseRow(surveyResponse));
    appendSurveyAnswerRows(sheets.answersSheet, surveyResponse);
    destacarNovaLinha(sheets.responsesSheet);

    try {
      enviarEmailNotificacao(surveyResponse);
    } catch (e) {
      Logger.log("Erro ao enviar email: " + e);
    }

    return {
      success: true,
      message: "Resposta salva com sucesso!",
      response_id: surveyResponse.responseId
    };

  } catch (error) {
    Logger.log("Erro em salvarRespostaSurvey: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function normalizeSurveyPayload(data) {
  const parsedSurvey = parseJsonField(data.survey, {});
  const parsedQuestions = parseJsonField(data.questions, []);
  const parsedAnswers = parseJsonField(data.answers, null);
  const normalizedData = Object.assign({}, data, {
    survey: parsedSurvey,
    questions: parsedQuestions,
    answers: parsedAnswers
  });
  const survey = normalizeSurveyMeta(normalizedData);
  const submittedAt = sanitizeString(data.submitted_at) || new Date().toISOString();
  const language = sanitizeString(data.language) || "pt";
  const responseId = sanitizeString(data.response_id) || Utilities.getUuid();
  const questionItems = buildQuestionItems(
    Array.isArray(normalizedData.questions) ? normalizedData.questions : [],
    buildAnswersMap(normalizedData)
  );
  const answeredItems = questionItems.filter(function(item) {
    return item.answerValue !== "";
  });
  const primaryItem = findPreferredAnswer(answeredItems, [
    "nome_hotel",
    "hotel_name",
    "business_name",
    "company_name",
    "company",
    "empresa",
    "organization_name",
    "organizacao",
    "organization"
  ]);

  return {
    responseId: responseId,
    submittedAt: submittedAt,
    language: language,
    survey: survey,
    questionCount: questionItems.length,
    answeredCount: answeredItems.length,
    primaryLabel: primaryItem ? primaryItem.questionLabel : "",
    primaryValue: primaryItem ? primaryItem.answerValue : "",
    contactName: findPreferredValue(answeredItems, [
      "responsavel_nome",
      "contact_name",
      "full_name",
      "nome",
      "name"
    ]),
    contactEmail: findPreferredValue(answeredItems, [
      "responsavel_email",
      "contact_email",
      "work_email",
      "email"
    ]),
    contactPhone: findPreferredValue(answeredItems, [
      "responsavel_telefone",
      "contact_phone",
      "telefone",
      "phone",
      "whatsapp"
    ]),
    answersJson: safeJsonStringify(buildAnswersObject(questionItems)),
    questionItems: questionItems,
    answeredItems: answeredItems
  };
}

function normalizeSurveyMeta(data) {
  const survey = data.survey && typeof data.survey === "object" ? data.survey : {};

  return {
    slug: sanitizeString(data.survey_slug) || sanitizeString(survey.slug) || "geral",
    title: sanitizeString(data.survey_title) || sanitizeString(survey.title) || "F91 - Soluções Operacionais",
    niche: sanitizeString(data.survey_niche) || sanitizeString(survey.niche),
    version: sanitizeString(data.survey_version) || sanitizeString(survey.version),
    sourceFile: sanitizeString(data.source_file) || sanitizeString(survey.sourceFile),
    sourceUrl: sanitizeString(data.source_url) || sanitizeString(survey.sourceUrl)
  };
}

function buildAnswersMap(data) {
  if (data.answers && typeof data.answers === "object" && !Array.isArray(data.answers)) {
    return data.answers;
  }

  const answers = {};
  Object.keys(data || {}).forEach(function(key) {
    if (!RESERVED_SURVEY_KEYS[key]) {
      answers[key] = data[key];
    }
  });

  return answers;
}

function buildQuestionItems(questionMetaList, answersMap) {
  const orderedKeys = [];
  const metaByKey = {};

  questionMetaList.forEach(function(question, index) {
    if (!question || !question.key) return;
    const key = String(question.key);
    if (orderedKeys.indexOf(key) === -1) {
      orderedKeys.push(key);
    }
    metaByKey[key] = {
      order: Number(question.order) || index + 1,
      label: sanitizeString(question.label) || humanizeKey(key),
      type: sanitizeString(question.type) || inferAnswerType(question.value)
    };
  });

  Object.keys(answersMap || {}).forEach(function(key) {
    if (orderedKeys.indexOf(key) === -1) {
      orderedKeys.push(key);
    }
  });

  return orderedKeys.map(function(key, index) {
    const meta = metaByKey[key] || {};
    const rawValue = answersMap[key];
    return {
      questionOrder: meta.order || index + 1,
      questionKey: key,
      questionLabel: meta.label || humanizeKey(key),
      questionType: meta.type || inferAnswerType(rawValue),
      rawValue: rawValue,
      answerValue: formatAnswerValue(rawValue)
    };
  });
}

function buildAnswersObject(questionItems) {
  const answers = {};
  questionItems.forEach(function(item) {
    answers[item.questionKey] = item.rawValue;
  });
  return answers;
}

function buildSurveyResponseRow(response) {
  return [
    response.responseId,
    response.submittedAt,
    response.survey.slug,
    response.survey.title,
    response.survey.niche,
    response.survey.version,
    response.survey.sourceFile,
    response.survey.sourceUrl,
    response.language,
    response.questionCount,
    response.answeredCount,
    response.primaryLabel,
    response.primaryValue,
    response.contactName,
    response.contactEmail,
    response.contactPhone,
    response.answersJson
  ];
}

function appendSurveyAnswerRows(sheet, response) {
  if (!response.answeredItems.length) return;

  const rows = response.answeredItems.map(function(item) {
    return [
      response.responseId,
      response.submittedAt,
      response.survey.slug,
      response.survey.title,
      response.survey.niche,
      response.survey.version,
      response.language,
      item.questionOrder,
      item.questionKey,
      item.questionLabel,
      item.questionType,
      item.answerValue,
      safeJsonStringify(item.rawValue)
    ];
  });

  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, SURVEY_ANSWER_HEADERS.length).setValues(rows);
}

function obterRespostasSurvey() {
  try {
    const ss = openSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SURVEY_RESPONSES);

    if (!sheet) {
      return { success: true, surveys: [], total: 0 };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= HEADER_ROW) {
      return { success: true, surveys: [], total: 0 };
    }

    const values = sheet.getRange(
      HEADER_ROW + 1,
      1,
      lastRow - HEADER_ROW,
      SURVEY_RESPONSE_HEADERS.length
    ).getValues();

    const surveys = values
      .filter(function(row) {
        return row[0];
      })
      .map(function(row) {
        return {
          response_id: row[0],
          submitted_at: row[1],
          survey_slug: row[2],
          survey_title: row[3],
          survey_niche: row[4],
          survey_version: row[5],
          source_file: row[6],
          source_url: row[7],
          language: row[8],
          question_count: row[9],
          answered_count: row[10],
          primary_label: row[11],
          primary_value: row[12],
          contact_name: row[13],
          contact_email: row[14],
          contact_phone: row[15],
          answers: parseJsonSafe(row[16]) || {}
        };
      });

    return {
      success: true,
      surveys: surveys,
      total: surveys.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    Logger.log("Erro em obterRespostasSurvey: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function destacarNovaLinha(sheet) {
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) return;

  if (lastRow > HEADER_ROW + 1) {
    const previousRow = sheet.getRange(lastRow - 1, 1, 1, sheet.getLastColumn());
    previousRow.setBackground(null);
    previousRow.setFontWeight("normal");
  }

  const latestRow = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn());
  latestRow.setBackground(BRAND_ACCENT_SOFT);
  latestRow.setFontWeight("bold");
}

function enviarEmailNotificacao(response) {
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
  const receivedAt = Utilities.formatDate(
    new Date(response.submittedAt),
    "America/Sao_Paulo",
    "dd/MM/yyyy 'às' HH:mm:ss"
  );
  const subject = `Nova resposta recebida | ${response.survey.title}`;
  const previewHtml = buildAnswerPreview(response.answeredItems);
  const referenceRows = [];

  if (response.primaryValue) {
    referenceRows.push([
      response.primaryLabel || "Registro principal",
      response.primaryValue
    ]);
  }
  if (response.contactName) {
    referenceRows.push(["Contato", response.contactName]);
  }
  if (response.contactEmail) {
    referenceRows.push(["E-mail", response.contactEmail]);
  }
  if (response.contactPhone) {
    referenceRows.push(["Telefone", response.contactPhone]);
  }

  const referenceHtml = referenceRows.length
    ? `
      <tr>
        <td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND_BORDER}; border-radius:18px; background:#ffffff;">
            ${referenceRows.map(function(row) {
              return `
                <tr>
                  <td style="padding:14px 18px; border-bottom:1px solid #eef2f6; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#5B6776;">${escapeHtml(row[0])}</td>
                  <td style="padding:14px 18px; border-bottom:1px solid #eef2f6; font-size:14px; color:#10233A;">${escapeHtml(row[1])}</td>
                </tr>
              `;
            }).join("")}
          </table>
        </td>
      </tr>
    `
    : "";

  const messageHtml = `
    <div style="margin:0; padding:24px; background:${BRAND_SURFACE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid ${BRAND_BORDER}; border-radius:24px; overflow:hidden; font-family:Arial, Helvetica, sans-serif;">
        <tr>
          <td style="padding:24px 32px; border-bottom:1px solid #E8EDF4;">
            <img src="https://f91.tech/img/logo_.png" alt="F91" style="height:40px; display:block;">
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <div style="display:inline-block; padding:6px 10px; border-radius:999px; background:#EFF6C6; color:${BRAND_PRIMARY}; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Nova resposta</div>
            <h1 style="margin:16px 0 10px; font-size:28px; line-height:1.25; color:${BRAND_PRIMARY};">Uma nova pesquisa foi enviada</h1>
            <p style="margin:0; color:#5B6776; font-size:15px; line-height:1.7;">Recebemos uma nova resposta por um formulário da F91. Abaixo estão os principais dados para triagem rápida.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0 12px;">
              <tr>
                <td width="50%" style="padding:16px 18px; border:1px solid ${BRAND_BORDER}; border-radius:16px; background:#ffffff;">
                  <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#5B6776;">Pesquisa</div>
                  <div style="margin-top:8px; font-size:16px; font-weight:700; color:${BRAND_PRIMARY};">${escapeHtml(response.survey.title)}</div>
                </td>
                <td width="50%" style="padding:16px 18px; border:1px solid ${BRAND_BORDER}; border-radius:16px; background:#ffffff;">
                  <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#5B6776;">Nicho</div>
                  <div style="margin-top:8px; font-size:16px; font-weight:700; color:${BRAND_PRIMARY};">${escapeHtml(response.survey.niche || "Não informado")}</div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:16px 18px; border:1px solid ${BRAND_BORDER}; border-radius:16px; background:#ffffff;">
                  <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#5B6776;">Idioma</div>
                  <div style="margin-top:8px; font-size:16px; font-weight:700; color:${BRAND_PRIMARY};">${escapeHtml(getLanguageLabel(response.language))}</div>
                </td>
                <td width="50%" style="padding:16px 18px; border:1px solid ${BRAND_BORDER}; border-radius:16px; background:#ffffff;">
                  <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#5B6776;">Recebida em</div>
                  <div style="margin-top:8px; font-size:16px; font-weight:700; color:${BRAND_PRIMARY};">${escapeHtml(receivedAt)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${referenceHtml}
        <tr>
          <td style="padding:0 32px 16px;">
            <div style="font-size:14px; font-weight:700; color:${BRAND_PRIMARY}; margin-bottom:12px;">Prévia das respostas</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND_BORDER}; border-radius:18px; background:#ffffff;">
              ${previewHtml}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px;">
            <a href="${spreadsheetUrl}" style="display:inline-block; padding:14px 22px; background:${BRAND_PRIMARY}; color:#ffffff; text-decoration:none; border-radius:12px; font-size:14px; font-weight:700;">Abrir planilha</a>
          </td>
        </tr>
      </table>
    </div>
  `;

  const textBody = [
    "Nova resposta recebida",
    "",
    "Pesquisa: " + (response.survey.title || "F91 - Soluções Operacionais"),
    "Nicho: " + (response.survey.niche || "Não informado"),
    "Idioma: " + getLanguageLabel(response.language),
    "Recebida em: " + receivedAt,
    response.primaryValue ? (response.primaryLabel || "Registro principal") + ": " + response.primaryValue : "",
    response.contactName ? "Contato: " + response.contactName : "",
    response.contactEmail ? "E-mail: " + response.contactEmail : "",
    response.contactPhone ? "Telefone: " + response.contactPhone : "",
    "",
    spreadsheetUrl
  ].filter(Boolean).join("\n");

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: subject,
    body: textBody,
    htmlBody: messageHtml
  });
}

function buildAnswerPreview(answerItems) {
  if (!answerItems.length) {
    return `
      <tr>
        <td style="padding:18px; font-size:14px; color:#5B6776;">Nenhuma resposta preenchida foi enviada.</td>
      </tr>
    `;
  }

  return answerItems.slice(0, 6).map(function(item) {
    return `
      <tr>
        <td style="padding:16px 18px; border-bottom:1px solid #eef2f6;">
          <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#5B6776; margin-bottom:8px;">${escapeHtml(item.questionLabel)}</div>
          <div style="font-size:14px; line-height:1.6; color:#10233A;">${escapeHtml(truncateText(item.answerValue, 220) || "Não informado")}</div>
        </td>
      </tr>
    `;
  }).join("");
}

function getLanguageLabel(language) {
  switch (language) {
    case "en":
      return "English";
    case "es":
      return "Español";
    default:
      return "Português";
  }
}

function findPreferredAnswer(items, preferredKeys) {
  const wanted = preferredKeys.map(function(key) {
    return String(key).toLowerCase();
  });

  for (let i = 0; i < items.length; i++) {
    const currentKey = String(items[i].questionKey || "").toLowerCase();
    if (wanted.indexOf(currentKey) !== -1 && items[i].answerValue) {
      return items[i];
    }
  }

  return items.length ? items[0] : null;
}

function findPreferredValue(items, preferredKeys) {
  const item = findPreferredAnswer(items, preferredKeys);
  if (!item) return "";
  return item.answerValue || "";
}

function formatAnswerValue(value) {
  if (Array.isArray(value)) {
    return value
      .filter(function(item) {
        return item !== null && item !== undefined && item !== "";
      })
      .map(function(item) {
        return String(item).trim();
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return safeJsonStringify(value);
  }

  return String(value).trim();
}

function inferAnswerType(value) {
  if (Array.isArray(value)) return "multiselect";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "text";
}

function humanizeKey(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, function(char) {
      return char.toUpperCase();
    });
}

function sanitizeString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return "";
  }
}

function parseJsonSafe(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function parseJsonField(value, fallbackValue) {
  if (value === null || value === undefined || value === "") {
    return fallbackValue;
  }

  if (typeof value === "object") {
    return value;
  }

  const parsed = parseJsonSafe(value);
  return parsed === null ? fallbackValue : parsed;
}

function autenticarSurveyDashboard(data) {
  try {
    const expectedPassword = obterSenhaSurveyDashboard_();
    const informedPassword = sanitizeString(data && data.password);

    if (!expectedPassword) {
      return {
        success: false,
        configured: false,
        message: "Configure a propriedade SURVEY_DASHBOARD_PASSWORD no Apps Script."
      };
    }

    if (!informedPassword || informedPassword !== expectedPassword) {
      return { success: false, message: "Senha invalida." };
    }

    const token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    const session = {
      created_at: new Date().toISOString()
    };

    CacheService
      .getScriptCache()
      .put(DASHBOARD_SESSION_PREFIX + token, safeJsonStringify(session), DASHBOARD_SESSION_TTL_SECONDS);

    return {
      success: true,
      token: token,
      expires_in_seconds: DASHBOARD_SESSION_TTL_SECONDS,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    Logger.log("Erro em autenticarSurveyDashboard: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function encerrarSessaoSurveyDashboard(data) {
  try {
    const token = sanitizeString(data && data.token);
    if (token) {
      CacheService.getScriptCache().remove(DASHBOARD_SESSION_PREFIX + token);
    }
    return { success: true };
  } catch (error) {
    Logger.log("Erro em encerrarSessaoSurveyDashboard: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function obterSurveyDashboard(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    validarSessaoSurveyDashboard_(extrairTokenDashboard_(params));

    const allResponses = listarRegistrosSurvey_();
    const allAnswers = listarRegistrosRespostasSurvey_();
    const filter = normalizarFiltroDashboard_(params);
    const filteredResponses = filtrarRegistrosDashboard_(allResponses, filter);
    const filteredIds = criarMapaIds_(filteredResponses.map(function(item) {
      return item.response_id;
    }));
    const filteredAnswers = allAnswers.filter(function(item) {
      return filteredIds[item.response_id];
    });
    const sortedResponses = filteredResponses.slice().sort(function(a, b) {
      return b.timestamp_ms - a.timestamp_ms;
    });

    return {
      success: true,
      generated_at: new Date().toISOString(),
      filters: filter,
      summary: construirResumoDashboard_(sortedResponses, allResponses, filter),
      survey_options: construirOpcoesSurveyDashboard_(allResponses),
      language_options: construirOpcoesIdiomaDashboard_(allResponses),
      timeline: construirTimelineDashboard_(sortedResponses, filter.range),
      survey_breakdown: construirBreakdownSurveyDashboard_(sortedResponses),
      language_breakdown: construirBreakdownIdiomaDashboard_(sortedResponses),
      hourly_breakdown: construirBreakdownHorarioDashboard_(sortedResponses),
      weekday_breakdown: construirBreakdownSemanaDashboard_(sortedResponses),
      top_questions: construirInsightsPerguntasDashboard_(filteredAnswers),
      latest_responses: construirUltimasRespostasDashboard_(sortedResponses),
      spreadsheet_url: "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/edit"
    };
  } catch (error) {
    Logger.log("Erro em obterSurveyDashboard: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function obterDetalheRespostaSurvey(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    validarSessaoSurveyDashboard_(extrairTokenDashboard_(params));

    const responseId = sanitizeString(params.response_id);
    if (!responseId) {
      return { success: false, message: "response_id obrigatorio." };
    }

    const response = listarRegistrosSurvey_().filter(function(item) {
      return item.response_id === responseId;
    })[0];

    if (!response) {
      return { success: false, message: "Resposta nao encontrada." };
    }

    const answers = listarRegistrosRespostasSurvey_()
      .filter(function(item) {
        return item.response_id === responseId;
      })
      .sort(function(a, b) {
        return a.question_order - b.question_order;
      })
      .map(function(item) {
        return {
          question_order: item.question_order,
          question_key: item.question_key,
          question_label: item.question_label,
          question_type: item.question_type,
          answer_value: item.answer_value,
          answer_raw: item.answer_raw
        };
      });

    return {
      success: true,
      generated_at: new Date().toISOString(),
      response: response,
      answers: answers
    };
  } catch (error) {
    Logger.log("Erro em obterDetalheRespostaSurvey: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function obterSenhaSurveyDashboard_() {
  return sanitizeString(
    PropertiesService.getScriptProperties().getProperty(DASHBOARD_PASSWORD_PROPERTY)
  );
}

function extrairTokenDashboard_(params) {
  return sanitizeString(params && params.token);
}

function validarSessaoSurveyDashboard_(token) {
  const safeToken = sanitizeString(token);
  if (!safeToken) {
    throw new Error("Nao autorizado.");
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = DASHBOARD_SESSION_PREFIX + safeToken;
  const session = parseJsonSafe(cache.get(cacheKey));

  if (!session) {
    throw new Error("Sessao expirada ou invalida.");
  }

  cache.put(cacheKey, safeJsonStringify(session), DASHBOARD_SESSION_TTL_SECONDS);
  return session;
}

function listarRegistrosSurvey_() {
  const sheets = ensureSurveySheets();
  const sheet = sheets.responsesSheet;
  const lastRow = sheet.getLastRow();

  if (lastRow <= HEADER_ROW) {
    return [];
  }

  return sheet.getRange(
    HEADER_ROW + 1,
    1,
    lastRow - HEADER_ROW,
    SURVEY_RESPONSE_HEADERS.length
  ).getValues().filter(function(row) {
    return row[0];
  }).map(function(row) {
    const submittedAt = parseDateDashboard_(row[1]);
    const questionCount = Number(row[9]) || 0;
    const answeredCount = Number(row[10]) || 0;
    const completionRate = questionCount ? answeredCount / questionCount : 0;
    const answers = parseJsonSafe(row[16]) || {};

    return {
      response_id: sanitizeString(row[0]),
      submitted_at: submittedAt ? submittedAt.toISOString() : sanitizeString(row[1]),
      timestamp_ms: submittedAt ? submittedAt.getTime() : 0,
      survey_slug: sanitizeString(row[2]),
      survey_title: sanitizeString(row[3]),
      survey_niche: sanitizeString(row[4]),
      survey_version: sanitizeString(row[5]),
      source_file: sanitizeString(row[6]),
      source_url: sanitizeString(row[7]),
      language: sanitizeString(row[8]) || "pt",
      question_count: questionCount,
      answered_count: answeredCount,
      completion_rate: completionRate,
      primary_label: sanitizeString(row[11]),
      primary_value: sanitizeString(row[12]),
      contact_name: sanitizeString(row[13]),
      contact_email: sanitizeString(row[14]),
      contact_phone: sanitizeString(row[15]),
      answers: answers,
      search_text: [
        row[2], row[3], row[4], row[6], row[8],
        row[12], row[13], row[14], row[15]
      ].join(" ").toLowerCase()
    };
  });
}

function listarRegistrosRespostasSurvey_() {
  const sheets = ensureSurveySheets();
  const sheet = sheets.answersSheet;
  const lastRow = sheet.getLastRow();

  if (lastRow <= HEADER_ROW) {
    return [];
  }

  return sheet.getRange(
    HEADER_ROW + 1,
    1,
    lastRow - HEADER_ROW,
    SURVEY_ANSWER_HEADERS.length
  ).getValues().filter(function(row) {
    return row[0];
  }).map(function(row) {
    return {
      response_id: sanitizeString(row[0]),
      submitted_at: sanitizeString(row[1]),
      survey_slug: sanitizeString(row[2]),
      survey_title: sanitizeString(row[3]),
      survey_niche: sanitizeString(row[4]),
      survey_version: sanitizeString(row[5]),
      language: sanitizeString(row[6]) || "pt",
      question_order: Number(row[7]) || 0,
      question_key: sanitizeString(row[8]),
      question_label: sanitizeString(row[9]),
      question_type: sanitizeString(row[10]) || "text",
      answer_value: sanitizeString(row[11]),
      answer_raw: parseJsonSafe(row[12])
    };
  });
}

function normalizarFiltroDashboard_(params) {
  const allowedRanges = {
    "24h": true,
    "7d": true,
    "30d": true,
    "90d": true,
    "all": true
  };
  const range = sanitizeString(params && params.range) || "30d";

  return {
    range: allowedRanges[range] ? range : "30d",
    survey_slug: sanitizeString(params && (params.survey_slug || params.survey)),
    language: sanitizeString(params && params.language),
    search: sanitizeString(params && params.search).toLowerCase()
  };
}

function filtrarRegistrosDashboard_(responses, filter) {
  const rangeStart = obterInicioRangeDashboard_(filter.range);

  return (responses || []).filter(function(item) {
    if (filter.survey_slug && item.survey_slug !== filter.survey_slug) {
      return false;
    }
    if (filter.language && item.language !== filter.language) {
      return false;
    }
    if (filter.search && item.search_text.indexOf(filter.search) === -1) {
      return false;
    }
    if (rangeStart && item.timestamp_ms < rangeStart) {
      return false;
    }
    return true;
  });
}

function construirResumoDashboard_(filteredResponses, allResponses, filter) {
  const nowMs = new Date().getTime();
  const last24Hours = nowMs - (24 * 60 * 60 * 1000);
  const last7Days = nowMs - (7 * 24 * 60 * 60 * 1000);
  const totalResponses = filteredResponses.length;
  const totalCompletion = filteredResponses.reduce(function(acc, item) {
    return acc + item.completion_rate;
  }, 0);
  const totalAnswered = filteredResponses.reduce(function(acc, item) {
    return acc + item.answered_count;
  }, 0);
  const activeSurveys = criarMapaIds_(filteredResponses.map(function(item) {
    return item.survey_slug;
  }));
  const dateRangeInfo = obterInfoPeriodoAnteriorDashboard_(filter.range);
  const previousResponses = filtrarPeriodoAnteriorDashboard_(allResponses, filter, dateRangeInfo);
  const previousCount = previousResponses.length;
  const delta = totalResponses - previousCount;
  const deltaPercent = previousCount ? (delta / previousCount) * 100 : null;
  const todayCount = filteredResponses.filter(function(item) {
    return formatDateKeyDashboard_(item.timestamp_ms) === formatDateKeyDashboard_(nowMs);
  }).length;

  return {
    total_responses: totalResponses,
    last_24h: filteredResponses.filter(function(item) {
      return item.timestamp_ms >= last24Hours;
    }).length,
    last_7d: filteredResponses.filter(function(item) {
      return item.timestamp_ms >= last7Days;
    }).length,
    today: todayCount,
    active_surveys: Object.keys(activeSurveys).length,
    avg_completion_rate: totalResponses ? totalCompletion / totalResponses : 0,
    avg_answered_count: totalResponses ? totalAnswered / totalResponses : 0,
    latest_received_at: totalResponses ? filteredResponses.slice().sort(function(a, b) {
      return b.timestamp_ms - a.timestamp_ms;
    })[0].submitted_at : "",
    previous_period_count: previousCount,
    trend_delta: delta,
    trend_percent: deltaPercent
  };
}

function construirOpcoesSurveyDashboard_(responses) {
  const grouped = {};

  (responses || []).forEach(function(item) {
    if (!item.survey_slug) return;
    if (!grouped[item.survey_slug]) {
      grouped[item.survey_slug] = {
        survey_slug: item.survey_slug,
        survey_title: item.survey_title || item.survey_slug,
        survey_niche: item.survey_niche || "",
        count: 0
      };
    }
    grouped[item.survey_slug].count += 1;
  });

  return Object.keys(grouped).map(function(key) {
    return grouped[key];
  }).sort(function(a, b) {
    return b.count - a.count;
  });
}

function construirOpcoesIdiomaDashboard_(responses) {
  const grouped = {};

  (responses || []).forEach(function(item) {
    const language = item.language || "pt";
    if (!grouped[language]) {
      grouped[language] = {
        language: language,
        label: getLanguageLabel(language),
        count: 0
      };
    }
    grouped[language].count += 1;
  });

  return Object.keys(grouped).map(function(key) {
    return grouped[key];
  }).sort(function(a, b) {
    return b.count - a.count;
  });
}

function construirTimelineDashboard_(responses, range) {
  if (!responses.length) {
    return [];
  }

  const sorted = responses.slice().sort(function(a, b) {
    return a.timestamp_ms - b.timestamp_ms;
  });
  const minTime = sorted[0].timestamp_ms;
  const maxTime = sorted[sorted.length - 1].timestamp_ms;
  const spanDays = Math.max(1, Math.ceil((maxTime - minTime) / (24 * 60 * 60 * 1000)));
  const bucketByMonth = range === "all" && spanDays > 120;
  const grouped = {};

  sorted.forEach(function(item) {
    const bucketKey = bucketByMonth
      ? Utilities.formatDate(new Date(item.timestamp_ms), "America/Sao_Paulo", "yyyy-MM")
      : Utilities.formatDate(new Date(item.timestamp_ms), "America/Sao_Paulo", "yyyy-MM-dd");

    if (!grouped[bucketKey]) {
      grouped[bucketKey] = 0;
    }
    grouped[bucketKey] += 1;
  });

  return Object.keys(grouped).sort().map(function(key) {
    return {
      bucket: key,
      label: bucketByMonth
        ? Utilities.formatDate(new Date(key + "-01T00:00:00"), "America/Sao_Paulo", "MMM/yyyy")
        : Utilities.formatDate(new Date(key + "T00:00:00"), "America/Sao_Paulo", "dd/MM"),
      count: grouped[key]
    };
  });
}

function construirBreakdownSurveyDashboard_(responses) {
  const grouped = {};

  responses.forEach(function(item) {
    const key = item.survey_slug || "geral";
    if (!grouped[key]) {
      grouped[key] = {
        survey_slug: key,
        survey_title: item.survey_title || key,
        survey_niche: item.survey_niche || "",
        count: 0,
        completion_total: 0,
        latest_received_at: item.submitted_at,
        latest_timestamp_ms: item.timestamp_ms,
        languages: {}
      };
    }

    grouped[key].count += 1;
    grouped[key].completion_total += item.completion_rate;
    grouped[key].languages[item.language || "pt"] = true;

    if (item.timestamp_ms > grouped[key].latest_timestamp_ms) {
      grouped[key].latest_received_at = item.submitted_at;
      grouped[key].latest_timestamp_ms = item.timestamp_ms;
    }
  });

  return Object.keys(grouped).map(function(key) {
    return {
      survey_slug: grouped[key].survey_slug,
      survey_title: grouped[key].survey_title,
      survey_niche: grouped[key].survey_niche,
      count: grouped[key].count,
      avg_completion_rate: grouped[key].count ? grouped[key].completion_total / grouped[key].count : 0,
      latest_received_at: grouped[key].latest_received_at,
      languages: Object.keys(grouped[key].languages)
    };
  }).sort(function(a, b) {
    return b.count - a.count;
  });
}

function construirBreakdownIdiomaDashboard_(responses) {
  const grouped = {};

  responses.forEach(function(item) {
    const key = item.language || "pt";
    if (!grouped[key]) {
      grouped[key] = {
        language: key,
        label: getLanguageLabel(key),
        count: 0
      };
    }
    grouped[key].count += 1;
  });

  return Object.keys(grouped).map(function(key) {
    return grouped[key];
  }).sort(function(a, b) {
    return b.count - a.count;
  });
}

function construirBreakdownHorarioDashboard_(responses) {
  const buckets = [];
  let hour = 0;

  for (hour = 0; hour < 24; hour += 1) {
    buckets.push({
      hour: hour,
      label: ("0" + hour).slice(-2) + ":00",
      count: 0
    });
  }

  responses.forEach(function(item) {
    const date = new Date(item.timestamp_ms);
    const bucketHour = Number(Utilities.formatDate(date, "America/Sao_Paulo", "H"));
    if (buckets[bucketHour]) {
      buckets[bucketHour].count += 1;
    }
  });

  return buckets;
}

function construirBreakdownSemanaDashboard_(responses) {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const buckets = labels.map(function(label, index) {
    return {
      weekday: index,
      label: label,
      count: 0
    };
  });

  responses.forEach(function(item) {
    const date = new Date(item.timestamp_ms);
    const weekday = Number(Utilities.formatDate(date, "America/Sao_Paulo", "u")) % 7;
    buckets[weekday].count += 1;
  });

  return buckets;
}

function construirInsightsPerguntasDashboard_(answers) {
  const grouped = {};

  answers.forEach(function(item) {
    const groupKey = item.question_key || item.question_label;
    if (!groupKey) return;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        question_key: item.question_key,
        question_label: item.question_label || humanizeKey(item.question_key),
        question_type: item.question_type || "text",
        response_count: 0,
        answer_counts: {},
        sample_answers: []
      };
    }

    grouped[groupKey].response_count += 1;

    normalizarTokensRespostaDashboard_(item).forEach(function(token) {
      if (!grouped[groupKey].answer_counts[token]) {
        grouped[groupKey].answer_counts[token] = 0;
      }
      grouped[groupKey].answer_counts[token] += 1;
    });

    if (item.answer_value && item.answer_value.length <= 140 && grouped[groupKey].sample_answers.length < 3) {
      if (grouped[groupKey].sample_answers.indexOf(item.answer_value) === -1) {
        grouped[groupKey].sample_answers.push(item.answer_value);
      }
    }
  });

  return Object.keys(grouped).map(function(key) {
    const current = grouped[key];
    const topAnswers = Object.keys(current.answer_counts).map(function(answerKey) {
      return {
        label: answerKey,
        count: current.answer_counts[answerKey],
        percent: current.response_count ? current.answer_counts[answerKey] / current.response_count : 0
      };
    }).sort(function(a, b) {
      return b.count - a.count;
    }).slice(0, DASHBOARD_MAX_TOP_ANSWERS);

    return {
      question_key: current.question_key,
      question_label: current.question_label,
      question_type: current.question_type,
      response_count: current.response_count,
      distinct_answers: Object.keys(current.answer_counts).length,
      top_answers: topAnswers,
      sample_answers: current.sample_answers
    };
  }).sort(function(a, b) {
    return b.response_count - a.response_count;
  }).slice(0, DASHBOARD_MAX_TOP_QUESTIONS);
}

function construirUltimasRespostasDashboard_(responses) {
  return responses.slice(0, DASHBOARD_MAX_LATEST_RESPONSES).map(function(item) {
    return {
      response_id: item.response_id,
      submitted_at: item.submitted_at,
      survey_slug: item.survey_slug,
      survey_title: item.survey_title,
      survey_niche: item.survey_niche,
      language: item.language,
      primary_label: item.primary_label,
      primary_value: item.primary_value,
      contact_name: item.contact_name,
      contact_email: item.contact_email,
      contact_phone: item.contact_phone,
      answered_count: item.answered_count,
      question_count: item.question_count,
      completion_rate: item.completion_rate
    };
  });
}

function filtrarPeriodoAnteriorDashboard_(responses, filter, dateRangeInfo) {
  if (!dateRangeInfo) {
    return [];
  }

  return (responses || []).filter(function(item) {
    if (filter.survey_slug && item.survey_slug !== filter.survey_slug) {
      return false;
    }
    if (filter.language && item.language !== filter.language) {
      return false;
    }
    if (filter.search && item.search_text.indexOf(filter.search) === -1) {
      return false;
    }
    return item.timestamp_ms >= dateRangeInfo.previous_start && item.timestamp_ms < dateRangeInfo.previous_end;
  });
}

function obterInfoPeriodoAnteriorDashboard_(range) {
  const durations = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000
  };
  const duration = durations[range];
  if (!duration) {
    return null;
  }

  const nowMs = new Date().getTime();
  const currentStart = nowMs - duration;

  return {
    previous_start: currentStart - duration,
    previous_end: currentStart
  };
}

function obterInicioRangeDashboard_(range) {
  const nowMs = new Date().getTime();

  switch (range) {
    case "24h":
      return nowMs - (24 * 60 * 60 * 1000);
    case "7d":
      return nowMs - (7 * 24 * 60 * 60 * 1000);
    case "90d":
      return nowMs - (90 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
    case "30d":
    default:
      return nowMs - (30 * 24 * 60 * 60 * 1000);
  }
}

function parseDateDashboard_(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDateKeyDashboard_(value) {
  const date = parseDateDashboard_(value);
  if (!date) return "";
  return Utilities.formatDate(date, "America/Sao_Paulo", "yyyy-MM-dd");
}

function criarMapaIds_(values) {
  return (values || []).reduce(function(acc, value) {
    const key = sanitizeString(value);
    if (key) {
      acc[key] = true;
    }
    return acc;
  }, {});
}

function normalizarTokensRespostaDashboard_(item) {
  const raw = item && item.answer_raw;
  const answerValue = sanitizeString(item && item.answer_value);

  if (Array.isArray(raw)) {
    return raw.map(function(entry) {
      return sanitizeString(entry);
    }).filter(Boolean);
  }

  if (raw && typeof raw === "object") {
    const jsonValue = safeJsonStringify(raw);
    return jsonValue ? [truncateText(jsonValue, 80)] : [];
  }

  if (item && item.question_type === "multiselect" && answerValue.indexOf("|") !== -1) {
    return answerValue.split("|").map(function(entry) {
      return sanitizeString(entry);
    }).filter(Boolean);
  }

  if (!answerValue) {
    return [];
  }

  return [truncateText(answerValue, 80)];
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES - HOTELS (7 COLUNAS)
// ═══════════════════════════════════════════════════════════════════════════════

function obterHoteis() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_HOTELS);
    
    if (!sheet) {
      return { success: true, hotels: [], total: 0 };
    }
    
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= HEADER_ROW) {
      return { success: true, hotels: [], total: 0 };
    }
    
    const data = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, 7).getValues();
    
    const hotels = data.map((row, index) => ({
      id: index + 1,
      nome: row[0],
      endereco: row[1],
      telefone: row[2],
      site: row[3],
      classificacao: row[4],
      latitude: row[5],
      longitude: row[6]
    })).filter(h => h.nome && h.latitude && h.longitude);
    
    return {
      success: true,
      hotels: hotels,
      total: hotels.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log("Erro em obterHoteis: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function adicionarHotel(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_HOTELS);
    
    if (!sheet) {
      return { success: false, message: "Aba 'hotels' não encontrada" };
    }
    
    // Estrutura: Nome, Endereço, Telefone, Site, Classificação, Latitude, Longitude
    const newRow = [
      data.nome || '',
      data.endereco || '',
      data.telefone || '',
      data.site || '',
      data.classificacao || '',
      data.latitude || '',
      data.longitude || ''
    ];
    
    sheet.appendRow(newRow);
    
    return { success: true, message: "Hotel adicionado com sucesso!" };
    
  } catch (error) {
    Logger.log("Erro em adicionarHotel: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function addMultipleHotels(hotelsArray) {
  try {
    if (!Array.isArray(hotelsArray)) {
      return { success: false, message: "Dados inválidos: esperado um array" };
    }
    
    if (hotelsArray.length === 0) {
      return { success: false, message: "Nenhum hotel para adicionar" };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_HOTELS);
    
    if (!sheet) {
      return { success: false, message: "Aba 'hotels' não encontrada" };
    }
    
    let added = 0;
    let duplicates = 0;
    
    // Obter nomes existentes
    const lastRow = sheet.getLastRow();
    let existingNames = [];
    
    if (lastRow >= HEADER_ROW + 1) {
      const existingData = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, 1).getValues();
      existingNames = existingData.map(row => row[0].toString().toLowerCase().trim()).filter(n => n !== '');
    }
    
    // Preparar linhas para adicionar em batch
    const rowsToAdd = [];
    const addedNames = [];
    
    hotelsArray.forEach(hotel => {
      const nomeNorm = (hotel.nome || '').toLowerCase().trim();
      
      if (!nomeNorm || existingNames.includes(nomeNorm) || addedNames.includes(nomeNorm)) {
        duplicates++;
        return;
      }
      
      const newRow = [
        hotel.nome || '',
        hotel.endereco || '',
        hotel.telefone || '',
        hotel.site || '',
        hotel.classificacao || '',
        hotel.latitude || '',
        hotel.longitude || ''
      ];
      
      rowsToAdd.push(newRow);
      addedNames.push(nomeNorm);
      added++;
    });
    
    // Adicionar todas as linhas de uma vez (muito mais eficiente)
    if (rowsToAdd.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAdd.length, 7).setValues(rowsToAdd);
    }
    
    return {
      success: true,
      message: `${added} hotéis adicionados! ${duplicates > 0 ? `(${duplicates} duplicatas ignoradas)` : ''}`,
      results: {
        added: added,
        duplicates: duplicates,
        total: hotelsArray.length
      }
    };
    
  } catch (error) {
    Logger.log("Erro em addMultipleHotels: " + error.toString());
    return { success: false, message: error.toString() };
  }
}

function ensureDmsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_DMS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DMS);
  }
  const headerRange = sheet.getRange(DMS_HEADER_ROW, 1, 1, DM_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const needsSetup = currentHeaders.filter(Boolean).length !== DM_HEADERS.length;
  if (needsSetup) {
    headerRange.setValues([DM_HEADERS]);
    styleHeaderRange(headerRange);
  }
  return sheet;
}

function buildDmRow(data) {
  const row = [data.hotelName || ""];
  for (let i = 1; i <= 4; i++) {
    const info = data[`dm${i}`] || {};
    row.push(info.name || "");
    row.push(info.position || "");
    row.push(info.linkedin || "");
  }
  return row;
}

function salvarDMs(data) {
  try {
    if (!data || !data.hotelName) {
      return { success: false, message: 'hotelName obrigatório' };
    }
    const sheet = ensureDmsSheet();
    const row = buildDmRow(data);
    const lastRow = sheet.getLastRow();
    let targetRow = null;
    if (lastRow > DMS_HEADER_ROW) {
      const names = sheet.getRange(DMS_HEADER_ROW + 1, 1, lastRow - DMS_HEADER_ROW, 1).getValues();
      const index = names.findIndex(r => (r[0] || '').toString().toLowerCase() === data.hotelName.toLowerCase());
      if (index >= 0) {
        targetRow = DMS_HEADER_ROW + 1 + index;
      }
    }
    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    return { success: true, message: 'DMs salvos com sucesso!' };
  } catch (error) {
    Logger.log('Erro em salvarDMs: ' + error);
    return { success: false, message: error.toString() };
  }
}

function obterDMs() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_DMS);
    if (!sheet) {
      return { success: true, dms: [], total: 0 };
    }
    const lastRow = sheet.getLastRow();
    if (lastRow <= DMS_HEADER_ROW) {
      return { success: true, dms: [], total: 0 };
    }
    const values = sheet.getRange(DMS_HEADER_ROW + 1, 1, lastRow - DMS_HEADER_ROW, DM_HEADERS.length).getValues();
    const dms = values
      .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))
      .map(row => ({
        hotelName: row[0],
        dm1: { name: row[1], position: row[2], linkedin: row[3] },
        dm2: { name: row[4], position: row[5], linkedin: row[6] },
        dm3: { name: row[7], position: row[8], linkedin: row[9] },
        dm4: { name: row[10], position: row[11], linkedin: row[12] }
      }));
    return {
      success: true,
      dms: dms,
      total: dms.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log('Erro em obterDMs: ' + error);
    return { success: false, message: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function obterTodosDados() {
  const hotels = obterHoteis();
  const surveys = obterRespostasSurvey();
  const dms = obterDMs();
  
  return {
    success: true,
    hotels: hotels.hotels || [],
    surveys: surveys.surveys || [],
    dms: dms.dms || [],
    totals: {
      hotels: hotels.total || 0,
      surveys: surveys.total || 0,
      dms: dms.total || 0
    },
    timestamp: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE TESTE
// ═══════════════════════════════════════════════════════════════════════════════

function testarNotificacao() {
  enviarEmailNotificacao({
    responseId: Utilities.getUuid(),
    submittedAt: new Date().toISOString(),
    language: "pt",
    survey: {
      title: "F91 - Soluções Operacionais: Hotelaria",
      niche: "Hotelaria"
    },
    primaryLabel: "Nome do hotel ou rede hoteleira",
    primaryValue: "Hotel Aurora",
    contactName: "Joana Silva",
    contactEmail: "joana@hotelaurora.com",
    contactPhone: "+55 11 99999-9999",
    answeredItems: [
      {
        questionLabel: "Nome do hotel ou rede hoteleira",
        answerValue: "Hotel Aurora"
      },
      {
        questionLabel: "Cidade / Estado",
        answerValue: "São Paulo, SP"
      },
      {
        questionLabel: "Categoria do hotel",
        answerValue: "Midscale"
      }
    ]
  });
  Logger.log("E-mail de teste enviado!");
}

function testarBuscarHoteis() {
  const result = obterHoteis();
  Logger.log("Total de hotéis: " + result.total);
  Logger.log(JSON.stringify(result, null, 2));
}

function testarBuscarSurveys() {
  const result = obterRespostasSurvey();
  Logger.log("Total de surveys: " + result.total);
  Logger.log(JSON.stringify(result, null, 2));
}

function testarAdicionarHotel() {
  const hotelTeste = {
    nome: "Hotel Teste API",
    endereco: "Av. Paulista, 1000",
    telefone: "(11) 1234-5678",
    site: "https://hotelteste.com",
    classificacao: "4.5",
    latitude: "-23.5505",
    longitude: "-46.6333"
  };
  
  const result = adicionarHotel(hotelTeste);
  Logger.log(JSON.stringify(result, null, 2));
}

function testarAdicionarMultiplos() {
  const hoteisTest = [
    {
      nome: "Hotel Batch 1",
      endereco: "Rua Teste 1",
      site: "https://hotel1.com",
      classificacao: "4.0",
      latitude: "-23.5505",
      longitude: "-46.6333"
    },
    {
      nome: "Hotel Batch 2",
      endereco: "Rua Teste 2",
      site: "https://hotel2.com",
      classificacao: "4.5",
      latitude: "-23.5606",
      longitude: "-46.6444"
    }
  ];
  
  const result = addMultipleHotels(hoteisTest);
  Logger.log(JSON.stringify(result, null, 2));
}
