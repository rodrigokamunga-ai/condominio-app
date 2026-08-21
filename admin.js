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

const ADMIN_EMAIL = "rodrigokamunga@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// VARIÁVEIS
// =====================================================

const $ = (id) => document.getElementById(id);

let unsubscribeReports = null;
let reports = [];
let currentPage = 1;

const pageSize = 10;
let statusChart = null;


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

function showMessage(text, success = false) {
  const element = $("adminMessage");

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = success
    ? "message success"
    : "message";
}

function showEditMessage(text, success = false) {
  const element = $("adminEditMessage");

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = success
    ? "message success"
    : "message";
}

function toast(text) {
  const element = $("adminToast");

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
  console.error("Erro completo:", error);

  if (error?.code === "permission-denied") {
    return "Permissão negada pelas regras do Firebase.";
  }

  if (error?.code === "failed-precondition") {
    return "O Firebase solicitou a criação de um índice.";
  }

  return error?.message ||
    "Não foi possível concluir a operação.";
}


// =====================================================
// FILTRO
// =====================================================

function getFilteredReports() {
  const filter =
    $("adminStatusFilter")?.value || "Todos";

  if (filter === "Todos") {
    return reports;
  }

  return reports.filter(
    (report) =>
      (report.status || "Aberto") === filter
  );
}


// =====================================================
// CONTADORES
// =====================================================

