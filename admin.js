import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================================
// CONFIGURAÇÃO
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyCmep_wIOuM3TF4yTUIaoU83oSTFydI8Ig",
  authDomain: "condominiomaui-5ecd0.firebaseapp.com",
  projectId: "condominiomaui-5ecd0",
  storageBucket: "condominiomaui-5ecd0.firebasestorage.app",
  messagingSenderId: "298051508693",
  appId: "1:298051508693:web:cc5af84aaceb7856e7055c"
};

const ADMIN_EMAIL =
  "rodrigokamunga@gmail.com";

const EMAIL_DESTINO =
  "rodrigokamunga@gmail.com";

const WHATSAPP_NUMERO =
  "5511999999999";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// VARIÁVEIS
// =====================================================

const $ = (id) =>
  document.getElementById(id);

let reports = [];
let unsubscribeReports = null;
let currentPage = 1;
let statusChart = null;

const pageSize = 10;


// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function show(id) {
  const element = $(id);

  if (element) {
    element.classList.remove("hidden");
  }
}

function hide(id) {
  const element = $(id);

  if (element) {
    element.classList.add("hidden");
  }
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}

function formatDate(value) {
  if (!value) {
    return "Não informada";
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value
      .toDate()
      .toLocaleString("pt-BR");
  }

  if (value instanceof Date) {
    return value.toLocaleString("pt-BR");
  }

  return "Não informada";
}

