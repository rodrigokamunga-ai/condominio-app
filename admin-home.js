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
  doc,
  getDoc
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

const ADMIN_EMAIL =
  "rodrigokamunga@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// FUNÇÕES AUXILIARES
const $ = (id) =>
  document.getElementById(id);

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


// LOGOUT
$("btnAdminHomeLogout")?.addEventListener(
  "click",
  async () => {
    await signOut(auth);
    window.location.href = "index.html";
  }
);


// AUTENTICAÇÃO
onAuthStateChanged(auth, async (user) => {
  hide("adminHomeLoading");

  if (!user) {
    show("adminHomeDenied");
    hide("adminHomeContent");
    return;
  }

  const email =
    user.email?.toLowerCase() || "";

  if (
    email !== ADMIN_EMAIL.toLowerCase()
  ) {
    show("adminHomeDenied");
    hide("adminHomeContent");
    return;
  }

  try {
    const userSnapshot = await getDoc(
      doc(db, "users", user.uid)
    );

    const userData = userSnapshot.exists()
      ? userSnapshot.data()
      : {};

    const name =
      userData.nome ||
      user.displayName ||
      "Administrador";

    const nameElement =
      $("adminHomeName");

    const emailElement =
      $("adminHomeEmail");

    if (nameElement) {
      nameElement.textContent = name;
    }

    if (emailElement) {
      emailElement.textContent =
        user.email;
    }

    hide("adminHomeDenied");
    show("adminHomeContent");
  } catch (error) {
    console.error(
      "Erro ao carregar administrador:",
      error
    );

    show("adminHomeDenied");
    hide("adminHomeContent");
  }
});
