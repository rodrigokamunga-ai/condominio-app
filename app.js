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
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
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


// INICIALIZAÇÃO
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// VARIÁVEIS
const $ = (id) => document.getElementById(id);

let unsubscribeReports = null;
let allReports = [];
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
      "Permissão negada pelo Firebase.",

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


// COMPACTAÇÃO DA IMAGEM
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
            "A imagem ficou muito grande. Escolha uma foto menor."
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


// FILTRO DOS REGISTROS
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


// RENDERIZA A LISTA
function renderReports() {
  const list = $("reportsList");

  if (!list) {
    return;
  }

  const filteredReports = getFilteredReports();

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / pageSize)
  );

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex =
    (currentPage - 1) * pageSize;

  const visibleReports = filteredReports.slice(
    startIndex,
    startIndex + pageSize
  );

  if (visibleReports.length === 0) {
    list.innerHTML = ` <div class="empty-state"> Nenhum registro encontrado. </div> `;
  } else {
    list.innerHTML = visibleReports
      .map((report) => {
        const status = report.status || "Aberto";

        return ` <article class="report-item compact-report"> <div> <div class="report-title"> ${escapeHtml( report.titulo || "Sem título" )} </div> <div class="report-meta"> Protocolo: ${escapeHtml( report.protocolo || "Não informado" )} </div> <div class="report-meta"> Início: ${formatDate( report.inicioEm || report.criadoEm )} </div> ${ report.fimEm ? ` <div class="report-meta"> Fim: ${formatDate(report.fimEm)} </div> ` : "" } <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </div> <div class="report-actions">
  <button class="action-icon-button detail-button" data-id="${report.id}" type="button" title="Detalhar" aria-label="Detalhar ocorrência" > <span>🔍</span> </button>

  <button class="action-icon-button edit-button" data-id="${report.id}" type="button" title="Editar" aria-label="Editar ocorrência" > <span>✏️</span> </button>

  <button class="action-icon-button delete-button" data-id="${report.id}" type="button" title="Excluir" aria-label="Excluir ocorrência" > <span>🗑️</span> </button>
</div> </article> `;
      })
      .join("");
  }

  renderPagination(
    filteredReports.length,
    totalPages
  );

  setText("statTotal", allReports.length);

  setText(
    "statOpen",
    allReports.filter(
      (report) => report.status !== "Resolvido"
    ).length
  );

  setText(
    "statResolved",
    allReports.filter(
      (report) => report.status === "Resolvido"
    ).length
  );
}


// PAGINAÇÃO
function renderPagination(totalItems, totalPages) {
  const pagination = $("pagination");

  if (!pagination) {
    return;
  }

  if (totalItems === 0) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = ` <button id="prevPage" class="secondary-button" type="button" ${currentPage <= 1 ? "disabled" : ""} > Anterior </button> <span> Página ${currentPage} de ${totalPages} </span> <button id="nextPage" class="secondary-button" type="button" ${currentPage >= totalPages ? "disabled" : ""} > Próxima </button> `;
}


// DETALHAMENTO
function openDetails(reportId) {
  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  const status = report.status || "Aberto";

  const detailContent = $("detailContent");

  if (!detailContent) {
    return;
  }

  detailContent.innerHTML = ` <span class="eyebrow"> DETALHAMENTO DA OCORRÊNCIA </span> <h2> ${escapeHtml(report.titulo || "Sem título")} </h2> <p> <b>Protocolo:</b> ${escapeHtml( report.protocolo || "Não informado" )} </p> <p> <b>Status:</b> <span class="badge ${statusClass(status)}"> ${escapeHtml(status)} </span> </p> <p> <b>Categoria:</b> ${escapeHtml( report.categoria || "Não informada" )} </p> <p> <b>Prioridade:</b> ${escapeHtml( report.prioridade || "Não informada" )} </p> <p> <b>Local:</b> ${escapeHtml( report.local || "Não informado" )} </p> <p> <b>Referência:</b> ${escapeHtml( report.referenciaLocal || "Não informada" )} </p> <p> <b>Data de início:</b> ${formatDate( report.inicioEm || report.criadoEm )} </p> <p> <b>Data de fim:</b> ${formatDate(report.fimEm)} </p> <p> <b>Descrição:</b><br> ${escapeHtml( report.descricao || "Sem descrição" )} </p> <p> <b>Oferece risco:</b> ${report.ofereceRisco ? "Sim" : "Não"} </p> ${ report.fotoData ? ` <div class="report-photo-container"> <img class="detail-photo" src="${report.fotoData}" alt="Foto da ocorrência" /> </div> ` : "" } `;

  show("detailModal");
}