function getDateObject(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function getOpeningDate(report) {
  return (
    report.dataAbertura ||
    report.inicioEm ||
    report.criadoEm
  );
}

function getResolvedDate(report) {
  return (
    report.dataResolvido ||
    report.fimEm
  );
}

function statusClass(status) {
  if (status === "Resolvido") {
    return "done";
  }

  if (
    status === "Em análise" ||
    status === "Em execução"
  ) {
    return "progress";
  }

  return "open";
}

function showMessage( text, success = false ) {
  const element =
    $("adminMessage");

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = success
    ? "message success"
    : "message";
}

function showEditMessage( text, success = false ) {
  const element =
    $("adminEditMessage");

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = success
    ? "message success"
    : "message";
}

function toast(text) {
  const element =
    $("adminToast");

  if (!element) {
    alert(text);
    return;
  }

  element.textContent = text;
  element.classList.add("show");

  setTimeout(() => {
    element.classList.remove("show");
  }, 3500);
}

function friendlyError(error) {
  console.error(
    "Erro completo:",
    error
  );

  if (
    error?.code ===
    "permission-denied"
  ) {
    return "Permissão negada pelas regras do Firebase.";
  }

  if (
    error?.code ===
    "failed-precondition"
  ) {
    return "O Firebase solicitou a criação de um índice.";
  }

  return error?.message ||
    "Não foi possível concluir a operação.";
}

function countStatus( status, source = reports ) {
  return source.filter(
    (report) =>
      (report.status || "Aberto") ===
      status
  ).length;
}

function formatInputDate(value) {
  if (!value) {
    return "Não informada";
  }

  const parts =
    value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// =====================================================
// FILTROS
// =====================================================

function getFilteredReports() {
  const selectedStatus =
    $("adminStatusFilter")?.value ||
    "Todos";

  const startDate =
    $("adminStartDate")?.value ||
    "";

  const endDate =
    $("adminEndDate")?.value ||
    "";

  const startDateObject =
    startDate
      ? new Date(`${startDate}T00:00:00`)
      : null;

  const endDateObject =
    endDate
      ? new Date(`${endDate}T23:59:59`)
      : null;

  return reports.filter((report) => {
    const status =
      report.status || "Aberto";

    const statusMatches =
      selectedStatus === "Todos" ||
      status === selectedStatus;

    const reportDate =
      getDateObject(
        getOpeningDate(report)
      );

    let dateMatches = true;

    if (startDateObject) {
      dateMatches =
        dateMatches &&
        reportDate !== null &&
        reportDate >= startDateObject;
    }

    if (endDateObject) {
      dateMatches =
        dateMatches &&
        reportDate !== null &&
        reportDate <= endDateObject;
    }

    return statusMatches &&
      dateMatches;
  });
}

function updateFilterSummary() {
  const status =
    $("adminStatusFilter")?.value ||
    "Todos";

  const start =
    $("adminStartDate")?.value ||
    "";

  const end =
    $("adminEndDate")?.value ||
    "";

  const statusElement =
    $("pdfSelectedStatus");

  const periodElement =
    $("pdfSelectedPeriod");

  if (statusElement) {
    statusElement.textContent =
      status;
  }

  if (periodElement) {
    if (start && end) {
      periodElement.textContent =
        `${formatInputDate(start)} até ${formatInputDate(end)}`;
    } else if (start) {
      periodElement.textContent =
        `A partir de ${formatInputDate(start)}`;
    } else if (end) {
      periodElement.textContent =
        `Até ${formatInputDate(end)}`;
    } else {
      periodElement.textContent =
        "Todas as datas";
    }
  }
}


// =====================================================
// CONTADORES
// =====================================================

function updateCounters() {
  const total =
    $("adminTotal");

  const open =
    $("adminOpen");

  const analysis =
    $("adminAnalysis");

  const execution =
    $("adminExecution");

  const resolved =
    $("adminResolved");

  if (total) {
    total.textContent =
      reports.length;
  }

  if (open) {
    open.textContent =
      countStatus("Aberto");
  }

  if (analysis) {
    analysis.textContent =
      countStatus("Em análise");
  }

  if (execution) {
    execution.textContent =
      countStatus("Em execução");
  }

  if (resolved) {
    resolved.textContent =
      countStatus("Resolvido");
  }
}


// =====================================================
// GRÁFICO
// =====================================================

function updateChart() {
  const canvas =
    $("statusChart");

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  if (statusChart) {
    statusChart.destroy();
  }

  statusChart = new Chart(
    canvas,
    {
      type: "pie",

      data: {
        labels: [
          "Aberto",
          "Em análise",
          "Em execução",
          "Resolvido"
        ],

        datasets: [
          {
            data: [
              countStatus("Aberto"),
              countStatus("Em análise"),
              countStatus("Em execução"),
              countStatus("Resolvido")
            ],

            backgroundColor: [
              "#60a5fa",
              "#fbbf24",
              "#fb923c",
              "#4ade80"
            ],

            borderColor: "#ffffff",
            borderWidth: 3
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    }
  );
}


// =====================================================
// LISTAGEM
// =====================================================

function renderReports() {
  const list =
    $("adminReportsList");

  if (!list) {
    return;
  }

  const filteredReports =
    getFilteredReports();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredReports.length /
        pageSize
      )
    );

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start =
    (currentPage - 1) *
    pageSize;

  const visibleReports =
    filteredReports.slice(
      start,
      start + pageSize
    );

  if (visibleReports.length === 0) {
    list.innerHTML = ` <div class="empty-state"> Nenhuma ocorrência encontrada. </div> `;
  } else {
    list.innerHTML =
      visibleReports
        .map((report) => {
          const status =
            report.status || "Aberto";

          return ` <article class="report-item admin-report-item" > <div class="admin-report-header" > <div class="report-title"> ${escapeHtml( report.titulo || "Sem título" )} </div> <span class="badge admin-report-status ${statusClass(status)}" > ${escapeHtml(status)} </span> </div> <div class="admin-report-main" > <div class="report-meta"> Protocolo: ${escapeHtml( report.protocolo || "Não informado" )} </div> <div class="report-meta"> Morador: ${escapeHtml( report.nome || "Não informado" )} </div> <div class="report-meta"> Unidade: ${escapeHtml( report.unidade || "Não informada" )} </div> <div class="report-meta"> Categoria: ${escapeHtml( report.categoria || "Não informada" )} </div> <div class="report-meta"> Início: ${formatDate( getOpeningDate(report) )} </div> ${ getResolvedDate(report) ? ` <div class="report-meta"> Fim: ${formatDate( getResolvedDate(report) )} </div> ` : "" } </div> <div class="admin-report-actions" > <button class="action-icon-button detail-button" data-id="${report.id}" type="button" title="Detalhar" aria-label="Detalhar ocorrência" > 🔍 </button> <button class="action-icon-button timeline-button" data-id="${report.id}" type="button" title="Linha do tempo" aria-label="Linha do tempo" > 🕒 </button> <button class="action-icon-button edit-button" data-id="${report.id}" type="button" title="Editar" aria-label="Editar ocorrência" > ✏️ </button> <button class="action-icon-button whatsapp-button" data-id="${report.id}" type="button" title="Enviar pelo WhatsApp" aria-label="Enviar pelo WhatsApp" > 💬 </button> <button class="action-icon-button email-button" data-id="${report.id}" type="button" title="Enviar por e-mail" aria-label="Enviar por e-mail" > ✉️ </button> <button class="action-icon-button admin-danger delete-button" data-id="${report.id}" type="button" title="Excluir" aria-label="Excluir ocorrência" > 🗑️ </button> </div> </article> `;
        })
        .join("");
  }

  renderPagination(
    filteredReports.length,
    totalPages
  );

  updateCounters();
  updateChart();
}

function renderPagination( totalItems, totalPages ) {
  const pagination =
    $("adminPagination");

  if (!pagination) {
    return;
  }

  if (totalItems === 0) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = ` <button id="adminPrevPage" class="secondary-button" type="button" ${currentPage <= 1 ? "disabled" : ""} > Anterior </button> <span> Página ${currentPage} de ${totalPages} </span> <button id="adminNextPage" class="secondary-button" type="button" ${currentPage >= totalPages ? "disabled" : ""} > Próxima </button> `;
}


// =====================================================
// DETALHAMENTO

function openDetails(reportId) {
  const report =
    reports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  const content =
    $("adminDetailContent");

  if (!content) {
    return;
  }

  const status =
    report.status || "Aberto";

  content.innerHTML = ` <span class="eyebrow"> DETALHAMENTO ADMINISTRATIVO </span> <h2> ${escapeHtml( report.titulo || "Sem título" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <p> <b>Status:</b> <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </p> <p> <b>Morador:</b> ${escapeHtml( report.nome || "Não informado" )} </p> <p> <b>E-mail:</b> ${escapeHtml( report.email || "Não informado" )} </p> <p> <b>Unidade:</b> ${escapeHtml( report.unidade || "Não informada" )} </p> <p> <b>Bloco:</b> ${escapeHtml( report.bloco || "Não informado" )} </p> <p> <b>Categoria:</b> ${escapeHtml( report.categoria || "Não informada" )} </p> <p> <b>Prioridade:</b> ${escapeHtml( report.prioridade || "Não informada" )} </p> <p> <b>Local:</b> ${escapeHtml( report.local || "Não informado" )} </p> <p> <b>Referência:</b> ${escapeHtml( report.referenciaLocal || "Não informada" )} </p> <p> <b>Data de abertura:</b> ${formatDate( getOpeningDate(report) )} </p> <p> <b>Data em análise:</b> ${formatDate( report.dataAnalise )} </p> <p> <b>Data em execução:</b> ${formatDate( report.dataExecucao )} </p> <p> <b>Data de resolução:</b> ${formatDate( getResolvedDate(report) )} </p> <p> <b>Descrição:</b><br> ${escapeHtml( report.descricao || "Sem descrição" )} </p> ${ report.fotoData ? ` <div class="report-photo-container" > <img class="detail-photo" src="${report.fotoData}" alt="Foto da ocorrência" /> </div> ` : "" } `;

  show("adminDetailModal");
}


// =====================================================
// LINHA DO TEMPO


function openTimeline(reportId) {
  const report =
    reports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  const modal =
    getOrCreateTimelineModal();

  const content =
    modal.querySelector(
      "#adminTimelineContent"
    );

  if (!content) {
    return;
  }

  const abertura =
    getOpeningDate(report);

  const analise =
    report.dataAnalise;

  const execucao =
    report.dataExecucao;

  const resolvido =
    getResolvedDate(report);

  content.innerHTML = ` <span class="eyebrow"> LINHA DO TEMPO </span> <h2> ${escapeHtml( report.titulo || "Ocorrência" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <div class="timeline"> <div class="timeline-item completed"> <div class="timeline-dot">1</div> <div class="timeline-content"> <strong>Abertura</strong> <span> ${formatDate(abertura)} </span> <small> ${ analise ? `Aberta por ${daysBetween( abertura, analise )}` : `Aberta há ${daysBetween( abertura )}` } </small> </div> </div> <div class="timeline-item ${analise ? "completed" : "pending"}" > <div class="timeline-dot">2</div> <div class="timeline-content"> <strong>Em análise</strong> <span> ${formatDate(analise)} </span> <small> ${ analise ? execucao ? `Em análise por ${daysBetween( analise, execucao )}` : resolvido ? `Em análise por ${daysBetween( analise, resolvido )}` : `Em análise há ${daysBetween( analise )}` : "Ainda não entrou em análise" } </small> </div> </div> <div class="timeline-item ${execucao ? "completed" : "pending"}" > <div class="timeline-dot">3</div> <div class="timeline-content"> <strong>Em execução</strong> <span> ${formatDate(execucao)} </span> <small> ${ execucao ? resolvido ? `Em execução por ${daysBetween( execucao, resolvido )}` : `Em execução há ${daysBetween( execucao )}` : "Ainda não entrou em execução" } </small> </div> </div> <div class="timeline-item ${resolvido ? "completed" : "pending"}" > <div class="timeline-dot">4</div> <div class="timeline-content"> <strong>Resolvido</strong> <span> ${formatDate(resolvido)} </span> <small> ${ resolvido ? "Ocorrência finalizada" : "Ainda não resolvido" } </small> </div> </div> </div> `;

  show("adminTimelineModal");
}

function getOrCreateTimelineModal() {
  let modal =
    $("adminTimelineModal");

  if (modal) {
    return modal;
  }

  modal =
    document.createElement("div");

  modal.id =
    "adminTimelineModal";

  modal.className =
    "modal hidden";

  modal.innerHTML = ` <div class="modal-card"> <button id="btnCloseAdminTimeline" class="modal-close" type="button" aria-label="Fechar linha do tempo" > × </button> <div id="adminTimelineContent" ></div> </div> `;

  document.body.appendChild(modal);

  modal.querySelector(
    "#btnCloseAdminTimeline"
  )?.addEventListener(
    "click",
    () => hide("adminTimelineModal")
  );

  modal.addEventListener(
    "click",
    (event) => {
      if (
        event.target.id ===
        "adminTimelineModal"
      ) {
        hide("adminTimelineModal");
      }
    }
  );

  return modal;
}


// =====================================================
// WHATSAPP
// =====================================================

function sendWhatsApp(reportId) {
  const report =
    reports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  const text = [
    `Título: ${report.titulo || "Não informado"}`,
    `Local: ${report.local || "Não informado"}`,
    `Referência: ${report.referenciaLocal || "Não informada"}`,
    `Descrição da ocorrência: ${report.descricao || "Não informada"}`,
    `Morador: ${report.nome || "Não informado"}`,
    `Unidade: ${report.unidade || "Não informada"}`,
    `Bloco: ${report.bloco || "Não informado"}`
  ].join("\n");

  const url =
    `https://wa.me/${WHATSAPP_NUMERO}` +
    `?text=${encodeURIComponent(text)}`;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}


// =====================================================
// E-MAIL
// =====================================================

function sendEmail(reportId) {
  const report =
    reports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  const subject =
    report.titulo ||
    "Ocorrência do condomínio";

  const body = [
    "Prezados,",
    "",
    "Venho, por meio deste, comunicar uma ocorrência no condomínio.",
    "",
    `Data e horário: ${formatDate( getOpeningDate(report) )}`,
    `Local: ${report.local || "Não informado"}`,
    `Descrição da ocorrência: ${ report.descricao || "Não informada" }`,
    "",
    "Solicito, por gentileza, que a administração verifique a situação e tome as providências cabíveis, conforme as normas do condomínio. Caso necessário, coloco-me à disposição para fornecer informações adicionais.",
    "",
    "Agradeço a atenção.",
    "",
    "Atenciosamente,",
    "",
    report.nome || "Nome não informado",
    `Bloco ${report.bloco || "Não informado"} / Apartamento ${report.unidade || "Não informado"}`
  ].join("\r\n");

  const mailto =
    `mailto:${EMAIL_DESTINO}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href =
    mailto;
}


// =====================================================
// EDIÇÃO
// =====================================================

function addEditCategoryOptions() {
  const category =
    $("adminEditCategory");

  if (!category) {
    return;
  }

  [
    "Documentação",
    "Jardinagem"
  ].forEach((value) => {
    const exists =
      Array.from(category.options)
        .some(
          (option) =>
            option.value === value
        );

    if (!exists) {
      const option =
        document.createElement("option");

      option.value = value;
      option.textContent = value;

      category.appendChild(option);
    }
  });
}

function updateEditLocationFields() {
  const category =
    $("adminEditCategory")?.value ||
    "";

  const noLocationRequired =
    category === "Documentação" ||
    category === "Jardinagem";

  const noReferenceRequired =
    category === "Documentação";

  const location =
    $("adminEditLocation");

  const reference =
    $("adminEditReference");

  if (location) {
    location.disabled =
      noLocationRequired;

    if (noLocationRequired) {
      location.value = "";
    }
  }

  if (reference) {
    reference.disabled =
      noReferenceRequired;

    if (noReferenceRequired) {
      reference.value = "";
    }
  }
}

function openEditModal(reportId) {
  const report =
    reports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  addEditCategoryOptions();

  $("adminEditReportId").value =
    report.id;

  $("adminEditTitle").value =
    report.titulo || "";

  $("adminEditCategory").value =
    report.categoria || "";

  $("adminEditPriority").value =
    report.prioridade || "Normal";

  $("adminEditLocation").value =
    report.local || "";

  $("adminEditReference").value =
    report.referenciaLocal || "";

  $("adminEditDescription").value =
    report.descricao || "";

  $("adminEditStatus").value =
    report.status || "Aberto";

  updateEditLocationFields();
  showEditMessage("");
  show("adminEditModal");
}


// SALVAR EDIÇÃO
$("adminEditForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const reportId =
      $("adminEditReportId")?.value;

    const report =
      reports.find(
        (item) => item.id === reportId
      );

    if (!report) {
      showEditMessage(
        "Ocorrência não encontrada."
      );
      return;
    }

    const title =
      $("adminEditTitle")?.value.trim();

    const category =
      $("adminEditCategory")?.value;

    const priority =
      $("adminEditPriority")?.value ||
      "Normal";

    const description =
      $("adminEditDescription")?.value.trim();

    const status =
      $("adminEditStatus")?.value ||
      "Aberto";

    const noLocationRequired =
      category === "Documentação" ||
      category === "Jardinagem";

    const location =
      noLocationRequired
        ? ""
        : $("adminEditLocation")?.value ||
          "";

    const reference =
      category === "Documentação"
        ? ""
        : $("adminEditReference")?.value.trim() ||
          "";

    if (!title || title.length < 3) {
      showEditMessage(
        "Informe um título válido."
      );
      return;
    }

    if (!description || description.length < 10) {
      showEditMessage(
        "A descrição deve ter pelo menos 10 caracteres."
      );
      return;
    }

    if (
      !noLocationRequired &&
      !location
    ) {
      showEditMessage(
        "Informe o local da ocorrência."
      );
      return;
    }

    const saveButton =
      $("btnSaveAdminEdit");

    if (saveButton) {
      saveButton.disabled = true;
    }

    try {
      const updateData = {
        titulo: title,
        categoria: category,
        prioridade: priority,
        local,
        referenciaLocal: reference,
        descricao: description,
        status,
        atualizadoEm:
          serverTimestamp()
      };

      if (
        status === "Em análise" &&
        !report.dataAnalise
      ) {
        updateData.dataAnalise =
          serverTimestamp();
      }

      if (
        status === "Em execução" &&
        !report.dataExecucao
      ) {
        updateData.dataExecucao =
          serverTimestamp();
      }

      if (
        status === "Resolvido" &&
        !report.dataResolvido
      ) {
        updateData.dataResolvido =
          serverTimestamp();
      }

      if (
        status === "Resolvido" &&
        !report.fimEm
      ) {
        updateData.fimEm =
          serverTimestamp();
      }

      await updateDoc(
        doc(db, "reports", reportId),
        updateData
      );

      hide("adminEditModal");

      toast(
        "Ocorrência atualizada com sucesso."
      );
    } catch (error) {
      showEditMessage(
        friendlyError(error)
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
      }
    }
  }
);

$("adminEditCategory")?.addEventListener(
  "change",
  updateEditLocationFields
);


// =====================================================
// EXCLUSÃO
// =====================================================

async function deleteReport(reportId) {
  const report =
    reports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    alert(
      "Ocorrência não encontrada."
    );
    return;
  }

  const confirmed = confirm(
    `Deseja excluir a ocorrência "${report.titulo}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(
      doc(db, "reports", reportId)
    );

    toast(
      "Ocorrência excluída com sucesso."
    );
  } catch (error) {
    console.error(
      "Erro ao excluir ocorrência:",
      error
    );

    alert(
      friendlyError(error)
    );
  }
}


// =====================================================
// FILTROS DE DATA E SITUAÇÃO
// =====================================================

$("adminStatusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    updateFilterSummary();
    renderReports();
  }
);

