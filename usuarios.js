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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// VARIÁVEIS
// =====================================================

const $ = (id) =>
  document.getElementById(id);

let users = [];
let currentPage = 1;
let unsubscribeUsers = null;

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

function userStatusClass(status) {
  if (status === "Aprovado") {
    return "approved";
  }

  if (status === "Rejeitado") {
    return "rejected";
  }

  return "pending";
}

function toast(text) {
  const element =
    $("usersToast");

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

function showEditMessage( text, success = false ) {
  const element =
    $("userEditMessage");

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = success
    ? "message success"
    : "message";
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


// =====================================================
// FILTRO
// =====================================================

function getFilteredUsers() {
  const selectedStatus =
    $("userStatusFilter")?.value ||
    "Todos";

  const search =
    $("userSearch")?.value
      .trim()
      .toLowerCase() ||
    "";

  return users.filter((user) => {
    const status =
      user.status || "Pendente";

    const statusMatches =
      selectedStatus === "Todos" ||
      status === selectedStatus;

    const searchText = [
      user.nome,
      user.email,
      user.unidade,
      user.bloco,
      user.telefone
    ]
      .join(" ")
      .toLowerCase();

    const searchMatches =
      !search ||
      searchText.includes(search);

    return statusMatches &&
      searchMatches;
  });
}


// =====================================================
// CONTADORES
// =====================================================

function renderCounters() {
  const total =
    users.length;

  const pending =
    users.filter(
      (user) =>
        (user.status || "Pendente") ===
        "Pendente"
    ).length;

  const approved =
    users.filter(
      (user) =>
        user.status === "Aprovado"
    ).length;

  const rejected =
    users.filter(
      (user) =>
        user.status === "Rejeitado"
    ).length;

  const totalElement =
    $("usersTotal");

  const pendingElement =
    $("usersPending");

  const approvedElement =
    $("usersApproved");

  const rejectedElement =
    $("usersRejected");

  if (totalElement) {
    totalElement.textContent =
      total;
  }

  if (pendingElement) {
    pendingElement.textContent =
      pending;
  }

  if (approvedElement) {
    approvedElement.textContent =
      approved;
  }

  if (rejectedElement) {
    rejectedElement.textContent =
      rejected;
  }

  const noticeText =
    $("pendingNoticeText");

  if (pending > 0) {
    show("pendingNotice");

    if (noticeText) {
      noticeText.textContent =
        `${pending} cadastro(s) aguardando aprovação.`;
    }
  } else {
    hide("pendingNotice");
  }
}


// =====================================================
// LISTAGEM
// =====================================================

function renderUsers() {
  const list =
    $("usersList");

  if (!list) {
    return;
  }

  const filteredUsers =
    getFilteredUsers();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredUsers.length /
        pageSize
      )
    );

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start =
    (currentPage - 1) *
    pageSize;

  const visibleUsers =
    filteredUsers.slice(
      start,
      start + pageSize
    );

  if (visibleUsers.length === 0) {
    list.innerHTML = ` <div class="empty-state"> Nenhum usuário encontrado. </div> `;
  } else {
    list.innerHTML =
      visibleUsers
        .map((user) => {
          const status =
            user.status || "Pendente";

          const isPending =
            status === "Pendente";

          const whatsappButton =
            status === "Aprovado"
              ? ` <button class="user-icon-button whatsapp-user-button" data-user-id="${user.id}" type="button" title="Enviar WhatsApp" aria-label="Enviar WhatsApp" > <span>💬</span> </button> `
              : "";

          return ` <article class="user-item"> <div class="user-card-header"> <div class="user-name"> ${escapeHtml( user.nome || "Nome não informado" )} </div> </div> <div class="user-main"> <div class="user-meta"> E-mail: ${escapeHtml( user.email || "Não informado" )} </div> <div class="user-meta"> Unidade: ${escapeHtml( user.unidade || "Não informada" )} </div> ${ user.bloco ? ` <div class="user-meta"> Bloco: ${escapeHtml(user.bloco)} </div> ` : "" } ${ user.telefone ? ` <div class="user-meta"> Telefone: ${escapeHtml(user.telefone)} </div> ` : "" } <div class="user-meta"> Cadastro: ${formatDate(user.criadoEm)} </div> ${ user.aprovadoEm ? ` <div class="user-meta"> Aprovação: ${formatDate(user.aprovadoEm)} </div> ` : "" } ${ user.rejeitadoEm ? ` <div class="user-meta"> Rejeição: ${formatDate(user.rejeitadoEm)} </div> ` : "" } </div> <div class="user-card-status"> <span class="user-status ${userStatusClass(status)}" > ${escapeHtml(status)} </span> </div> <div class="user-actions"> <button class="user-icon-button detail-user-button" data-user-id="${user.id}" type="button" title="Visualizar usuário" aria-label="Visualizar usuário" > <span>🔍</span> </button> <button class="user-icon-button edit-user-button" data-user-id="${user.id}" type="button" title="Editar usuário" aria-label="Editar usuário" > <span>✏️</span> </button> ${whatsappButton} ${ isPending ? ` <button class="user-icon-button approve-button" data-user-id="${user.id}" type="button" title="Aprovar usuário" aria-label="Aprovar usuário" > <span>✓</span> </button> <button class="user-icon-button reject-button" data-user-id="${user.id}" type="button" title="Rejeitar usuário" aria-label="Rejeitar usuário" > <span>✕</span> </button> ` : "" } <button class="user-icon-button delete-user-button" data-user-id="${user.id}" type="button" title="Excluir usuário" aria-label="Excluir usuário" > <span>🗑️</span> </button> </div> </article> `;
        })
        .join("");
  }

  renderPagination(
    filteredUsers.length,
    totalPages
  );

  renderCounters();
}