// ABRIR MODAL DE EDIÇÃO
function openEditModal(reportId) {
  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    return;
  }

  $("editReportId").value = report.id;
  $("editTitle").value = report.titulo || "";
  $("editCategory").value = report.categoria || "";
  $("editPriority").value = report.prioridade || "Normal";
  $("editLocation").value = report.local || "";
  $("editReference").value = report.referenciaLocal || "";
  $("editDescription").value = report.descricao || "";
  $("editStatus").value = report.status || "Aberto";

  message("editMessage", "");
  show("editModal");
}


// SALVAR EDIÇÃO
async function saveEdit(event) {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    message(
      "editMessage",
      "Você precisa estar autenticado."
    );
    return;
  }

  const reportId = $("editReportId")?.value;

  if (!reportId) {
    message(
      "editMessage",
      "Ocorrência não identificada."
    );
    return;
  }

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

  if (report.moradorId !== user.uid) {
    message(
      "editMessage",
      "Você só pode editar suas próprias ocorrências."
    );
    return;
  }

  const saveButton = $("btnSaveEdit");

  if (saveButton) {
    saveButton.disabled = true;
  }

  try {
    const status = $("editStatus").value;

    await updateDoc(
      doc(db, "reports", reportId),
      {
        titulo: $("editTitle").value.trim(),
        categoria: $("editCategory").value,
        prioridade: $("editPriority").value,
        local: $("editLocation").value,
        referenciaLocal: $("editReference").value.trim(),
        descricao: $("editDescription").value.trim(),
        status,

        fimEm:
          status === "Resolvido"
            ? serverTimestamp()
            : null,

        atualizadoEm: serverTimestamp()
      }
    );

    hide("editModal");
    toast("Ocorrência atualizada com sucesso.");
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


// EXCLUIR OCORRÊNCIA
async function deleteReport(reportId) {
  const user = auth.currentUser;

  if (!user) {
    alert("Você precisa estar autenticado.");
    return;
  }

  const report = allReports.find(
    (item) => item.id === reportId
  );

  if (!report) {
    alert("Ocorrência não encontrada.");
    return;
  }

  if (report.moradorId !== user.uid) {
    alert(
      "Você só pode excluir ocorrências criadas por você."
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

    toast("Ocorrência excluída com sucesso.");
  } catch (error) {
    console.error(
      "Erro ao excluir ocorrência:",
      error
    );

    alert(friendlyError(error));
  }
}


// EVENTOS DE CLIQUE
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
        getFilteredReports().length / pageSize
      )
    );

    if (currentPage < totalPages) {
      currentPage++;
      renderReports();
    }
  }
});


// FECHAR MODAL DE DETALHAMENTO
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


// FECHAR MODAL DE EDIÇÃO
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


// NAVEGAÇÃO DE LOGIN E CADASTRO
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


// NOVO REGISTRO
$("btnNewReport")?.addEventListener(
  "click",
  () => {
    show("reportFormCard");
    $("reportTitle")?.focus();
  }
);


// CANCELAR NOVO REGISTRO
$("btnCancelReport")?.addEventListener(
  "click",
  () => {
    hide("reportFormCard");
    $("reportForm")?.reset();
    message("reportMessage", "");
  }
);


// FILTRO
$("statusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    renderReports();
  }
);


// FORMULÁRIO DE LOGIN
$("loginForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    message("loginMessage", "Entrando...");

    const email = $("loginEmail")?.value.trim();
    const password = $("loginPassword")?.value;

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
    } catch (error) {
      message(
        "loginMessage",
        friendlyError(error)
      );
    }
  }
);


