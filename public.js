import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

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
  onSnapshot
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


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// VARIÁVEIS
// =====================================================

const $ = (id) =>
  document.getElementById(id);

let unsubscribeReports = null;
let reports = [];
let currentPage = 1;
let publicStatusChart = null;

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

function friendlyError(error) {
  console.error(
    "Erro completo:",
    error
  );

  if (
    error?.code ===
    "permission-denied"
  ) {
    return "Você não tem permissão para consultar as ocorrências.";
  }

  if (
    error?.code ===
    "failed-precondition"
  ) {
    return "O Firebase solicitou a criação de um índice.";
  }

  return error?.message ||
    "Não foi possível carregar as ocorrências.";
}

function getOpeningDate(report) {
  return report.dataAbertura ||
    report.inicioEm ||
    report.criadoEm;
}

function getResolvedDate(report) {
  return report.dataResolvido ||
    report.fimEm;
}

function calculateDays( startValue, endValue = null ) {
  const start =
    getDateObject(startValue);

  if (!start) {
    return "Não informado";
  }

  const end =
    getDateObject(endValue) ||
    new Date();

  const difference =
    end.getTime() -
    start.getTime();

  const days = Math.floor(
    difference /
      (1000 * 60 * 60 * 24)
  );

  if (days <= 0) {
    return "menos de 1 dia";
  }

  return `${days} dia${days === 1 ? "" : "s"}`;
}


// =====================================================
// FILTRO
// =====================================================

function getFilteredReports() {
  const filter =
    $("publicStatusFilter")?.value ||
    "Todos";

  if (filter === "Todos") {
    return reports;
  }

  return reports.filter(
    (report) =>
      (report.status || "Aberto") ===
      filter
  );
}


// =====================================================
// INDICADORES
// =====================================================

function updatePublicCounters() {
  const countStatus = (status) =>
    reports.filter(
      (report) =>
        (report.status || "Aberto") ===
        status
    ).length;

  const total = $("publicTotal");
  const open = $("publicOpen");
  const analysis = $("publicAnalysis");
  const execution = $("publicExecution");
  const resolved = $("publicResolved");

  if (total) {
    total.textContent = reports.length;
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

function updatePublicChart() {
  const canvas =
    $("publicStatusChart");

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  const values = [
    reports.filter(
      (report) =>
        (report.status || "Aberto") ===
        "Aberto"
    ).length,

    reports.filter(
      (report) =>
        (report.status || "Aberto") ===
        "Em análise"
    ).length,

    reports.filter(
      (report) =>
        (report.status || "Aberto") ===
        "Em execução"
    ).length,

    reports.filter(
      (report) =>
        (report.status || "Aberto") ===
        "Resolvido"
    ).length
  ];

  if (publicStatusChart) {
    publicStatusChart.destroy();
  }

  publicStatusChart = new Chart(
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
            data: values,

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
// LISTAGEM PÚBLICA
// =====================================================

function renderReports() {
  updatePublicCounters();
  updatePublicChart();

  const list =
    $("publicReportsList");

  if (!list) {
    return;
  }

  const filteredReports =
    getFilteredReports();

  const totalPages = Math.max(
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
    (currentPage - 1) * pageSize;

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

          return ` <article class="report-item public-report"> <div> <div class="report-title"> ${escapeHtml( report.titulo || "Sem título" )} </div> <div class="report-meta"> Protocolo: ${escapeHtml( report.protocolo || "Não informado" )} </div> <div class="report-meta"> Início: ${formatDate( getOpeningDate(report) )} </div> ${ getResolvedDate(report) ? ` <div class="report-meta"> Fim: ${formatDate( getResolvedDate(report) )} </div> ` : "" } <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </div> <div class="public-report-actions"> <button class="public-icon-button public-detail-button" data-id="${report.id}" type="button" title="Detalhar" aria-label="Detalhar ocorrência" > 🔍 </button> <button class="public-icon-button public-timeline-button" data-id="${report.id}" type="button" title="Linha do tempo" aria-label="Ver linha do tempo" > 🕒 </button> </div> </article> `;
        })
        .join("");
  }

  renderPagination(
    filteredReports.length,
    totalPages
  );
}


// =====================================================
// PAGINAÇÃO
// =====================================================

function renderPagination( totalItems, totalPages ) {
  const pagination =
    $("publicPagination");

  if (!pagination) {
    return;
  }

  if (totalItems === 0) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = ` <button id="publicPrevPage" class="secondary-button" type="button" ${currentPage <= 1 ? "disabled" : ""} > Anterior </button> <span> Página ${currentPage} de ${totalPages} </span> <button id="publicNextPage" class="secondary-button" type="button" ${currentPage >= totalPages ? "disabled" : ""} > Próxima </button> `;
}


// =====================================================
// DETALHAMENTO
// =====================================================

function openDetails(reportId) {
  const report = reports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const content =
    $("publicDetailContent");

  if (!content) {
    return;
  }

  const status =
    report.status || "Aberto";

  content.innerHTML = ` <span class="eyebrow"> DETALHAMENTO DA OCORRÊNCIA </span> <h2> ${escapeHtml( report.titulo || "Sem título" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <p> <b>Status:</b> <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </p> <p> <b>Categoria:</b> ${escapeHtml( report.categoria || "Não informada" )} </p> <p> <b>Prioridade:</b> ${escapeHtml( report.prioridade || "Não informada" )} </p> <p> <b>Local:</b> ${escapeHtml( report.local || "Não informado" )} </p> <p> <b>Referência:</b> ${escapeHtml( report.referenciaLocal || "Não informada" )} </p> <p> <b>Data de abertura:</b> ${formatDate( getOpeningDate(report) )} </p> <p> <b>Data em análise:</b> ${formatDate( report.dataAnalise )} </p> <p> <b>Data em execução:</b> ${formatDate( report.dataExecucao )} </p> <p> <b>Data de resolução:</b> ${formatDate( getResolvedDate(report) )} </p> <p> <b>Descrição:</b><br> ${escapeHtml( report.descricao || "Sem descrição" )} </p>  ${ report.fotoData ? ` <div class="report-photo-container"> <img class="detail-photo" src="${report.fotoData}" alt="Foto da ocorrência" /> </div> ` : "" } `;

  show("publicDetailModal");
}


// =====================================================
// LINHA DO TEMPO
// =====================================================

function openTimeline(reportId) {
  const report = reports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const content =
    $("publicTimelineContent");

  if (!content) {
    return;
  }

  const opening =
    getOpeningDate(report);

  const analysis =
    report.dataAnalise;

  const execution =
    report.dataExecucao;

  const resolved =
    getResolvedDate(report);

  content.innerHTML = ` <span class="eyebrow"> LINHA DO TEMPO </span> <h2> ${escapeHtml( report.titulo || "Ocorrência" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <div class="timeline"> <div class="timeline-item completed"> <div class="timeline-dot"> 1 </div> <div class="timeline-content"> <strong> Abertura da ocorrência </strong> <span> ${formatDate(opening)} </span> <small> ${ analysis ? `Aberta por ${calculateDays( opening, analysis )}` : `Aberta há ${calculateDays( opening )}` } </small> </div> </div> <div class="timeline-item ${analysis ? "completed" : "pending"}"> <div class="timeline-dot"> 2 </div> <div class="timeline-content"> <strong> Em análise </strong> <span> ${formatDate(analysis)} </span> <small> ${ analysis ? execution ? `Em análise por ${calculateDays( analysis, execution )}` : resolved ? `Em análise por ${calculateDays( analysis, resolved )}` : `Em análise há ${calculateDays( analysis )}` : "Ainda não entrou em análise" } </small> </div> </div> <div class="timeline-item ${execution ? "completed" : "pending"}"> <div class="timeline-dot"> 3 </div> <div class="timeline-content"> <strong> Em execução </strong> <span> ${formatDate(execution)} </span> <small> ${ execution ? resolved ? `Em execução por ${calculateDays( execution, resolved )}` : `Em execução há ${calculateDays( execution )}` : "Ainda não entrou em execução" } </small> </div> </div> <div class="timeline-item ${resolved ? "completed" : "pending"}"> <div class="timeline-dot"> 4 </div> <div class="timeline-content"> <strong> Resolvido </strong> <span> ${formatDate(resolved)} </span> <small> ${ resolved ? "Ocorrência finalizada" : "Ainda não resolvido" } </small> </div> </div> </div> `;

  show("publicTimelineModal");
}


// =====================================================
// EVENTOS
// =====================================================

$("publicStatusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    renderReports();
  }
);

$("publicPagination")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id ===
        "publicPrevPage" &&
      currentPage > 1
    ) {
      currentPage--;
      renderReports();
      return;
    }

    if (
      event.target.id ===
      "publicNextPage"
    ) {
      const totalPages = Math.max(
        1,
        Math.ceil(
          getFilteredReports().length /
          pageSize
        )
      );

      if (currentPage < totalPages) {
        currentPage++;
        renderReports();
      }
    }
  }
);

