import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const $ = id => document.getElementById(id);

let reports = [];
let page = 1;
const pageSize = 10;

const show = id => $(id)?.classList.remove("hidden");
const hide = id => $(id)?.classList.add("hidden");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
}[c]));
const date = v => v?.toDate ? v.toDate().toLocaleString("pt-BR") : "Não informada";
const statusClass = s => s === "Resolvido" ? "done" : (s === "Em análise" || s === "Em execução" ? "progress" : "open");

function render() {
  const filter = $("publicStatusFilter")?.value || "Todos";
  const rows = filter === "Todos" ? reports : reports.filter(r => (r.status || "Aberto") === filter);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (page > pages) page = pages;

  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const list = $("publicReportsList");

  if (!list) return;

  list.innerHTML = visible.length ? visible.map(r => `
    <article class="report-item public-report">
      <div>
        <div class="report-title">${esc(r.titulo || "Sem título")}</div>
        <div class="report-meta">Protocolo: ${esc(r.protocolo || "Não informado")}</div>
        <div class="report-meta">Início: ${date(r.inicioEm || r.criadoEm)}</div>
        ${r.fimEm ? `<div class="report-meta">Fim: ${date(r.fimEm)}</div>` : ""}
      </div>
      <button class="secondary-button public-detail-button" data-id="${r.id}" type="button">Detalhar</button>
    </article>
  `).join("") : `<div class="empty-state">Nenhuma ocorrência encontrada.</div>`;

  $("publicPagination").innerHTML = `
    <button id="publicPrevPage" class="secondary-button" ${page <= 1 ? "disabled" : ""}>Anterior</button>
    <span>Página ${page} de ${pages}</span>
    <button id="publicNextPage" class="secondary-button" ${page >= pages ? "disabled" : ""}>Próxima</button>
  `;
}

function openDetails(id) {
  const r = reports.find(item => item.id === id);
  if (!r) return;

  $("publicDetailContent").innerHTML = `
    <span class="eyebrow">DETALHAMENTO DA OCORRÊNCIA</span>
    <h2>${esc(r.titulo || "Sem título")}</h2>
    <p><b>Protocolo:</b> ${esc(r.protocolo || "Não informado")}</p>
    <p><b>Status:</b> <span class="badge ${statusClass(r.status)}">${esc(r.status || "Aberto")}</span></p>
    <p><b>Categoria:</b> ${esc(r.categoria || "Não informada")}</p>
    <p><b>Prioridade:</b> ${esc(r.prioridade || "Não informada")}</p>
    <p><b>Local:</b> ${esc(r.local || "Não informado")}</p>
    <p><b>Referência:</b> ${esc(r.referenciaLocal || "Não informada")}</p>
    <p><b>Data de início:</b> ${date(r.inicioEm || r.criadoEm)}</p>
    <p><b>Data de fim:</b> ${date(r.fimEm)}</p>
    <p><b>Descrição:</b><br>${esc(r.descricao || "Sem descrição")}</p>
    <p><b>Oferece risco:</b> ${r.ofereceRisco ? "Sim" : "Não"}</p>
    ${r.fotoData ? `<img class="detail-photo" src="${r.fotoData}" alt="Foto da ocorrência">` : ""}
  `;
  show("publicDetailModal");
}

$("publicStatusFilter")?.addEventListener("change", () => {
  page = 1;
  render();
});

$("publicPagination")?.addEventListener("click", event => {
  if (event.target.id === "publicPrevPage" && page > 1) {
    page--;
    render();
  }
  if (event.target.id === "publicNextPage") {
    page++;
    render();
  }
});

document.addEventListener("click", event => {
  const button = event.target.closest(".public-detail-button");
  if (button) openDetails(button.dataset.id);
});

$("btnClosePublicDetail")?.addEventListener("click", () => hide("publicDetailModal"));
$("publicDetailModal")?.addEventListener("click", event => {
  if (event.target.id === "publicDetailModal") hide("publicDetailModal");
});
$("btnLogout")?.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
  hide("loadingView");

  if (!user) {
    show("loginRequired");
    hide("publicView");
    return;
  }

  hide("loginRequired");
  show("publicView");
  show("btnLogout");

  $("publicUserName").textContent = user.displayName || "Morador";

  const q = query(collection(db, "reports"), orderBy("criadoEm", "desc"));

  onSnapshot(q, snapshot => {
    reports = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    page = 1;
    render();
  }, error => {
    console.error(error);
    $("publicReportsList").innerHTML = `
      <div class="empty-state">Não foi possível carregar as ocorrências.</div>
    `;
  });
});
