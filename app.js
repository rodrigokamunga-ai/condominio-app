import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
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
  "5521988386027";


// =====================================================
// INICIALIZAÇÃO
// =====================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// VARIÁVEIS
// =====================================================

const $ = (id) =>
  document.getElementById(id);

let unsubscribeReports = null;
let allReports = [];
let currentPage = 1;

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

function setText(id, text) {
  const element = $(id);

  if (element) {
    element.textContent = text;
  }
}

function message(id, text, success = false) {
  const element = $(id);

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = success
    ? "message success"
    : "message";
}

function toast(text) {
  const element = $("toast");

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

function getDateFromValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
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
  console.error("Erro completo:", error);

  const errors = {
    "auth/invalid-credential":
      "E-mail ou senha inválidos.",

    "auth/user-not-found":
      "Usuário não encontrado.",

    "auth/wrong-password":
      "Senha incorreta.",

    "auth/email-already-in-use":
      "Este e-mail já está cadastrado.",

    "auth/weak-password":
      "A senha deve ter pelo menos 6 caracteres.",

    "auth/invalid-email":
      "Informe um e-mail válido.",

    "auth/network-request-failed":
      "Falha de conexão com a internet.",

    "permission-denied":
      "Permissão negada pelas regras do Firebase.",

    "failed-precondition":
      "O Firebase solicitou a criação de um índice."
  };

  if (errors[error?.code]) {
    return errors[error.code];
  }

  if (
    error?.message &&
    error.message.toLowerCase().includes("permission")
  ) {
    return "Permissão negada. Verifique as regras do Firebase.";
  }

  return error?.message ||
    "Não foi possível concluir a operação.";
}

function isAdmin(user) {
  return Boolean(
    user &&
    user.email &&
    user.email.toLowerCase() ===
      ADMIN_EMAIL.toLowerCase()
  );
}

function isDocumentationCategory() {
  return $("reportCategory")?.value ===
    "Documentação";
}

function getStatusDate(report, status) {
  if (status === "Aberto") {
    return report.dataAbertura ||
      report.inicioEm ||
      report.criadoEm;
  }

  if (status === "Em análise") {
    return report.dataAnalise;
  }

  if (status === "Em execução") {
    return report.dataExecucao;
  }

  if (status === "Resolvido") {
    return report.dataResolvido ||
      report.fimEm;
  }

  return null;
}

function calculateDays(startValue, endValue = null) {
  const start = getDateFromValue(startValue);

  if (!start) {
    return "Não informado";
  }

  const end =
    getDateFromValue(endValue) ||
    new Date();

  const difference =
    end.getTime() - start.getTime();

  const days = Math.floor(
    difference / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) {
    return "menos de 1 dia";
  }

  return `${days} dia${days === 1 ? "" : "s"}`;
}


// =====================================================
// COMPACTAÇÃO DA IMAGEM
// =====================================================

function compressImage( file, maxWidth = 640, maxHeight = 480, quality = 0.6 ) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(
        new Error("Selecione uma imagem válida.")
      );
      return;
    }

    const reader = new FileReader();
    const image = new Image();

    reader.onload = (event) => {
      image.src = event.target.result;
    };

    reader.onerror = () => {
      reject(
        new Error("Não foi possível ler a imagem.")
      );
    };

    image.onload = () => {
      let width = image.width;
      let height = image.height;

      const scale = Math.min(
        maxWidth / width,
        maxHeight / height,
        1
      );

      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(
          new Error("Não foi possível processar a imagem.")
        );
        return;
      }

      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      const imageData = canvas.toDataURL(
        "image/jpeg",
        quality
      );

      const approximateSize =
        Math.round((imageData.length * 3) / 4);

      if (approximateSize > 350000) {
        reject(
          new Error(
            "A imagem ficou muito grande. Escolha outra foto."
          )
        );
        return;
      }

      resolve(imageData);
    };

    image.onerror = () => {
      reject(
        new Error("Não foi possível processar a imagem.")
      );
    };

    reader.readAsDataURL(file);
  });
}


// =====================================================
// CONTROLES DO CAMPO DOCUMENTAÇÃO
// =====================================================

