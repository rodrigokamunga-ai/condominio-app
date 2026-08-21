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
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCmep_wIOuM3TF4yTUIaoU83oSTFydI8Ig",
  authDomain: "condominiomaui-5ecd0.firebaseapp.com",
  projectId: "condominiomaui-5ecd0",
  storageBucket: "condominiomaui-5ecd0.firebasestorage.app",
  messagingSenderId: "298051508693",
  appId: "1:298051508693:web:cc5af84aaceb7856e7055c"
};


// INICIALIZAÇÃO DO FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// VARIÁVEIS
const $ = (id) => document.getElementById(id);

let unsubscribeReports = null;
let reports = [];
let currentPage = 1;

const pageSize = 10;


// FUNÇÕES AUXILIARES
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

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString("pt-BR");
  }

  if (value instanceof Date) {
    return value.toLocaleString("pt-BR");
  }

  return "Não informada";
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
  console.error("Erro completo:", error);

  const errors = {
    "permission-denied":
      "Você não tem permissão para consultar as ocorrências.",

    "failed-precondition":
      "O Firebase solicitou a criação de um índice.",

    "unavailable":
      "O Firebase está temporariamente indisponível."
  };

  return errors[error?.code] ||
    error?.message ||
    "Não foi possível carregar as ocorrências.";
}


// FILTRO
function getFilteredReports() {
  const filter =
    $("publicStatusFilter")?.value || "Todos";

  if (filter === "Todos") {
    return reports;
  }

  return reports.filter(
    (report) =>
      (report.status || "Aberto") === filter
  );
}


// RENDERIZA A LISTA PÚBLICA
function renderReports() {
  const list = $("publicReportsList");

  if (!list) {
    return;
  }

  const filteredReports = getFilteredReports();

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredReports.length / pageSize
    )
  );

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex =
    (currentPage - 1) * pageSize;

  const visibleReports =
    filteredReports.slice(
      startIndex,
      startIndex + pageSize
    );

  if (visibleReports.length === 0) {
    list.innerHTML = ` <div class="empty-state"> Nenhuma ocorrência encontrada. </div> `;
  } else {
    list.innerHTML = visibleReports
      .map((report) => {
        const status = report.status || "Aberto";

        return ` <article class="report-item public-report"> <div> <div class="report-title"> ${escapeHtml( report.titulo || "Sem título" )} </div> <div class="report-meta"> Protocolo: ${escapeHtml( report.protocolo || "Não informado" )} </div> <div class="report-meta"> Início: ${formatDate( report.inicioEm || report.criadoEm )} </div> ${ report.fimEm ? ` <div class="report-meta"> Fim: ${formatDate(report.fimEm)} </div> ` : "" } <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </div> <button class="secondary-button public-detail-button" data-id="${report.id}" type="button" > Detalhar </button> </article> `;
      })
      .join("");
  }

  renderPagination(
    filteredReports.length,
    totalPages
  );
}


// PAGINAÇÃO
function renderPagination( totalItems, totalPages ) {
  const pagination = $("publicPagination");

  if (!pagination) {
    return;
  }

  if (totalItems === 0) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = ` <button id="publicPrevPage" class="secondary-button" type="button" ${currentPage <= 1 ? "disabled" : ""} > Anterior </button> <span> Página ${currentPage} de ${totalPages} </span> <button id="publicNextPage" class="secondary-button" type="button" ${currentPage >= totalPages ? "disabled" : ""} > Próxima </button> `;
}


// DETALHAMENTO PÚBLICO
function openDetails(reportId) {
  const report = reports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const detailContent = $("publicDetailContent");

  if (!detailContent) {
    return;
  }

  const status = report.status || "Aberto";

  detailContent.innerHTML = ` <span class="eyebrow"> DETALHAMENTO DA OCORRÊNCIA </span> <h2> ${escapeHtml( report.titulo || "Sem título" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <p> <b>Status:</b> <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </p> <p> <b>Categoria:</b> ${escapeHtml( report.categoria || "Não informada" )} </p> <p> <b>Prioridade:</b> ${escapeHtml( report.prioridade || "Não informada" )} </p> <p> <b>Local:</b> ${escapeHtml( report.local || "Não informado" )} </p> <p> <b>Referência:</b> ${escapeHtml( report.referenciaLocal || "Não informada" )} </p> <p> <b>Data de início:</b> ${formatDate( report.inicioEm || report.criadoEm )} </p> <p> <b>Data de fim:</b> ${formatDate(report.fimEm)} </p> <p> <b>Descrição:</b><br> ${escapeHtml( report.descricao || "Sem descrição" )} </p> <p> <b>Oferece risco:</b> ${report.ofereceRisco ? "Sim" : "Não"} </p> ${ report.fotoData ? ` <div class="report-photo-container"> <img class="detail-photo" src="${report.fotoData}" alt="Foto da ocorrência" /> </div> ` : "" } `;

  show("publicDetailModal");
}


// FILTRO DE STATUS
$("publicStatusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    renderReports();
  }
);


// PAGINAÇÃO
$("publicPagination")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id === "publicPrevPage" &&
      currentPage > 1
    ) {
      currentPage--;
      renderReports();
      return;
    }

    if (
      event.target.id === "publicNextPage"
    ) {
      const totalPages = Math.max(
        1,
        Math.ceil(
          getFilteredReports().length / pageSize
        )
      );

      if (currentPage < totalPages) {
        currentPage++;
        renderReports();
      }
    }
  }
);


// BOTÃO DE DETALHAMENTO
document.addEventListener("click", (event) => {
  const button = event.target.closest(
    ".public-detail-button"
  );

  if (!button) {
    return;
  }

  openDetails(button.dataset.id);
});


// FECHAR MODAL
$("btnClosePublicDetail")?.addEventListener(
  "click",
  () => hide("publicDetailModal")
);

$("publicDetailModal")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id === "publicDetailModal"
    ) {
      hide("publicDetailModal");
    }
  }
);


// LOGOUT
$("btnLogout")?.addEventListener(
  "click",
  async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );
    }
  }
);


// AUTENTICAÇÃO E CARREGAMENTO
onAuthStateChanged(auth, (user) => {
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
    user.displayName || "Morador";

  const publicUserName =
    $("publicUserName");

  if (publicUserName) {
    publicUserName.textContent = userName;
  }

  const reportsQuery = query(
    collection(db, "reports"),
    orderBy("criadoEm", "desc")
  );

  if (unsubscribeReports) {
    unsubscribeReports();
  }

  unsubscribeReports = onSnapshot(
    reportsQuery,
    (snapshot) => {
      reports = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      currentPage = 1;
      renderReports();
    },
    (error) => {
      console.error(
        "Erro ao carregar ocorrências públicas:",
        error
      );

      const list = $("publicReportsList");

      if (list) {
        list.innerHTML = ` <div class="empty-state"> ${escapeHtml( friendlyError(error) )} </div> `;
      }
    }
  );
});
