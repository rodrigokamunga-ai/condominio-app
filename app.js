import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
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
  "5511999999999";


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

function toDate(value) {
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

function isAdmin(user) {
  return Boolean(
    user?.email &&
    user.email.toLowerCase() ===
      ADMIN_EMAIL.toLowerCase()
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

  return error?.message ||
    "Não foi possível concluir a operação.";
}


// =====================================================
// VALIDAÇÃO DE SENHA
// =====================================================

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
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

      const canvas =
        document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context =
        canvas.getContext("2d");

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

      const imageData =
        canvas.toDataURL(
          "image/jpeg",
          quality
        );

      const approximateSize =
        Math.round(
          (imageData.length * 3) / 4
        );

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
        new Error("Imagem inválida.")
      );
    };

    reader.readAsDataURL(file);
  });
}


// =====================================================
// CATEGORIAS
// =====================================================

function addCategoryOptions() {
  const category =
    $("reportCategory");

  if (!category) {
    return;
  }

  const options = [
    "Documentação",
    "Jardinagem"
  ];

  options.forEach((value) => {
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

function addEditCategoryOptions() {
  const category =
    $("editCategory");

  if (!category) {
    return;
  }

  const options = [
    "Documentação",
    "Jardinagem"
  ];

  options.forEach((value) => {
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


// =====================================================
// CAMPOS DE LOCAL
// =====================================================

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

function removeUpdatesField() {
  const updates =
    $("reportUpdates");

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
// DATAS E LINHA DO TEMPO
// =====================================================

function openingDate(report) {
  return report.dataAbertura ||
    report.inicioEm ||
    report.criadoEm;
}

function resolvedDate(report) {
  return report.dataResolvido ||
    report.fimEm;
}

function calculateDays( startValue, endValue = null ) {
  const start =
    toDate(startValue);

  if (!start) {
    return "Não informado";
  }

  const end =
    toDate(endValue) ||
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
// FILTRO E LISTAGEM
// =====================================================

function getFilteredReports() {
  const selectedStatus =
    $("statusFilter")?.value || "Todos";

  if (selectedStatus === "Todos") {
    return allReports;
  }

  return allReports.filter(
    (report) =>
      (report.status || "Aberto") ===
      selectedStatus
  );
}

function renderReports() {
  const list =
    $("reportsList");

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
    list.innerHTML = ` <div class="empty-state"> Nenhum registro encontrado. </div> `;
  } else {
    list.innerHTML =
      visibleReports.map((report) => {
        const status =
          report.status || "Aberto";

        return ` <article class="report-item compact-report"> <div> <div class="report-title"> ${escapeHtml( report.titulo || "Sem título" )} </div> <div class="report-meta"> Protocolo: ${escapeHtml( report.protocolo || "Não informado" )} </div> <div class="report-meta"> Início: ${formatDate( openingDate(report) )} </div> ${ resolvedDate(report) ? ` <div class="report-meta"> Fim: ${formatDate( resolvedDate(report) )} </div> ` : "" } <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </div> <div class="report-actions"> <button class="action-icon-button detail-button" data-id="${report.id}" type="button" title="Detalhar" aria-label="Detalhar ocorrência" > 🔍 </button> <button class="action-icon-button timeline-button" data-id="${report.id}" type="button" title="Linha do tempo" aria-label="Linha do tempo" > 🕒 </button> <button class="action-icon-button edit-button" data-id="${report.id}" type="button" title="Editar" aria-label="Editar ocorrência" > ✏️ </button> <button class="action-icon-button whatsapp-button" data-id="${report.id}" type="button" title="Enviar pelo WhatsApp" aria-label="Enviar pelo WhatsApp" > 💬 </button> <button class="action-icon-button email-button" data-id="${report.id}" type="button" title="Enviar por e-mail" aria-label="Enviar por e-mail" > ✉️ </button> <button class="action-icon-button delete-button" data-id="${report.id}" type="button" title="Excluir" aria-label="Excluir ocorrência" > 🗑️ </button> </div> </article> `;
      }).join("");
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
  const report =
    allReports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  const content =
    $("detailContent");

  if (!content) {
    return;
  }

  const status =
    report.status || "Aberto";

  content.innerHTML = ` <span class="eyebrow"> DETALHAMENTO DA OCORRÊNCIA </span> <h2> ${escapeHtml( report.titulo || "Sem título" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <p> <b>Status:</b> <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </p> <p> <b>Categoria:</b> ${escapeHtml( report.categoria || "Não informada" )} </p> <p> <b>Prioridade:</b> ${escapeHtml( report.prioridade || "Não informada" )} </p> <p> <b>Local:</b> ${escapeHtml( report.local || "Não informado" )} </p> <p> <b>Referência:</b> ${escapeHtml( report.referenciaLocal || "Não informada" )} </p> <p> <b>Data de abertura:</b> ${formatDate( openingDate(report) )} </p> <p> <b>Data em análise:</b> ${formatDate( report.dataAnalise )} </p> <p> <b>Data em execução:</b> ${formatDate( report.dataExecucao )} </p> <p> <b>Data de resolução:</b> ${formatDate( resolvedDate(report) )} </p> <p> <b>Descrição:</b><br> ${escapeHtml( report.descricao || "Sem descrição" )} </p> ${ report.fotoData ? ` <div class="report-photo-container"> <img class="detail-photo" src="${report.fotoData}" alt="Foto da ocorrência" /> </div> ` : "" } `;

  show("detailModal");
}


// =====================================================
// LINHA DO TEMPO
// =====================================================

function openTimeline(reportId) {
  const report =
    allReports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  const modal =
    getOrCreateTimelineModal();

  const content =
    modal.querySelector(
      "#timelineContent"
    );

  if (!content) {
    return;
  }

  const abertura =
    openingDate(report);

  const analise =
    report.dataAnalise;

  const execucao =
    report.dataExecucao;

  const resolvido =
    resolvedDate(report);

  content.innerHTML = ` <span class="eyebrow"> LINHA DO TEMPO </span> <h2> ${escapeHtml( report.titulo || "Ocorrência" )} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <div class="timeline"> <div class="timeline-item completed"> <div class="timeline-dot">1</div> <div class="timeline-content"> <strong>Abertura</strong> <span> ${formatDate(abertura)} </span> <small> ${ analise ? `Aberta por ${calculateDays( abertura, analise )}` : `Aberta há ${calculateDays( abertura )}` } </small> </div> </div> <div class="timeline-item ${analise ? "completed" : "pending"}"> <div class="timeline-dot">2</div> <div class="timeline-content"> <strong>Em análise</strong> <span> ${formatDate(analise)} </span> <small> ${ analise ? execucao ? `Em análise por ${calculateDays( analise, execucao )}` : resolvido ? `Em análise por ${calculateDays( analise, resolvido )}` : `Em análise há ${calculateDays( analise )}` : "Ainda não entrou em análise" } </small> </div> </div> <div class="timeline-item ${execucao ? "completed" : "pending"}"> <div class="timeline-dot">3</div> <div class="timeline-content"> <strong>Em execução</strong> <span> ${formatDate(execucao)} </span> <small> ${ execucao ? resolvido ? `Em execução por ${calculateDays( execucao, resolvido )}` : `Em execução há ${calculateDays( execucao )}` : "Ainda não entrou em execução" } </small> </div> </div> <div class="timeline-item ${resolvido ? "completed" : "pending"}"> <div class="timeline-dot">4</div> <div class="timeline-content"> <strong>Resolvido</strong> <span> ${formatDate(resolvido)} </span> <small> ${ resolvido ? "Ocorrência finalizada" : "Ainda não resolvido" } </small> </div> </div> </div> `;

  show("timelineModal");
}

function getOrCreateTimelineModal() {
  let modal =
    $("timelineModal");

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
// E-MAIL
// =====================================================

function sendReportByEmail(reportId) {
  const report =
    allReports.find(
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
    `Data e horário: ${formatDate( openingDate(report) )}`,
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

  window.location.href = mailto;
}


// =====================================================
// WHATSAPP
// =====================================================

function sendReportByWhatsApp(reportId) {
  const report =
    allReports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  const messageText = [
    `Título: ${report.titulo || "Não informado"}`,
    `Local: ${report.local || "Não informado"}`,
    `Referência: ${report.referenciaLocal || "Não informada"}`,
    `Descrição da ocorrência: ${ report.descricao || "Não informada" }`,
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
// EDIÇÃO
// =====================================================

function openEditModal(reportId) {
  const report =
    allReports.find(
      (item) => item.id === reportId
    );

  if (!report) {
    return;
  }

  addEditCategoryOptions();

  $("editReportId").value =
    report.id;

  $("editTitle").value =
    report.titulo || "";

  $("editCategory").value =
    report.categoria || "";

  $("editPriority").value =
    report.prioridade || "Normal";

  $("editLocation").value =
    report.local || "";

  $("editReference").value =
    report.referenciaLocal || "";

  $("editDescription").value =
    report.descricao || "";

  $("editStatus").value =
    report.status || "Aberto";

  updateEditLocationFields();

  message("editMessage", "");
  show("editModal");
}

$("editForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const reportId =
      $("editReportId")?.value;

    const report =
      allReports.find(
        (item) => item.id === reportId
      );

    if (!report) {
      message(
        "editMessage",
        "Ocorrência não encontrada."
      );
      return;
    }

    const category =
      $("editCategory")?.value;

    const documentation =
      category === "Documentação";

    const noLocationRequired =
      documentation ||
      category === "Jardinagem";

    const title =
      $("editTitle")?.value.trim();

    const description =
      $("editDescription")?.value.trim();

    const location =
      noLocationRequired
        ? ""
        : $("editLocation")?.value || "";

    const reference =
      documentation
        ? ""
        : $("editReference")?.value.trim() || "";

    const status =
      $("editStatus")?.value ||
      "Aberto";

    if (!title || title.length < 3) {
      message(
        "editMessage",
        "Informe um título válido."
      );
      return;
    }

    if (
      !noLocationRequired &&
      !location
    ) {
      message(
        "editMessage",
        "Informe o local da ocorrência."
      );
      return;
    }

    if (
      !description ||
      description.length < 10
    ) {
      message(
        "editMessage",
        "A descrição deve ter pelo menos 10 caracteres."
      );
      return;
    }

    const button =
      $("btnSaveEdit");

    if (button) {
      button.disabled = true;
    }

    try {
      await updateDoc(
        doc(db, "reports", reportId),
        {
          titulo: title,
          categoria: category,
          prioridade:
            $("editPriority")?.value ||
            "Normal",
          local: location,
          referenciaLocal: reference,
          descricao: description,
          status,

          dataAnalise:
            status === "Em análise"
              ? report.dataAnalise ||
                serverTimestamp()
              : report.dataAnalise ||
                null,

          dataExecucao:
            status === "Em execução"
              ? report.dataExecucao ||
                serverTimestamp()
              : report.dataExecucao ||
                null,

          dataResolvido:
            status === "Resolvido"
              ? report.dataResolvido ||
                serverTimestamp()
              : report.dataResolvido ||
                null,

          fimEm:
            status === "Resolvido"
              ? report.fimEm ||
                serverTimestamp()
              : report.fimEm ||
                null,

          atualizadoEm:
            serverTimestamp()
        }
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
      if (button) {
        button.disabled = false;
      }
    }
  }
);


// =====================================================
// EXCLUSÃO
// =====================================================

async function deleteReport(reportId) {
  const user =
    auth.currentUser;

  if (!user) {
    alert(
      "Você precisa estar autenticado."
    );
    return;
  }

  const report =
    allReports.find(
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
    alert(
      friendlyError(error)
    );
  }
}


// =====================================================
// EVENTOS
// =====================================================

$("reportCategory")?.addEventListener(
  "change",
  updateLocationFields
);

$("editCategory")?.addEventListener(
  "change",
  updateEditLocationFields
);

$("statusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    renderReports();
  }
);

$("btnShowRegister")?.addEventListener(
  "click",
  () => {
    hide("loginView");
    hide("forgotPasswordView");
    show("registerView");
  }
);

$("btnBackLogin")?.addEventListener(
  "click",
  () => {
    hide("registerView");
    hide("forgotPasswordView");
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

$("btnCloseDetail")?.addEventListener(
  "click",
  () => hide("detailModal")
);

$("detailModal")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id ===
      "detailModal"
    ) {
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
    if (
      event.target.id ===
      "editModal"
    ) {
      hide("editModal");
    }
  }
);

$("btnLogout")?.addEventListener(
  "click",
  () => signOut(auth)
);


// =====================================================
// PAGINAÇÃO E AÇÕES DOS REGISTROS
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
      const totalPages =
        Math.max(
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
// ESQUECI MINHA SENHA
// =====================================================

$("btnForgotPassword")?.addEventListener(
  "click",
  () => {
    hide("loginView");
    hide("registerView");
    show("forgotPasswordView");

    const email =
      $("loginEmail")?.value.trim();

    if (
      email &&
      $("forgotPasswordEmail")
    ) {
      $("forgotPasswordEmail").value =
        email;
    }
  }
);

$("btnBackToLogin")?.addEventListener(
  "click",
  () => {
    hide("forgotPasswordView");
    show("loginView");
  }
);

$("forgotPasswordForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const email =
      $("forgotPasswordEmail")?.value.trim();

    if (!email) {
      message(
        "forgotPasswordMessage",
        "Informe seu e-mail."
      );
      return;
    }

    message(
      "forgotPasswordMessage",
      "Enviando link de redefinição..."
    );

    try {
      await sendPasswordResetEmail(
        auth,
        email
      );

      message(
        "forgotPasswordMessage",
        "Se o e-mail estiver cadastrado, o link de redefinição foi enviado.",
        true
      );
    } catch (error) {
      message(
        "forgotPasswordMessage",
        friendlyError(error)
      );
    }
  }
);


// =====================================================
// CADASTRO
// =====================================================

$("registerForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

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
      $("registerPassword")?.value || "";

    const passwordConfirm =
      $("registerPasswordConfirm")
        ?.value || "";

    const acceptedTerms =
      $("acceptTerms")?.checked || false;

    if (
      !name ||
      !unit ||
      !email ||
      !password ||
      !passwordConfirm
    ) {
      message(
        "registerMessage",
        "Preencha todos os campos obrigatórios."
      );
      return;
    }

    if (!isStrongPassword(password)) {
      message(
        "registerMessage",
        "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial."
      );
      return;
    }

    if (password !== passwordConfirm) {
      message(
        "registerMessage",
        "As senhas não são iguais."
      );
      return;
    }

    if (!acceptedTerms) {
      message(
        "registerMessage",
        "Aceite os termos de uso e a política de privacidade."
      );
      return;
    }

    message(
      "registerMessage",
      "Criando cadastro..."
    );

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

          termosAceitos: true,
          termosAceitosEm:
            serverTimestamp(),

          criadoEm:
            serverTimestamp(),

          aprovadoEm: null,
          rejeitadoEm: null,
          atualizadoEm:
            serverTimestamp()
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
// LOGIN E APROVAÇÃO
// =====================================================

$("loginForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

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

    message(
      "loginMessage",
      "Entrando..."
    );

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user =
        auth.currentUser;

      if (
        user &&
        !isAdmin(user)
      ) {
        const snapshot =
          await getDoc(
            doc(db, "users", user.uid)
          );

        const data =
          snapshot.exists()
            ? snapshot.data()
            : {};

        const status =
          data.status || "Pendente";

        if (status !== "Aprovado") {
          await signOut(auth);

          throw new Error(
            status === "Pendente"
              ? "Seu cadastro ainda aguarda aprovação do administrador."
              : "Seu cadastro não está autorizado a acessar o sistema."
          );
        }
      }

      if (user && isAdmin(user)) {
        window.location.href =
          "./admin-home.html";
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
// AUTENTICAÇÃO E CARREGAMENTO
// =====================================================

onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      hide("appView");
      hide("registerView");
      hide("forgotPasswordView");
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
    hide("forgotPasswordView");
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
        reportsQuery = query(
          collection(db, "reports"),
          orderBy("criadoEm", "desc")
        );
      } else {
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
                    a.criadoEm?.toMillis?.() ||
                    0;

                  const dateB =
                    b.criadoEm?.toMillis?.() ||
                    0;

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
        "Erro ao carregar dados:",
        error
      );

      message(
        "reportMessage",
        friendlyError(error)
      );
    }
  }
);