function addCategoryOptions() {
  const category =
    $("reportCategory");

  if (!category) {
    return;
  }

  const documentationExists =
    Array.from(category.options)
      .some(
        (option) =>
          option.value === "Documentação"
      );

  if (!documentationExists) {
    const documentationOption =
      document.createElement("option");

    documentationOption.value =
      "Documentação";

    documentationOption.textContent =
      "Documentação";

    category.appendChild(
      documentationOption
    );
  }

  const jardinagemExists =
    Array.from(category.options)
      .some(
        (option) =>
          option.value === "Jardinagem"
      );

  if (!jardinagemExists) {
    const jardinagemOption =
      document.createElement("option");

    jardinagemOption.value =
      "Jardinagem";

    jardinagemOption.textContent =
      "Jardinagem";

    category.appendChild(
      jardinagemOption
    );
  }
}

function updateLocationFields() {
  const category =
    $("reportCategory")?.value || "";

  const disableLocation =
    category === "Documentação" ||
    category === "Jardinagem";

  const disableReference =
    category === "Documentação";

  const location =
    $("reportLocation");

  const reference =
    $("reportReference");

  if (location) {
    location.disabled =
      disableLocation;

    if (disableLocation) {
      location.value = "";
    }
  }

  if (reference) {
    reference.disabled =
      disableReference;

    if (disableReference) {
      reference.value = "";
    }
  }
}

function removeUpdatesField() {
  const updates = $("reportUpdates");

  if (!updates) {
    return;
  }

  const label =
    updates.closest("label");

  if (label) {
    label.remove();
  } else {
    updates.remove();
  }
}


// =====================================================
// FILTRO
// =====================================================

function getFilteredReports() {
  const selectedStatus =
    $("statusFilter")?.value || "Todos";

  if (selectedStatus === "Todos") {
    return allReports;
  }

  return allReports.filter(
    (report) =>
      (report.status || "Aberto") === selectedStatus
  );
}


// =====================================================
// LISTAGEM
// =====================================================

function renderReports() {
  const list = $("reportsList");

  if (!list) {
    return;
  }

  const filteredReports =
    getFilteredReports();

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredReports.length / pageSize
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
    list.innerHTML = ` <div class="empty-state"> Nenhum registro encontrado. </div> `;
  } else {
    list.innerHTML = visibleReports
      .map((report) => {
        const status =
          report.status || "Aberto";

        return ` <article class="report-item compact-report"> <div> <div class="report-title"> ${escapeHtml( report.titulo || "Sem título" )} </div> <div class="report-meta"> Protocolo: ${escapeHtml( report.protocolo || "Não informado" )} </div> <div class="report-meta"> Início: ${formatDate( report.dataAbertura || report.inicioEm || report.criadoEm )} </div> ${ report.fimEm || report.dataResolvido ? ` <div class="report-meta"> Fim: ${formatDate( report.dataResolvido || report.fimEm )} </div> ` : "" } <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </div> <div class="report-actions"> <button class="action-icon-button detail-button" data-id="${report.id}" type="button" title="Detalhar" aria-label="Detalhar ocorrência" > 🔍 </button> <button class="action-icon-button timeline-button" data-id="${report.id}" type="button" title="Linha do tempo" aria-label="Linha do tempo" > 🕒 </button> <button class="action-icon-button edit-button" data-id="${report.id}" type="button" title="Editar" aria-label="Editar ocorrência" > ✏️ </button> <button
  class="action-icon-button whatsapp-button"
  data-id="${report.id}"
  type="button"
  title="Enviar pelo WhatsApp"
  aria-label="Enviar ocorrência pelo WhatsApp"
>
  💬
</button> <button class="action-icon-button email-button" data-id="${report.id}" type="button" title="Enviar e-mail" aria-label="Enviar ocorrência por e-mail" > ✉️ </button> <button class="action-icon-button delete-button" data-id="${report.id}" type="button" title="Excluir" aria-label="Excluir ocorrência" > 🗑️ </button> </div> </article> `;
      })
      .join("");
  }

  renderPagination(
    filteredReports.length,
    totalPages
  );

  setText(
    "statTotal",
    allReports.length
  );

  setText(
    "statOpen",
    allReports.filter(
      (report) =>
        (report.status || "Aberto") !==
        "Resolvido"
    ).length
  );

  setText(
    "statResolved",
    allReports.filter(
      (report) =>
        report.status === "Resolvido"
    ).length
  );
}