$("adminStartDate")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    updateFilterSummary();
    renderReports();
  }
);

$("adminEndDate")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    updateFilterSummary();
    renderReports();
  }
);

$("btnClearAdminFilters")?.addEventListener(
  "click",
  () => {
    if ($("adminStatusFilter")) {
      $("adminStatusFilter").value =
        "Todos";
    }

    if ($("adminStartDate")) {
      $("adminStartDate").value = "";
    }

    if ($("adminEndDate")) {
      $("adminEndDate").value = "";
    }

    currentPage = 1;
    updateFilterSummary();
    renderReports();

    toast(
      "Filtros limpos."
    );
  }
);


// =====================================================
// PDF
// =====================================================

function generatePdf() {
  if (
    typeof window.jspdf ===
      "undefined" ||
    typeof window.jspdf.jsPDF ===
      "undefined"
  ) {
    alert(
      "A biblioteca PDF não foi carregada. Verifique sua conexão e atualize a página."
    );
    return;
  }

  const filteredReports =
    getFilteredReports();

  if (filteredReports.length === 0) {
    alert(
      "Nenhuma ocorrência encontrada para os filtros selecionados."
    );
    return;
  }

  const { jsPDF } =
    window.jspdf;

  const pdf =
    new jsPDF();

  const marginLeft = 14;
  const pageWidth = 180;
  const pageHeight = 280;
  const lineHeight = 6;

  let y = 18;

  function checkPage( requiredHeight = 10 ) {
    if (
      y + requiredHeight >
      pageHeight
    ) {
      pdf.addPage();
      y = 18;
    }
  }

  function addText( text, fontSize = 10, bold = false ) {
    checkPage(12);

    pdf.setFontSize(fontSize);
    pdf.setFont(
      "helvetica",
      bold ? "bold" : "normal"
    );

    const lines =
      pdf.splitTextToSize(
        String(text),
        pageWidth
      );

    pdf.text(
      lines,
      marginLeft,
      y
    );

    y +=
      lines.length *
      lineHeight;
  }

  const selectedStatus =
    $("adminStatusFilter")?.value ||
    "Todos";

  const startDate =
    $("adminStartDate")?.value ||
    "";

  const endDate =
    $("adminEndDate")?.value ||
    "";

  pdf.setFontSize(18);
  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.text(
    "Relatório de Ocorrências",
    marginLeft,
    y
  );

  y += 9;

  pdf.setFontSize(10);
  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.text(
    "Condomínio Amigos do Maui",
    marginLeft,
    y
  );

  y += lineHeight;

  pdf.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    marginLeft,
    y
  );

  y += 10;

  addText(
    `Situação: ${selectedStatus}`,
    10,
    true
  );

  addText(
    `Data inicial: ${ startDate ? formatInputDate(startDate) : "Todas" }`
  );

  addText(
    `Data final: ${ endDate ? formatInputDate(endDate) : "Todas" }`
  );

  addText(
    `Total de registros: ${filteredReports.length}`,
    11,
    true
  );

  y += 5;

  filteredReports.forEach(
    (report, index) => {
      checkPage(55);

      pdf.setDrawColor(
        210,
        210,
        210
      );

      pdf.line(
        marginLeft,
        y,
        196,
        y
      );

      y += 7;

      addText(
        `${index + 1}. ${ report.titulo || "Sem título" }`,
        11,
        true
      );

      addText(
        `Protocolo: ${ report.protocolo || "Não informado" }`
      );

      addText(
        `Status: ${ report.status || "Aberto" }`
      );

      addText(
        `Morador: ${ report.nome || "Não informado" }`
      );

      addText(
        `Unidade: ${ report.unidade || "Não informada" }`
      );

      addText(
        `Categoria: ${ report.categoria || "Não informada" }`
      );

      addText(
        `Prioridade: ${ report.prioridade || "Não informada" }`
      );

      addText(
        `Local: ${ report.local || "Não informado" }`
      );

      addText(
        `Data de abertura: ${formatDate( getOpeningDate(report) )}`
      );

      addText(
        `Data em análise: ${formatDate( report.dataAnalise )}`
      );

      addText(
        `Data em execução: ${formatDate( report.dataExecucao )}`
      );

      addText(
        `Data de resolução: ${formatDate( getResolvedDate(report) )}`
      );

      addText(
        `Descrição: ${ report.descricao || "Sem descrição" }`
      );

      y += 4;
    }
  );

  const fileName =
    `relatorio-ocorrencias-${new Date() .toISOString() .slice(0, 10)}.pdf`;

  pdf.save(fileName);

  showMessage(
    "PDF gerado com sucesso.",
    true
  );
}