function updateCounters() {
  const countStatus = (status) =>
    reports.filter(
      (report) =>
        (report.status || "Aberto") === status
    ).length;

  const total = $("adminTotal");
  const open = $("adminOpen");
  const analysis = $("adminAnalysis");
  const execution = $("adminExecution");
  const resolved = $("adminResolved");

  if (total) {
    total.textContent = reports.length;
  }

  if (open) {
    open.textContent = countStatus("Aberto");
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
  const canvas = $("statusChart");

  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  const values = [
    reports.filter(
      (report) =>
        (report.status || "Aberto") === "Aberto"
    ).length,

    reports.filter(
      (report) =>
        (report.status || "Aberto") === "Em análise"
    ).length,

    reports.filter(
      (report) =>
        (report.status || "Aberto") === "Em execução"
    ).length,

    reports.filter(
      (report) =>
        (report.status || "Aberto") === "Resolvido"
    ).length
  ];

  if (statusChart) {
    statusChart.destroy();
  }

  statusChart = new Chart(canvas, {
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
  });
}


// =====================================================
// RENDERIZAÇÃO DA LISTA
// =====================================================

function renderReports() {
  const list = $("adminReportsList");

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

    return ` <article class="report-item admin-report-item"> <div class="admin-report-header"> <div class="report-title"> ${escapeHtml( report.titulo || "Sem título" )} </div> <span class="badge admin-report-status ${statusClass(status)}"> ${escapeHtml(status)} </span> </div> <div class="admin-report-main"> <div class="report-meta"> Protocolo: ${escapeHtml( report.protocolo || "Não informado" )} </div> <div class="report-meta"> Morador: ${escapeHtml( report.nome || "Não informado" )} </div> <div class="report-meta"> Unidade: ${escapeHtml( report.unidade || "Não informada" )} </div> <div class="report-meta"> Início: ${formatDate( report.inicioEm || report.criadoEm )} </div> ${ report.fimEm ? ` <div class="report-meta"> Fim: ${formatDate(report.fimEm)} </div> ` : "" } </div> <div class="admin-report-actions"> <button class="action-icon-button detail-button" data-id="${report.id}" type="button" title="Detalhar" aria-label="Detalhar ocorrência" > 🔍 </button> <button class="action-icon-button edit-button" data-id="${report.id}" type="button" title="Editar" aria-label="Editar ocorrência" > ✏️ </button> <button class="action-icon-button admin-danger delete-button" data-id="${report.id}" type="button" title="Excluir" aria-label="Excluir ocorrência" > 🗑️ </button> </div> </article> `;
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


// =====================================================
// PAGINAÇÃO
// =====================================================

function renderPagination( totalItems, totalPages ) {
  const pagination = $("adminPagination");

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
// =====================================================

function openDetails(reportId) {
  const report = reports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const content = $("adminDetailContent");

  if (!content) {
    return;
  }

  const status = report.status || "Aberto";

  content.innerHTML = ` <span class="eyebrow"> DETALHAMENTO ADMINISTRATIVO </span> <h2> ${escapeHtml( report.titulo || "Sem título" )} </h2> <div class="admin-detail-grid"> <div class="admin-detail-field"> <strong>Protocolo</strong> <span> ${escapeHtml( report.protocolo || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>Status</strong> <span> <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </span> </div> <div class="admin-detail-field"> <strong>Morador</strong> <span> ${escapeHtml( report.nome || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>E-mail</strong> <span> ${escapeHtml( report.email || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>Unidade</strong> <span> ${escapeHtml( report.unidade || "Não informada" )} </span> </div> <div class="admin-detail-field"> <strong>Bloco</strong> <span> ${escapeHtml( report.bloco || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>Categoria</strong> <span> ${escapeHtml( report.categoria || "Não informada" )} </span> </div> <div class="admin-detail-field"> <strong>Prioridade</strong> <span> ${escapeHtml( report.prioridade || "Não informada" )} </span> </div> <div class="admin-detail-field"> <strong>Local</strong> <span> ${escapeHtml( report.local || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>Referência</strong> <span> ${escapeHtml( report.referenciaLocal || "Não informada" )} </span> </div> <div class="admin-detail-field"> <strong>Data de início</strong> <span> ${formatDate( report.inicioEm || report.criadoEm )} </span> </div> <div class="admin-detail-field"> <strong>Data de fim</strong> <span> ${formatDate(report.fimEm)} </span> </div> </div> <p> <strong>Descrição:</strong> </p> <p class="report-description"> ${escapeHtml( report.descricao || "Sem descrição" )} </p> <p> <strong>Oferece risco:</strong> ${report.ofereceRisco ? "Sim" : "Não"} </p> ${ report.fotoData ? ` <div class="report-photo-container"> <img class="detail-photo" src="${report.fotoData}" alt="Foto da ocorrência" /> </div> ` : "" } `;

  show("adminDetailModal");
}


// =====================================================
// EDIÇÃO
// =====================================================

function openEditModal(reportId) {
  const report = reports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  $("adminEditReportId").value = report.id;
  $("adminEditTitle").value = report.titulo || "";
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

  showEditMessage("");
  show("adminEditModal");
}

async function saveEdit(event) {
  event.preventDefault();

  const reportId =
    $("adminEditReportId")?.value;

  if (!reportId) {
    showEditMessage(
      "Ocorrência não identificada."
    );
    return;
  }

  const title =
    $("adminEditTitle")?.value.trim();

  const description =
    $("adminEditDescription")?.value.trim();

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

  const saveButton = $("btnSaveAdminEdit");

  if (saveButton) {
    saveButton.disabled = true;
  }

  try {
    const status =
      $("adminEditStatus").value;

    await updateDoc(
      doc(db, "reports", reportId),
      {
        titulo: title,
        categoria:
          $("adminEditCategory").value,
        prioridade:
          $("adminEditPriority").value,
        local:
          $("adminEditLocation").value,
        referenciaLocal:
          $("adminEditReference").value.trim(),
        descricao: description,
        status,

        fimEm:
          status === "Resolvido"
            ? serverTimestamp()
            : null,

        atualizadoEm: serverTimestamp()
      }
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


// =====================================================
// EXCLUSÃO
// =====================================================

async function deleteReport(reportId) {
  const report = reports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    alert("Ocorrência não encontrada.");
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

    alert(friendlyError(error));
  }
}


// =====================================================
// GERAÇÃO DO PDF
// =====================================================

function generatePdf() {
  if (
    !window.jspdf ||
    !window.jspdf.jsPDF
  ) {
    alert(
      "A biblioteca de PDF ainda não foi carregada."
    );
    return;
  }

  if (reports.length === 0) {
    alert(
      "Não existem ocorrências para gerar o PDF."
    );
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const marginLeft = 14;
  let y = 18;

  const lineHeight = 7;
  const pageHeight = 280;

  function addNewPageIfNeeded(extra = 10) {
    if (y + extra > pageHeight) {
      pdf.addPage();
      y = 18;
    }
  }

  function addText(text, size = 10, bold = false) {
    addNewPageIfNeeded(10);

    pdf.setFontSize(size);
    pdf.setFont(
      "helvetica",
      bold ? "bold" : "normal"
    );

    const lines = pdf.splitTextToSize(
      String(text),
      180
    );

    pdf.text(lines, marginLeft, y);
    y += lines.length * lineHeight;
  }

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    "Relatório de Ocorrências",
    marginLeft,
    y
  );

  y += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Condomínio Amigos do Maui`,
    marginLeft,
    y
  );

  y += lineHeight;

  pdf.text(
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    marginLeft,
    y
  );

  y += 12;

  addText(
    `Total de ocorrências: ${reports.length}`,
    11,
    true
  );

  addText(
    `Abertas: ${countStatus("Aberto")} | ` +
    `Em análise: ${countStatus("Em análise")} | ` +
    `Em execução: ${countStatus("Em execução")} | ` +
    `Resolvidas: ${countStatus("Resolvido")}`,
    10,
    false
  );

  y += 5;

  reports.forEach((report, index) => {
    addNewPageIfNeeded(45);

    pdf.setDrawColor(210, 210, 210);
    pdf.line(
      marginLeft,
      y,
      196,
      y
    );

    y += 7;

    addText(
      `${index + 1}. ${report.titulo || "Sem título"}`,
      11,
      true
    );

    addText(
      `Protocolo: ${report.protocolo || "Não informado"}`
    );

    addText(
      `Status: ${report.status || "Aberto"}`
    );

    addText(
      `Morador: ${report.nome || "Não informado"}`
    );

    addText(
      `Unidade: ${report.unidade || "Não informada"}`
    );

    addText(
      `Categoria: ${report.categoria || "Não informada"}`
    );

    addText(
      `Prioridade: ${report.prioridade || "Não informada"}`
    );

    addText(
      `Local: ${report.local || "Não informado"}`
    );

    addText(
      `Data de início: ${formatDate( report.inicioEm || report.criadoEm )}`
    );

    if (report.fimEm) {
      addText(
        `Data de fim: ${formatDate( report.fimEm )}`
      );
    }

    addText(
      `Descrição: ${report.descricao || "Sem descrição"}`
    );

    y += 4;
  });

  const fileName =
    `relatorio-ocorrencias-${new Date() .toISOString() .slice(0, 10)}.pdf`;

  pdf.save(fileName);

  showMessage(
    "PDF gerado com sucesso.",
    true
  );
}

function countStatus(status) {
  return reports.filter(
    (report) =>
      (report.status || "Aberto") === status
  ).length;
}


// =====================================================
// EVENTOS
// =====================================================

document.addEventListener("click", (event) => {
  const detailButton = event.target.closest(
    ".detail-button"
  );

  if (detailButton) {
    openDetails(detailButton.dataset.id);
    return;
  }

  const editButton = event.target.closest(
    ".edit-button"
  );

  if (editButton) {
    openEditModal(editButton.dataset.id);
    return;
  }

  const deleteButton = event.target.closest(
    ".delete-button"
  );

  if (deleteButton) {
    deleteReport(deleteButton.dataset.id);
    return;
  }

  if (event.target.id === "adminPrevPage") {
    if (currentPage > 1) {
      currentPage--;
      renderReports();
    }

    return;
  }

  if (event.target.id === "adminNextPage") {
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
});

$("adminStatusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    renderReports();
  }
);

$("btnCloseAdminDetail")?.addEventListener(
  "click",
  () => hide("adminDetailModal")
);

$("adminDetailModal")?.addEventListener(
  "click",
  (event) => {
    if (event.target.id === "adminDetailModal") {
      hide("adminDetailModal");
    }
  }
);

$("btnCloseAdminEdit")?.addEventListener(
  "click",
  () => hide("adminEditModal")
);

$("adminEditModal")?.addEventListener(
  "click",
  (event) => {
    if (event.target.id === "adminEditModal") {
      hide("adminEditModal");
    }
  }
);

$("adminEditForm")?.addEventListener(
  "submit",
  saveEdit
);

$("btnGeneratePdf")?.addEventListener(
  "click",
  generatePdf
);

$("btnRefreshAdmin")?.addEventListener(
  "click",
  () => {
    currentPage = 1;
    renderReports();
    toast("Dados atualizados.");
  }
);

$("btnAdminLogout")?.addEventListener(
  "click",
  async () => {
    await signOut(auth);
    window.location.href = "index.html";
  }
);


// =====================================================
// AUTENTICAÇÃO E CARREGAMENTO
// =====================================================

onAuthStateChanged(auth, (user) => {
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

  const adminName = $("adminUserName");

  if (adminName) {
    adminName.textContent =
      user.displayName ||
      user.email ||
      "Administrador";
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
        "Erro ao carregar ocorrências:",
        error
      );

      const list = $("adminReportsList");

      if (list) {
        list.innerHTML = ` <div class="empty-state"> ${escapeHtml( friendlyError(error) )} </div> `;
      }

      showMessage(
        friendlyError(error)
      );
    }
  );
});