// =====================================================
// PAGINAÇÃO
// =====================================================

function renderPagination( totalItems, totalPages ) {
  const pagination =
    $("pagination");

  if (!pagination) {
    return;
  }

  if (totalItems === 0) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = ` <button id="prevPage" class="secondary-button" type="button" ${currentPage <= 1 ? "disabled" : ""} > Anterior </button> <span> Página ${currentPage} de ${totalPages} </span> <button id="nextPage" class="secondary-button" type="button" ${currentPage >= totalPages ? "disabled" : ""} > Próxima </button> `;
}


// =====================================================
// DETALHAMENTO
// =====================================================

function openDetails(reportId) {
  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const detailContent =
    $("detailContent");

  if (!detailContent) {
    return;
  }

  const status =
    report.status || "Aberto";

  detailContent.innerHTML = ` <span class="eyebrow"> DETALHAMENTO DA OCORRÊNCIA </span> <h2> ${escapeHtml( report.titulo || "Sem título" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <p> <b>Status:</b> <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </p> <p> <b>Categoria:</b> ${escapeHtml( report.categoria || "Não informada" )} </p> <p> <b>Prioridade:</b> ${escapeHtml( report.prioridade || "Não informada" )} </p> <p> <b>Local:</b> ${escapeHtml( report.local || "Não informado" )} </p> <p> <b>Referência:</b> ${escapeHtml( report.referenciaLocal || "Não informada" )} </p> <p> <b>Data de abertura:</b> ${formatDate( report.dataAbertura || report.inicioEm || report.criadoEm )} </p> <p> <b>Data em análise:</b> ${formatDate(report.dataAnalise)} </p> <p> <b>Data em execução:</b> ${formatDate(report.dataExecucao)} </p> <p> <b>Data de resolução:</b> ${formatDate( report.dataResolvido || report.fimEm )} </p> <p> <b>Descrição:</b><br> ${escapeHtml( report.descricao || "Sem descrição" )} </p>  ${ report.fotoData ? ` <div class="report-photo-container"> <img class="detail-photo" src="${report.fotoData}" alt="Foto da ocorrência" /> </div> ` : "" } `;

  show("detailModal");
}


// =====================================================
// LINHA DO TEMPO
// =====================================================

function openTimeline(reportId) {
  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const modal = getOrCreateTimelineModal();

  const content =
    modal.querySelector(
      "#timelineContent"
    );

  if (!content) {
    return;
  }

  const abertura =
    report.dataAbertura ||
    report.inicioEm ||
    report.criadoEm;

  const analise =
    report.dataAnalise;

  const execucao =
    report.dataExecucao;

  const resolvido =
    report.dataResolvido ||
    report.fimEm;

  content.innerHTML = ` <span class="eyebrow"> LINHA DO TEMPO </span> <h2> ${escapeHtml( report.titulo || "Ocorrência" )} </h2> <div class="timeline"> <div class="timeline-item completed"> <div class="timeline-dot">1</div> <div class="timeline-content"> <strong>Abertura da ocorrência</strong> <span> ${formatDate(abertura)} </span> <small> ${ analise ? `Aberto por ${calculateDays( abertura, analise )}` : `Em aberto há ${calculateDays( abertura )}` } </small> </div> </div> <div class="timeline-item ${analise ? "completed" : "pending"}"> <div class="timeline-dot">2</div> <div class="timeline-content"> <strong>Em análise</strong> <span> ${formatDate(analise)} </span> <small> ${ analise ? execucao ? `Em análise por ${calculateDays( analise, execucao )}` : resolvido ? `Em análise por ${calculateDays( analise, resolvido )}` : `Em análise há ${calculateDays( analise )}` : "Ainda não entrou em análise" } </small> </div> </div> <div class="timeline-item ${execucao ? "completed" : "pending"}"> <div class="timeline-dot">3</div> <div class="timeline-content"> <strong>Em execução</strong> <span> ${formatDate(execucao)} </span> <small> ${ execucao ? resolvido ? `Em execução por ${calculateDays( execucao, resolvido )}` : `Em execução há ${calculateDays( execucao )}` : "Ainda não entrou em execução" } </small> </div> </div> <div class="timeline-item ${resolvido ? "completed" : "pending"}"> <div class="timeline-dot">4</div> <div class="timeline-content"> <strong>Resolvido</strong> <span> ${formatDate(resolvido)} </span> <small> ${ resolvido ? "Ocorrência finalizada" : "Ainda não resolvido" } </small> </div> </div> </div> `;

  show("timelineModal");
}