function renderPagination( totalItems, totalPages ) {
  const pagination =
    $("usersPagination");

  if (!pagination) {
    return;
  }

  if (totalItems === 0) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = ` <button id="usersPrevPage" class="secondary-button" type="button" ${currentPage <= 1 ? "disabled" : ""} > Anterior </button> <span> Página ${currentPage} de ${totalPages} </span> <button id="usersNextPage" class="secondary-button" type="button" ${currentPage >= totalPages ? "disabled" : ""} > Próxima </button> `;
}


// =====================================================
// DETALHAMENTO
// =====================================================

function openUserDetails(userId) {
  const user =
    users.find(
      (item) => item.id === userId
    );

  if (!user) {
    return;
  }

  const status =
    user.status || "Pendente";

  const content =
    $("userDetailContent");

  if (!content) {
    return;
  }

  content.innerHTML = ` <span class="eyebrow"> DETALHAMENTO DO MORADOR </span> <h2> ${escapeHtml( user.nome || "Nome não informado" )} </h2> <div class="admin-detail-grid"> <div class="admin-detail-field"> <strong>E-mail</strong> <span> ${escapeHtml( user.email || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>Telefone</strong> <span> ${escapeHtml( user.telefone || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>Unidade</strong> <span> ${escapeHtml( user.unidade || "Não informada" )} </span> </div> <div class="admin-detail-field"> <strong>Bloco</strong> <span> ${escapeHtml( user.bloco || "Não informado" )} </span> </div> <div class="admin-detail-field"> <strong>Situação</strong> <span> <span class="user-status ${userStatusClass(status)}" > ${escapeHtml(status)} </span> </span> </div> <div class="admin-detail-field"> <strong>Data do cadastro</strong> <span> ${formatDate(user.criadoEm)} </span> </div> ${ user.aprovadoEm ? ` <div class="admin-detail-field"> <strong>Data da aprovação</strong> <span> ${formatDate(user.aprovadoEm)} </span> </div> ` : "" } ${ user.rejeitadoEm ? ` <div class="admin-detail-field"> <strong>Data da rejeição</strong> <span> ${formatDate(user.rejeitadoEm)} </span> </div> ` : "" } </div> `;

  show("userDetailModal");
}


// =====================================================
// EDIÇÃO DO USUÁRIO
// =====================================================

function openUserEdit(userId) {
  const user =
    users.find(
      (item) => item.id === userId
    );

  if (!user) {
    return;
  }

  const fields = {
    id: $("editUserId"),
    name: $("editUserName"),
    email: $("editUserEmail"),
    unit: $("editUserUnit"),
    block: $("editUserBlock"),
    phone: $("editUserPhone"),
    status: $("editUserStatus")
  };

  if (
    !fields.id ||
    !fields.name ||
    !fields.email ||
    !fields.unit ||
    !fields.block ||
    !fields.phone ||
    !fields.status
  ) {
    alert(
      "Os campos de edição não foram encontrados."
    );
    return;
  }

  fields.id.value =
    user.id;

  fields.name.value =
    user.nome || "";

  fields.email.value =
    user.email || "";

  fields.unit.value =
    user.unidade || "";

  fields.block.value =
    user.bloco || "";

  fields.phone.value =
    user.telefone || "";

  fields.status.value =
    user.status || "Pendente";

  showEditMessage("");
  show("userEditModal");
}

