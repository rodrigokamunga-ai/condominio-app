import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


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


// =====================================================
// INICIALIZAÇÃO
// =====================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

const $ = (id) =>
  document.getElementById(id);

function message( id, text, success = false ) {
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

function friendlyError(error) {
  console.error("Erro completo:", error);

  const errors = {
    "permission-denied":
      "Permissão negada pelas regras do Firebase.",

    "auth/network-request-failed":
      "Falha de conexão com a internet.",

    "auth/requires-recent-login":
      "Por segurança, faça login novamente para continuar."
  };

  if (errors[error?.code]) {
    return errors[error.code];
  }

  return error?.message ||
    "Não foi possível concluir a operação.";
}


// =====================================================
// CARREGAR DADOS DO PERFIL
// =====================================================

async function loadProfile(user) {
  const snapshot =
    await getDoc(
      doc(db, "users", user.uid)
    );

  const profile =
    snapshot.exists()
      ? snapshot.data()
      : {};

  $("profileName").value =
    profile.nome ||
    user.displayName ||
    "";

  $("profileUnit").value =
    profile.unidade ||
    "";

  $("profileBlock").value =
    profile.bloco ||
    "";

  $("profilePhone").value =
    profile.telefone ||
    "";

  $("profileEmail").value =
    user.email ||
    profile.email ||
    "";
}


// =====================================================
// SALVAR PERFIL
// =====================================================

$("profileForm")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const user =
      auth.currentUser;

    if (!user) {
      message(
        "profileMessage",
        "Você precisa estar logado para editar seu perfil."
      );
      return;
    }

    const name =
      $("profileName")?.value.trim() ||
      "";

    const unit =
      $("profileUnit")?.value.trim() ||
      "";

    const block =
      $("profileBlock")?.value.trim() ||
      "";

    const phone =
      $("profilePhone")?.value.trim() ||
      "";

    if (!name || name.length < 3) {
      message(
        "profileMessage",
        "Informe um nome válido."
      );
      return;
    }

    if (!unit) {
      message(
        "profileMessage",
        "Informe a unidade ou apartamento."
      );
      return;
    }

    const button =
      $("btnSaveProfile");

    if (button) {
      button.disabled = true;
    }

    message(
      "profileMessage",
      "Salvando alterações..."
    );

    try {
      await updateProfile(
        user,
        {
          displayName: name
        }
      );

      await updateDoc(
        doc(db, "users", user.uid),
        {
          nome: name,
          unidade: unit,
          bloco: block,
          telefone: phone,
          atualizadoEm:
            serverTimestamp()
        }
      );

      message(
        "profileMessage",
        "Dados atualizados com sucesso.",
        true
      );

      toast(
        "Perfil atualizado com sucesso."
      );
    } catch (error) {
      message(
        "profileMessage",
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
// LOGOUT
// =====================================================

$("btnLogout")?.addEventListener(
  "click",
  async () => {
    const confirmed =
      confirm(
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
      message(
        "profileMessage",
        friendlyError(error)
      );
    }
  }
);


// =====================================================
// AUTENTICAÇÃO
// =====================================================

onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      window.location.href =
        "./index.html";

      return;
    }

    try {
      await loadProfile(user);
    } catch (error) {
      message(
        "profileMessage",
        friendlyError(error)
      );
    }
  }
);