function getOrCreateTimelineModal() {
  let modal = $("timelineModal");

  if (modal) {
    return modal;
  }

  modal =
    document.createElement("div");

  modal.id = "timelineModal";
  modal.className = "modal hidden";

  modal.innerHTML = ` <div class="modal-card"> <button id="btnCloseTimeline" class="modal-close" type="button" aria-label="Fechar linha do tempo" > × </button> <div id="timelineContent"></div> </div> `;

  document.body.appendChild(modal);

  modal.addEventListener(
    "click",
    (event) => {
      if (
        event.target.id ===
        "timelineModal"
      ) {
        hide("timelineModal");
      }
    }
  );

  modal.querySelector(
    "#btnCloseTimeline"
  )?.addEventListener(
    "click",
    () => hide("timelineModal")
  );

  return modal;
}


// =====================================================
// E-MAIL DA OCORRÊNCIA
// =====================================================

function sendReportByEmail(reportId) {
  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    alert("Ocorrência não encontrada.");
    return;
  }

  const subject =
    report.titulo ||
    "Ocorrência do condomínio";

  const dateValue =
    report.dataAbertura ||
    report.inicioEm ||
    report.criadoEm;

  const dateText =
    formatDate(dateValue);

  const residentName =
    report.nome ||
    "Nome não informado";

  const apartment =
    report.unidade ||
    "Apartamento não informado";

  const block =
    report.bloco ||
    "Bloco não informado";

  const location =
    report.local ||
    "Não informado";

  const description =
    report.descricao ||
    "Não informada";

  /* O corpo é criado com CRLF. Essa combinação funciona melhor com Outlook, Gmail e outros clientes. */
  const body = [
    "Prezados,",
    "",
    "Venho, por meio deste, comunicar uma ocorrência no condomínio.",
    "",
    `Data e horário: ${dateText}`,
    "",
    `Local: ${location}`,
    "",
    `Descrição da ocorrência: ${description}`,
    "",
    "Solicito, por gentileza, que a administração verifique a situação e tome as providências cabíveis, conforme as normas do condomínio. Caso necessário, coloco-me à disposição para fornecer informações adicionais.",
    "",
    "Agradeço a atenção.",
    "",
    "Atenciosamente,",
    "",
    residentName,
    `Bloco ${block.replace(/^Bloco\s*/i, "")} / Apartamento ${apartment .replace(/^Apartamento\s*/i, "") .replace(/^Apto\s*/i, "")}`
  ].join("\r\n");

  const mailto =
    `mailto:${EMAIL_DESTINO}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  if (report.fotoData) {
    downloadReportPhoto(report);
  }

  window.location.href = mailto;
}

// =====================================================
// ENVIO DA OCORRÊNCIA PELO WHATSAPP
// =====================================================

// =====================================================
// ENVIO DA OCORRÊNCIA PELO WHATSAPP
// =====================================================

function sendReportByWhatsApp(reportId) {
  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    alert("Ocorrência não encontrada.");
    return;
  }

  const messageText = [
    `Título: ${report.titulo || "Não informado"}`,
    `Local: ${report.local || "Não informado"}`,
    `Referência: ${report.referenciaLocal || "Não informada"}`,
    `Descrição da ocorrência: ${report.descricao || "Não informada"}`,
    `Morador: ${report.nome || "Não informado"}`,
    `Unidade: ${report.unidade || "Não informada"}`,
    `Bloco: ${report.bloco || "Não informado"}`
  ].join("\n");

  const whatsappUrl =
    `https://wa.me/${WHATSAPP_NUMERO}` +
    `?text=${encodeURIComponent(messageText)}`;

  window.open(
    whatsappUrl,
    "_blank",
    "noopener,noreferrer"
  );
}


// =====================================================
// DOWNLOAD DA FOTO DA OCORRÊNCIA
// =====================================================