$("btnGeneratePdf")?.addEventListener(
  "click",
  generatePdf
);

$("btnRefreshAdmin")?.addEventListener(
  "click",
  () => {
    currentPage = 1;
    updateFilterSummary();
    renderReports();
    toast(
      "Dados atualizados."
    );
  }
);


// =====================================================
// LOGOUT
// =====================================================

$("btnAdminLogout")?.addEventListener(
  "click",
  async () => {
    const confirmed = confirm(
      "Deseja realmente sair da área administrativa?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await signOut(auth);
      window.location.href =
        "./admin-home.html";
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );

      alert(
        "Não foi possível sair do sistema."
      );
    }
  }
);


// =====================================================
// AUTENTICAÇÃO E CARREGAMENTO
// =====================================================

onAuthStateChanged(
  auth,
  (user) => {
    hide("adminLoadingView");

    if (!user) {
      show("adminDeniedView");
      hide("adminView");
      return;
    }

    if (
      user.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      show("adminDeniedView");
      hide("adminView");
      return;
    }

    hide("adminDeniedView");
    show("adminView");

    const adminName =
      $("adminUserName");

    if (adminName) {
      adminName.textContent =
        user.displayName ||
        user.email ||
        "Administrador";
    }

    updateFilterSummary();

    const reportsQuery =
      query(
        collection(db, "reports"),
        orderBy(
          "criadoEm",
          "desc"
        )
      );

    if (unsubscribeReports) {
      unsubscribeReports();
    }

    unsubscribeReports =
      onSnapshot(
        reportsQuery,
        (snapshot) => {
          reports =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data()
              })
            );

          currentPage = 1;

          updateFilterSummary();
          renderReports();
        },
        (error) => {
          console.error(
            "Erro ao carregar ocorrências:",
            error
          );

          const list =
            $("adminReportsList");

          if (list) {
            list.innerHTML = ` <div class="empty-state"> ${escapeHtml( friendlyError(error) )} </div> `;
          }

          showMessage(
            friendlyError(error)
          );
        }
      );
  }
);
