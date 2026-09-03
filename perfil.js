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

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


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

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

const $ = (id) =>
  document.getElementById(id);


function show(id) {
  const element =
    $(id);

  if (element) {
    element.classList.remove(
      "hidden"
    );
  }
}


function hide(id) {
  const element =
    $(id);

  if (element) {
    element.classList.add(
      "hidden"
    );
  }
}


function message( id, text, success = false ) {
  const element =
    $(id);

  if (!element) {
    return;
  }

  element.textContent =
    text;

  element.className =
    success
      ? "message success"
      : "message";
}


function toast(text) {
  const element =
    $("toast");

  if (!element) {
    alert(text);
    return;
  }

  element.textContent =
    text;

  element.classList.add(
    "show"
  );

  setTimeout(
    () => {
      element.classList.remove(
        "show"
      );
    },
    3500
  );
}


function friendlyError(error) {
  console.error(
    "Erro completo:",
    error
  );

  const errors = {
    "permission-denied":
      "Permissão negada pelas regras do Firebase.",

    "auth/network-request-failed":
      "Falha de conexão com a internet.",

    "auth/requires-recent-login":
      "Por segurança, faça login novamente para continuar."
  };

  if (
    errors[error?.code]
  ) {
    return errors[
      error.code
    ];
  }

  return error?.message ||
    "Não foi possível concluir a operação.";
}


// =====================================================
// MENU SUSPENSO
// =====================================================

const menuButton =
  $("btnMenu");

const mainMenu =
  $("mainMenu");


menuButton?.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    const menuIsOpen =
      !mainMenu?.classList.contains(
        "hidden"
      );

    if (menuIsOpen) {
      mainMenu?.classList.add(
        "hidden"
      );

      menuButton.setAttribute(
        "aria-expanded",
        "false"
      );
    } else {
      mainMenu?.classList.remove(
        "hidden"
      );

      menuButton.setAttribute(
        "aria-expanded",
        "true"
      );
    }
  }
);


mainMenu?.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
  }
);


document.addEventListener(
  "click",
  () => {
    mainMenu?.classList.add(
      "hidden"
    );

    menuButton?.setAttribute(
      "aria-expanded",
      "false"
    );
  }
);


// =====================================================
// CARREGAR DADOS DO PERFIL
// =====================================================

async function loadProfile(user) {
  const snapshot =
    await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );

  const profile =
    snapshot.exists()
      ? snapshot.data()
      : {};

  const profileName =
    $("profileName");

  const profileUnit =
    $("profileUnit");

  const profileBlock =
    $("profileBlock");

  const profilePhone =
    $("profilePhone");

  const profileEmail =
    $("profileEmail");

  if (profileName) {
    profileName.value =
      profile.nome ||
      user.displayName ||
      "";
  }

  if (profileUnit) {
    profileUnit.value =
      profile.unidade ||
      "";
  }

  if (profileBlock) {
    profileBlock.value =
      profile.bloco ||
      "";
  }

  if (profilePhone) {
    profilePhone.value =
      profile.telefone ||
      "";
  }

  if (profileEmail) {
    profileEmail.value =
      user.email ||
      profile.email ||
      "";
  }
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

    if (
      !name ||
      name.length < 3
    ) {
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
      button.disabled =
        true;

      button.textContent =
        "Salvando...";
    }

    message(
      "profileMessage",
      "Salvando alterações..."
    );

    try {
      await updateProfile(
        user,
        {
          displayName:
            name
        }
      );

      await updateDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          nome:
            name,

          unidade:
            unit,

          bloco:
            block,

          telefone:
            phone,

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
        button.disabled =
          false;

        button.textContent =
          "Salvar alterações";
      }
    }
  }
);


// =====================================================
// LOGOUT COM MODAL
// =====================================================

$("btnLogout")?.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    hide("mainMenu");

    menuButton?.setAttribute(
      "aria-expanded",
      "false"
    );

    show("logoutModal");
  }
);


$("btnCloseLogout")?.addEventListener(
  "click",
  () => {
    hide("logoutModal");
  }
);


$("btnCancelLogout")?.addEventListener(
  "click",
  () => {
    hide("logoutModal");
  }
);


$("logoutModal")?.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      $("logoutModal")
    ) {
      hide("logoutModal");
    }
  }
);


$("btnConfirmLogout")?.addEventListener(
  "click",
  async () => {
    const button =
      $("btnConfirmLogout");

    if (button) {
      button.disabled =
        true;

      button.textContent =
        "Saindo...";
    }

    try {
      await signOut(auth);

      hide("logoutModal");

      window.location.href =
        "./index.html";
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );

      message(
        "profileMessage",
        friendlyError(error)
      );

      if (button) {
        button.disabled =
          false;

        button.textContent =
          "Sair do sistema";
      }
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
      await loadProfile(
        user
      );
    } catch (error) {
      message(
        "profileMessage",
        friendlyError(error)
      );
    }
  }
);