function downloadReportPhoto(report) {
  try {
    const link =
      document.createElement("a");

    link.href = report.fotoData;

    const protocol =
      report.protocolo || "ocorrencia";

    link.download =
      `foto-${protocol}.jpg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      alert(
        "A foto foi baixada. Anexe o arquivo manualmente no e-mail."
      );
    }, 500);
  } catch (error) {
    console.error(
      "Não foi possível baixar a foto:",
      error
    );
  }
}


// =====================================================
// ABRIR MODAL DE EDIÇÃO
// =====================================================

function openEditModal(reportId) {
  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const fields = {
    id: $("editReportId"),
    title: $("editTitle"),
    category: $("editCategory"),
    priority: $("editPriority"),
    location: $("editLocation"),
    reference: $("editReference"),
    description: $("editDescription"),
    status: $("editStatus"),
    risk: $("editRisk")
  };

  if (
    !fields.id ||
    !fields.title ||
    !fields.category ||
    !fields.priority ||
    !fields.location ||
    !fields.reference ||
    !fields.description ||
    !fields.status
  ) {
    alert(
      "Os campos de edição não foram encontrados."
    );
    return;
  }

  addDocumentationToEditCategory();

  fields.id.value = report.id;
  fields.title.value = report.titulo || "";
  fields.category.value =
    report.categoria || "";
  fields.priority.value =
    report.prioridade || "Normal";
  fields.location.value =
    report.local || "";
  fields.reference.value =
    report.referenciaLocal || "";
  fields.description.value =
    report.descricao || "";
  fields.status.value =
    report.status || "Aberto";

  if (fields.risk) {
    fields.risk.checked =
      Boolean(report.ofereceRisco);
  }

  updateEditLocationFields();

  message("editMessage", "");
  show("editModal");
}

function addDocumentationToEditCategory() {
  const category =
    $("editCategory");

  if (!category) {
    return;
  }

  const exists =
    Array.from(category.options)
      .some(
        (option) =>
          option.value === "Documentação"
      );

  if (!exists) {
    const option =
      document.createElement("option");

    option.value = "Documentação";
    option.textContent = "Documentação";

    category.appendChild(option);
  }
}

function updateEditLocationFields() {
  const category =
    $("editCategory")?.value || "";

  const disableLocation =
    category === "Documentação" ||
    category === "Jardinagem";

  const disableReference =
    category === "Documentação";

  const location =
    $("editLocation");

  const reference =
    $("editReference");

  if (location) {
    location.disabled =
      disableLocation;

    if (disableLocation) {
      location.value = "";
    }
  }

  if (reference) {
    reference.disabled =
      disableReference;

    if (disableReference) {
      reference.value = "";
    }
  }
}

// =====================================================
// SALVAR EDIÇÃO
// =====================================================

$("editForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      message(
        "editMessage",
        "Você precisa estar autenticado."
      );
      return;
    }

    const reportId =
      $("editReportId")?.value;

    const report = allReports.find(
      (item) => item.id === reportId
    );

    if (!report) {
      message(
        "editMessage",
        "Ocorrência não encontrada."
      );
      return;
    }

    if (
      !isAdmin(user) &&
      report.moradorId !== user.uid
    ) {
      message(
        "editMessage",
        "Você só pode editar suas próprias ocorrências."
      );
      return;
    }

    const category =
      $("editCategory")?.value;

    const isDocumentation =
      category === "Documentação";

    const description =
      $("editDescription")?.value.trim();

    if (!description || description.length < 10) {
      message(
        "editMessage",
        "A descrição deve ter pelo menos 10 caracteres."
      );
      return;
    }

    const status =
      $("editStatus")?.value ||
      report.status ||
      "Aberto";

    const updateData = {
      titulo:
        $("editTitle")?.value.trim() ||
        report.titulo ||
        "",

      categoria: category,

      prioridade:
        $("editPriority")?.value ||
        "Normal",

      local: isDocumentation
        ? ""
        : $("editLocation")?.value || "",

      referenciaLocal: isDocumentation
        ? ""
        : $("editReference")?.value.trim() || "",

      descricao: description,
      status,

      ofereceRisco:
        $("editRisk")?.checked ??
        report.ofereceRisco ??
        false,

      dataAnalise:
        status === "Em análise"
          ? report.dataAnalise ||
            serverTimestamp()
          : report.dataAnalise || null,

      dataExecucao:
        status === "Em execução"
          ? report.dataExecucao ||
            serverTimestamp()
          : report.dataExecucao || null,

      dataResolvido:
        status === "Resolvido"
          ? report.dataResolvido ||
            serverTimestamp()
          : report.dataResolvido || null,

      fimEm:
        status === "Resolvido"
          ? report.fimEm ||
            serverTimestamp()
          : report.fimEm || null,

      atualizadoEm:
        serverTimestamp()
    };

    const saveButton =
      $("btnSaveEdit");

    if (saveButton) {
      saveButton.disabled = true;
    }

    try {
      await updateDoc(
        doc(db, "reports", reportId),
        updateData
      );

      hide("editModal");

      toast(
        "Ocorrência atualizada com sucesso."
      );
    } catch (error) {
      message(
        "editMessage",
        friendlyError(error)
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
      }
    }
  }
);


// =====================================================
// EXCLUIR OCORRÊNCIA
// =====================================================

async function deleteReport(reportId) {
  const user = auth.currentUser;

  if (!user) {
    alert(
      "Você precisa estar autenticado."
    );
    return;
  }

  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    alert(
      "Ocorrência não encontrada."
    );
    return;
  }

  if (
    !isAdmin(user) &&
    report.moradorId !== user.uid
  ) {
    alert(
      "Você só pode excluir suas próprias ocorrências."
    );
    return;
  }

  const confirmed = confirm(
    "Deseja realmente excluir esta ocorrência?"
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
// CONTROLES DO FORMULÁRIO
// =====================================================

$("reportCategory")?.addEventListener(
  "change",
  updateLocationFields
);

$("editCategory")?.addEventListener(
  "change",
  updateEditLocationFields
);

$("btnShowRegister")?.addEventListener(
  "click",
  () => {
    hide("loginView");
    show("registerView");
  }
);

$("btnBackLogin")?.addEventListener(
  "click",
  () => {
    hide("registerView");
    show("loginView");
  }
);

$("btnNewReport")?.addEventListener(
  "click",
  () => {
    show("reportFormCard");
    $("reportTitle")?.focus();
  }
);

$("btnCancelReport")?.addEventListener(
  "click",
  () => {
    hide("reportFormCard");
    $("reportForm")?.reset();
    updateLocationFields();
    message("reportMessage", "");
  }
);

$("statusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    renderReports();
  }
);

$("btnCloseDetail")?.addEventListener(
  "click",
  () => hide("detailModal")
);

$("detailModal")?.addEventListener(
  "click",
  (event) => {
    if (event.target.id === "detailModal") {
      hide("detailModal");
    }
  }
);

$("btnCloseEdit")?.addEventListener(
  "click",
  () => hide("editModal")
);

$("editModal")?.addEventListener(
  "click",
  (event) => {
    if (event.target.id === "editModal") {
      hide("editModal");
    }
  }
);

$("btnLogout")?.addEventListener(
  "click",
  () => signOut(auth)
);


// =====================================================
// EVENTOS DA LISTA
// =====================================================

document.addEventListener(
  "click",
  (event) => {
    const detailButton =
      event.target.closest(
        ".detail-button"
      );

    if (detailButton) {
      openDetails(
        detailButton.dataset.id
      );
      return;
    }

    const timelineButton =
      event.target.closest(
        ".timeline-button"
      );

    if (timelineButton) {
      openTimeline(
        timelineButton.dataset.id
      );
      return;
    }

    const editButton =
      event.target.closest(
        ".edit-button"
      );

    if (editButton) {
      openEditModal(
        editButton.dataset.id
      );
      return;
    }

    const whatsappButton =
  event.target.closest(
    ".whatsapp-button"
  );

if (whatsappButton) {
  sendReportByWhatsApp(
    whatsappButton.dataset.id
  );

  return;
}

    const emailButton =
      event.target.closest(
        ".email-button"
      );

    if (emailButton) {
      sendReportByEmail(
        emailButton.dataset.id
      );
      return;
    }

    const deleteButton =
      event.target.closest(
        ".delete-button"
      );

    if (deleteButton) {
      deleteReport(
        deleteButton.dataset.id
      );
      return;
    }

    if (event.target.id === "prevPage") {
      if (currentPage > 1) {
        currentPage--;
        renderReports();
      }

      return;
    }

    if (event.target.id === "nextPage") {
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


// =====================================================
// LOGIN
// =====================================================

$("loginForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    message(
      "loginMessage",
      "Entrando..."
    );

    const email =
      $("loginEmail")?.value.trim();

    const password =
      $("loginPassword")?.value;

    if (!email || !password) {
      message(
        "loginMessage",
        "Informe o e-mail e a senha."
      );
      return;
    }

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const loggedUser = auth.currentUser;

if (
  loggedUser &&
  loggedUser.email?.toLowerCase() ===
    "rodrigokamunga@gmail.com"
) {
  window.location.href = "./admin-home.html";
  return;
}

      const user = auth.currentUser;

      if (
        user &&
        !isAdmin(user)
      ) {
        const userSnapshot =
          await getDoc(
            doc(db, "users", user.uid)
          );

        const userData =
          userSnapshot.exists()
            ? userSnapshot.data()
            : {};

        const status =
          userData.status || "Pendente";

        if (status !== "Aprovado") {
          await signOut(auth);

          throw new Error(
            status === "Pendente"
              ? "Seu cadastro ainda aguarda aprovação do administrador."
              : "Seu cadastro não está autorizado a acessar o sistema."
          );
        }
      }
    } catch (error) {
      message(
        "loginMessage",
        friendlyError(error)
      );
    }
  }
);


// =====================================================
// CADASTRO DO MORADOR
// =====================================================

$("registerForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    message(
      "registerMessage",
      "Criando cadastro..."
    );

    const name =
      $("registerName")?.value.trim();

    const unit =
      $("registerUnit")?.value.trim();

    const block =
      $("registerBlock")?.value.trim();

    const phone =
      $("registerPhone")?.value.trim();

    const email =
      $("registerEmail")?.value.trim();

    const password =
      $("registerPassword")?.value;

    if (
      !name ||
      !unit ||
      !email ||
      !password
    ) {
      message(
        "registerMessage",
        "Preencha nome, unidade, e-mail e senha."
      );
      return;
    }

    try {
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await updateProfile(
        credential.user,
        {
          displayName: name
        }
      );

      await setDoc(
        doc(
          db,
          "users",
          credential.user.uid
        ),
        {
          uid: credential.user.uid,
          nome: name,
          unidade: unit,
          bloco: block || "",
          telefone: phone || "",
          email,

          status: "Pendente",

          criadoEm: serverTimestamp(),
          aprovadoEm: null,
          rejeitadoEm: null,
          atualizadoEm: serverTimestamp()
        }
      );

      await signOut(auth);

      hide("registerView");
      show("loginView");

      message(
        "loginMessage",
        "Cadastro realizado. Aguarde a aprovação do administrador.",
        true
      );
    } catch (error) {
      message(
        "registerMessage",
        friendlyError(error)
      );
    }
  }
);


// =====================================================
// ENVIO DE OCORRÊNCIA
// =====================================================

// =====================================================
// ENVIO DE OCORRÊNCIA
// =====================================================

$("reportForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user) {
      message(
        "reportMessage",
        "Faça login antes de enviar."
      );
      return;
    }

    const submitButton =
      $("btnSubmitReport");

    if (submitButton) {
      submitButton.disabled = true;
    }

    message(
      "reportMessage",
      "Enviando ocorrência..."
    );

    try {
      const title =
        $("reportTitle")?.value.trim() || "";

      const category =
        $("reportCategory")?.value || "";

      const priority =
        $("reportPriority")?.value || "Normal";

      const description =
        $("reportDescription")?.value.trim() || "";

      const file =
        $("reportPhoto")?.files?.[0] || null;

      const risk =
        $("reportRisk")?.checked || false;

      const noLocationRequired =
        category === "Documentação" ||
        category === "Jardinagem";

      const location =
        noLocationRequired
          ? ""
          : $("reportLocation")?.value || "";

      const reference =
        category === "Documentação"
          ? ""
          : $("reportReference")?.value.trim() || "";

      if (
        !title ||
        !category ||
        !priority ||
        !description
      ) {
        throw new Error(
          "Preencha todos os campos obrigatórios."
        );
      }

      if (
        !noLocationRequired &&
        !location
      ) {
        throw new Error(
          "Selecione o local da ocorrência."
        );
      }

      if (description.length < 10) {
        throw new Error(
          "A descrição deve ter pelo menos 10 caracteres."
        );
      }

      let fotoData = "";

      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(
            "A imagem original deve ter no máximo 10 MB."
          );
        }

        if (!file.type.startsWith("image/")) {
          throw new Error(
            "Selecione um arquivo de imagem válido."
          );
        }

        message(
          "reportMessage",
          "Reduzindo o tamanho da foto..."
        );

        fotoData =
          await compressImage(file);
      }

      const userSnapshot =
        await getDoc(
          doc(db, "users", user.uid)
        );

      const profile =
        userSnapshot.exists()
          ? userSnapshot.data()
          : {};

      const now = new Date();

      const protocol =
        `COND-${now .toISOString() .slice(0, 10) .replaceAll("-", "")}-${String( Date.now() ).slice(-5)}`;

      await addDoc(
        collection(db, "reports"),
        {
          protocolo: protocol,

          moradorId: user.uid,

          nome:
            profile.nome ||
            user.displayName ||
            "",

          email:
            user.email || "",

          unidade:
            profile.unidade || "",

          bloco:
            profile.bloco || "",

          titulo: title,
          categoria: category,
          prioridade: priority,
          local: location,
          referenciaLocal: reference,
          descricao: description,

          ofereceRisco: risk,

          status: "Aberto",

          dataAbertura:
            serverTimestamp(),

          dataAnalise: null,

          dataExecucao: null,

          dataResolvido: null,

          inicioEm:
            serverTimestamp(),

          fimEm: null,

          fotoData: fotoData,

          criadoEm:
            serverTimestamp(),

          atualizadoEm:
            serverTimestamp()
        }
      );

      const form =
        $("reportForm");

      if (form) {
        form.reset();
      }

      updateLocationFields();

      hide("reportFormCard");

      message(
        "reportMessage",
        ""
      );

      toast(
        `Registro enviado com sucesso. Protocolo: ${protocol}`
      );
    } catch (error) {
      message(
        "reportMessage",
        friendlyError(error)
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }
);

// =====================================================
// AUTENTICAÇÃO E CARREGAMENTO DOS REGISTROS
// =====================================================

onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      hide("appView");
      hide("registerView");
      show("loginView");

      $("btnLogout")?.classList.add(
        "hidden"
      );

      if (unsubscribeReports) {
        unsubscribeReports();
        unsubscribeReports = null;
      }

      return;
    }

    hide("loginView");
    hide("registerView");
    show("appView");

    $("btnLogout")?.classList.remove(
      "hidden"
    );

    addCategoryOptions();
    removeUpdatesField();
    updateLocationFields();

    try {
      const userSnapshot =
        await getDoc(
          doc(db, "users", user.uid)
        );

      const userData =
        userSnapshot.exists()
          ? userSnapshot.data()
          : {};

      setText(
        "userName",
        userData.nome ||
          user.displayName ||
          "Morador"
      );

      let reportsQuery;

      if (isAdmin(user)) {
        // O administrador vê todos os registros no index.html
        reportsQuery = query(
          collection(db, "reports"),
          orderBy("criadoEm", "desc")
        );
      } else {
        // O morador vê somente os próprios registros
        reportsQuery = query(
          collection(db, "reports"),
          where(
            "moradorId",
            "==",
            user.uid
          )
        );
      }

      if (unsubscribeReports) {
        unsubscribeReports();
      }

      unsubscribeReports =
        onSnapshot(
          reportsQuery,
          (snapshot) => {
            allReports =
              snapshot.docs
                .map((item) => ({
                  id: item.id,
                  ...item.data()
                }))
                .sort((a, b) => {
                  const dateA =
                    a.criadoEm?.toMillis?.() || 0;

                  const dateB =
                    b.criadoEm?.toMillis?.() || 0;

                  return dateB - dateA;
                });

            currentPage = 1;
            renderReports();
          },
          (error) => {
            console.error(
              "Erro ao carregar registros:",
              error
            );

            const list =
              $("reportsList");

            if (list) {
              list.innerHTML = ` <div class="empty-state"> ${escapeHtml( friendlyError(error) )} </div> `;
            }
          }
        );
    } catch (error) {
      console.error(
        "Erro ao carregar dados do usuário:",
        error
      );

      message(
        "reportMessage",
        friendlyError(error)
      );
    }
  }
);