document.addEventListener(
  "click",
  (event) => {
    const detailButton =
      event.target.closest(
        ".public-detail-button"
      );

    if (detailButton) {
      openDetails(
        detailButton.dataset.id
      );
      return;
    }

    const timelineButton =
      event.target.closest(
        ".public-timeline-button"
      );

    if (timelineButton) {
      openTimeline(
        timelineButton.dataset.id
      );
    }
  }
);


// =====================================================
// MODAIS
// =====================================================

$("btnClosePublicDetail")?.addEventListener(
  "click",
  () => hide("publicDetailModal")
);

$("publicDetailModal")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id ===
      "publicDetailModal"
    ) {
      hide("publicDetailModal");
    }
  }
);

$("btnClosePublicTimeline")?.addEventListener(
  "click",
  () => hide("publicTimelineModal")
);

$("publicTimelineModal")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id ===
      "publicTimelineModal"
    ) {
      hide("publicTimelineModal");
    }
  }
);


// =====================================================
// LOGOUT
// =====================================================

$("btnLogout")?.addEventListener(
  "click",
  async () => {
    const confirmed = confirm(
      "Deseja realmente sair do sistema?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await signOut(auth);
      window.location.href =
        "./index.html";
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );
    }
  }
);


// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(
  auth,
  (user) => {
    hide("loadingView");

    if (!user) {
      show("loginRequired");
      hide("publicView");
      hide("btnLogout");

      if (unsubscribeReports) {
        unsubscribeReports();
        unsubscribeReports = null;
      }

      return;
    }

    hide("loginRequired");
    show("publicView");
    show("btnLogout");

    const userName =
      $("publicUserName");

    if (userName) {
      userName.textContent =
        user.displayName ||
        "Morador";
    }

    const reportsQuery = query(
      collection(db, "reports"),
      orderBy("criadoEm", "desc")
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
          renderReports();
        },
        (error) => {
          console.error(
            "Erro ao carregar ocorrências:",
            error
          );

          const list =
            $("publicReportsList");

          if (list) {
            list.innerHTML = ` <div class="empty-state"> ${escapeHtml( friendlyError(error) )} </div> `;
          }
        }
      );
  }
);