// FORMULÁRIO DE CADASTRO
$("registerForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    message(
      "registerMessage",
      "Criando cadastro..."
    );

    const name = $("registerName")?.value.trim();
    const unit = $("registerUnit")?.value.trim();
    const block = $("registerBlock")?.value.trim();
    const phone = $("registerPhone")?.value.trim();
    const email = $("registerEmail")?.value.trim();
    const password = $("registerPassword")?.value;

    if (!name || !unit || !email || !password) {
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

      await updateProfile(credential.user, {
        displayName: name
      });

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          uid: credential.user.uid,
          nome: name,
          unidade: unit,
          bloco: block || "",
          telefone: phone || "",
          email,
          criadoEm: serverTimestamp()
        }
      );

      message(
        "registerMessage",
        "Cadastro criado com sucesso.",
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


// LOGOUT
$("btnLogout")?.addEventListener(
  "click",
  () => signOut(auth)
);


// ENVIO DE NOVA OCORRÊNCIA
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

    const submitButton = $("btnSubmitReport");

    if (submitButton) {
      submitButton.disabled = true;
    }

    message(
      "reportMessage",
      "Enviando ocorrência..."
    );

    try {
      const title = $("reportTitle")?.value.trim();
      const category = $("reportCategory")?.value;
      const priority = $("reportPriority")?.value;
      const location = $("reportLocation")?.value;
      const reference = $("reportReference")?.value.trim();
      const description = $("reportDescription")?.value.trim();
      const risk = $("reportRisk")?.checked || false;
      const updates = $("reportUpdates")?.checked || false;
      const file = $("reportPhoto")?.files?.[0];

      if (
        !title ||
        !category ||
        !priority ||
        !location ||
        !description
      ) {
        throw new Error(
          "Preencha todos os campos obrigatórios."
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

        fotoData = await compressImage(file);
      }

      const userSnapshot = await getDoc(
        doc(db, "users", user.uid)
      );

      const profile = userSnapshot.exists()
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

          nome: profile.nome ||
            user.displayName ||
            "",

          email: user.email || "",
          unidade: profile.unidade || "",
          bloco: profile.bloco || "",

          titulo: title,
          categoria: category,
          prioridade: priority,
          local: location,
          referenciaLocal: reference || "",
          descricao: description,

          ofereceRisco: risk,
          desejaAtualizacao: updates,

          status: "Aberto",

          inicioEm: serverTimestamp(),
          fimEm: null,

          fotoData,

          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp()
        }
      );

      $("reportForm")?.reset();
      hide("reportFormCard");
      message("reportMessage", "");

      toast(
        `Registro enviado. Protocolo: ${protocol}`
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


// AUTENTICAÇÃO E CARREGAMENTO DOS REGISTROS
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    hide("appView");
    hide("registerView");
    show("loginView");

    $("btnLogout")?.classList.add("hidden");

    if (unsubscribeReports) {
      unsubscribeReports();
      unsubscribeReports = null;
    }

    return;
  }

  hide("loginView");
  hide("registerView");
  show("appView");

  $("btnLogout")?.classList.remove("hidden");

  try {
    const userSnapshot = await getDoc(
      doc(db, "users", user.uid)
    );

    const userData = userSnapshot.exists()
      ? userSnapshot.data()
      : {};

    setText(
      "userName",
      userData.nome ||
        user.displayName ||
        "Morador"
    );

    // Carrega somente as ocorrências do morador logado
    const reportsQuery = query(
      collection(db, "reports"),
      where("moradorId", "==", user.uid)
    );

    if (unsubscribeReports) {
      unsubscribeReports();
    }

    unsubscribeReports = onSnapshot(
      reportsQuery,
      (snapshot) => {
        allReports = snapshot.docs
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

        const list = $("reportsList");

        if (list) {
          list.innerHTML = ` <div class="empty-state"> ${escapeHtml( friendlyError(error) )} </div> `;
        }
      }
    );
  } catch (error) {
    console.error(
      "Erro ao carregar usuário:",
      error
    );

    message(
      "reportMessage",
      friendlyError(error)
    );
  }
});


// FORMULÁRIO DE EDIÇÃO
$("editForm")?.addEventListener(
  "submit",
  saveEdit
);