$("userEditForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const userId =
      $("editUserId")?.value;

    const name =
      $("editUserName")?.value.trim();

    const unit =
      $("editUserUnit")?.value.trim();

    const block =
      $("editUserBlock")?.value.trim();

    const phone =
      $("editUserPhone")?.value.trim();

    const status =
      $("editUserStatus")?.value;

    if (!userId) {
      showEditMessage(
        "Usuário não identificado."
      );
      return;
    }

    if (!name || name.length < 3) {
      showEditMessage(
        "Informe um nome válido."
      );
      return;
    }

    if (!unit) {
      showEditMessage(
        "Informe a unidade do usuário."
      );
      return;
    }

    if (!status) {
      showEditMessage(
        "Selecione uma situação."
      );
      return;
    }

    const saveButton =
      $("btnSaveUserEdit");

    if (saveButton) {
      saveButton.disabled = true;
    }

    try {
      const data = {
        nome: name,
        unidade: unit,
        bloco: block || "",
        telefone: phone || "",
        status,
        atualizadoEm:
          serverTimestamp()
      };

      if (status === "Aprovado") {
        data.aprovadoEm =
          serverTimestamp();

        data.rejeitadoEm = null;
      }

      if (status === "Rejeitado") {
        data.rejeitadoEm =
          serverTimestamp();

        data.aprovadoEm = null;
      }

      if (status === "Pendente") {
        data.aprovadoEm = null;
        data.rejeitadoEm = null;
      }

      await updateDoc(
        doc(db, "users", userId),
        data
      );

      hide("userEditModal");

      toast(
        "Usuário atualizado com sucesso."
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


// =====================================================
// APROVAÇÃO
// =====================================================

async function approveUser(userId) {
  const user =
    users.find(
      (item) => item.id === userId
    );

  if (!user) {
    return;
  }

  const confirmed = confirm(
    `Deseja aprovar o cadastro de ${ user.nome || user.email }?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await updateDoc(
      doc(db, "users", userId),
      {
        status: "Aprovado",
        aprovadoEm:
          serverTimestamp(),
        rejeitadoEm: null,
        atualizadoEm:
          serverTimestamp()
      }
    );

    toast(
      "Morador aprovado com sucesso."
    );
  } catch (error) {
    alert(
      friendlyError(error)
    );
  }
}

async function rejectUser(userId) {
  const user =
    users.find(
      (item) => item.id === userId
    );

  if (!user) {
    return;
  }

  const confirmed = confirm(
    `Deseja rejeitar o cadastro de ${ user.nome || user.email }?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await updateDoc(
      doc(db, "users", userId),
      {
        status: "Rejeitado",
        rejeitadoEm:
          serverTimestamp(),
        aprovadoEm: null,
        atualizadoEm:
          serverTimestamp()
      }
    );

    toast(
      "Cadastro rejeitado."
    );
  } catch (error) {
    alert(
      friendlyError(error)
    );
  }
}


// =====================================================
// WHATSAPP
// =====================================================

function sendWhatsAppUser(userId) {
  const user =
    users.find(
      (item) => item.id === userId
    );

  if (!user) {
    return;
  }

  if (user.status !== "Aprovado") {
    alert(
      "O WhatsApp só pode ser enviado para moradores aprovados."
    );
    return;
  }

  if (!user.telefone) {
    alert(
      "Este morador não possui telefone cadastrado."
    );
    return;
  }

  const telefone =
    String(user.telefone)
      .replace(/\D/g, "");

  if (!telefone) {
    alert(
      "O telefone cadastrado é inválido."
    );
    return;
  }

  const mensagem = [
    `Olá, ${user.nome || "morador"}!`,
    "",
    "Seu cadastro no sistema Amigos do Maui foi aprovado.",
    "",
    `Unidade: ${ user.unidade || "Não informada" }`,
    user.bloco
      ? `Bloco: ${user.bloco}`
      : "",
    "",
    "Sua situação está regularizada."
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl =
    `https://wa.me/${telefone}` +
    `?text=${encodeURIComponent(mensagem)}`;

  window.open(
    whatsappUrl,
    "_blank",
    "noopener,noreferrer"
  );
}


// =====================================================
// EXCLUSÃO
// =====================================================

async function deleteUserProfile(userId) {
  const user =
    users.find(
      (item) => item.id === userId
    );

  if (!user) {
    return;
  }

  const confirmed = confirm(
    `Deseja excluir o cadastro de ${ user.nome || user.email }?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(
      doc(db, "users", userId)
    );

    toast(
      "Cadastro excluído com sucesso."
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

document.addEventListener(
  "click",
  (event) => {
    const detailButton =
      event.target.closest(
        ".detail-user-button"
      );

    if (detailButton) {
      openUserDetails(
        detailButton.dataset.userId
      );
      return;
    }

    const editButton =
      event.target.closest(
        ".edit-user-button"
      );

    if (editButton) {
      openUserEdit(
        editButton.dataset.userId
      );
      return;
    }

    const whatsappButton =
      event.target.closest(
        ".whatsapp-user-button"
      );

    if (whatsappButton) {
      sendWhatsAppUser(
        whatsappButton.dataset.userId
      );
      return;
    }

    const approveButton =
      event.target.closest(
        ".approve-button"
      );

    if (approveButton) {
      approveUser(
        approveButton.dataset.userId
      );
      return;
    }

    const rejectButton =
      event.target.closest(
        ".reject-button"
      );

    if (rejectButton) {
      rejectUser(
        rejectButton.dataset.userId
      );
      return;
    }

    const deleteButton =
      event.target.closest(
        ".delete-user-button"
      );

    if (deleteButton) {
      deleteUserProfile(
        deleteButton.dataset.userId
      );
      return;
    }

    if (
      event.target.id ===
      "usersPrevPage"
    ) {
      if (currentPage > 1) {
        currentPage--;
        renderUsers();
      }

      return;
    }

    if (
      event.target.id ===
      "usersNextPage"
    ) {
      const totalPages =
        Math.max(
          1,
          Math.ceil(
            getFilteredUsers().length /
            pageSize
          )
        );

      if (currentPage < totalPages) {
        currentPage++;
        renderUsers();
      }
    }
  }
);


// =====================================================
// FILTROS
// =====================================================

$("userSearch")?.addEventListener(
  "input",
  () => {
    currentPage = 1;
    renderUsers();
  }
);

$("userStatusFilter")?.addEventListener(
  "change",
  () => {
    currentPage = 1;
    renderUsers();
  }
);


// =====================================================
// FECHAMENTO DOS MODAIS
// =====================================================

$("btnCloseUserDetail")?.addEventListener(
  "click",
  () => hide("userDetailModal")
);

$("userDetailModal")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id ===
      "userDetailModal"
    ) {
      hide("userDetailModal");
    }
  }
);

$("btnCloseUserEdit")?.addEventListener(
  "click",
  () => hide("userEditModal")
);

$("userEditModal")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target.id ===
      "userEditModal"
    ) {
      hide("userEditModal");
    }
  }
);


// =====================================================
// LOGOUT
// =====================================================

$("btnUsersLogout")?.addEventListener(
  "click",
  async () => {
    const confirmed = confirm(
      "Deseja realmente sair do controle de usuários?"
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
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(
  auth,
  (user) => {
    hide("usersLoadingView");

    if (!user) {
      show("usersDeniedView");
      hide("usersView");
      return;
    }

    if (
      user.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      show("usersDeniedView");
      hide("usersView");
      return;
    }

    hide("usersDeniedView");
    show("usersView");

    const adminName =
      $("usersAdminName");

    if (adminName) {
      adminName.textContent =
        user.displayName ||
        user.email ||
        "Administrador";
    }

    const usersQuery =
      query(
        collection(db, "users"),
        orderBy(
          "criadoEm",
          "desc"
        )
      );

    if (unsubscribeUsers) {
      unsubscribeUsers();
    }

    unsubscribeUsers =
      onSnapshot(
        usersQuery,
        (snapshot) => {
          users =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data()
              })
            );

          currentPage = 1;
          renderUsers();
        },
        (error) => {
          console.error(
            "Erro ao carregar usuários:",
            error
          );

          const list =
            $("usersList");

          if (list) {
            list.innerHTML = ` <div class="empty-state"> ${escapeHtml( friendlyError(error) )} </div> `;
          }
        }
      );
  }
);
