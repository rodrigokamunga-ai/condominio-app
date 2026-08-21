import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmep_wIOuM3TF4yTUIaoU83oSTFydI8Ig",
  authDomain: "condominiomaui-5ecd0.firebaseapp.com",
  projectId: "condominiomaui-5ecd0",
  storageBucket: "condominiomaui-5ecd0.firebasestorage.app",
  messagingSenderId: "298051508693",
  appId: "1:298051508693:web:cc5af84aaceb7856e7055c"
};
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const $=id=>document.getElementById(id);
let unsub=null, allReports=[], page=1;
const pageSize=10;

const show=id=>$(id)?.classList.remove("hidden");
const hide=id=>$(id)?.classList.add("hidden");
const msg=(id,text,ok=false)=>{const e=$(id);if(e){e.textContent=text;e.className=ok?"message success":"message";}};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const date=v=>v?.toDate?v.toDate().toLocaleString("pt-BR"):"Não informada";
const err=e=>({ "auth/invalid-credential":"E-mail ou senha inválidos.","auth/email-already-in-use":"Este e-mail já está cadastrado.","auth/weak-password":"A senha deve ter pelo menos 6 caracteres.","auth/invalid-email":"Informe um e-mail válido."}[e?.code]||e?.message||"Não foi possível concluir.");
const toast=t=>{const e=$("toast");if(!e)return alert(t);e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),3500);};

function compressImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader(), img=new Image();
    reader.onload=e=>img.src=e.target.result;
    reader.onerror=()=>reject(new Error("Não foi possível ler a imagem."));
    img.onload=()=>{
      const scale=Math.min(640/img.width,480/img.height,1);
      const c=document.createElement("canvas"); c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      const data=c.toDataURL("image/jpeg",.6);
      if(data.length*0.75>350000) reject(new Error("A imagem ficou muito grande. Escolha outra foto."));
      else resolve(data);
    };
    img.onerror=()=>reject(new Error("Imagem inválida."));
    reader.readAsDataURL(file);
  });
}

function filtered(){
  const f=$("statusFilter")?.value||"Todos";
  return f==="Todos"?allReports:allReports.filter(r=>(r.status||"Aberto")===f);
}
function render(){
  const list=$("reportsList"); if(!list)return;
  const rows=filtered(), pages=Math.max(1,Math.ceil(rows.length/pageSize));
  if(page>pages)page=pages;
  const start=(page-1)*pageSize, visible=rows.slice(start,start+pageSize);
  list.innerHTML=visible.length?visible.map(r=>`
    <article class="report-item compact-report">
      <div>
        <div class="report-title">${esc(r.titulo||"Sem título")}</div>
        <div class="report-meta">Protocolo: ${esc(r.protocolo||"Não informado")}</div>
        <div class="report-meta">Início: ${date(r.inicioEm||r.criadoEm)}</div>
        ${r.fimEm?`<div class="report-meta">Fim: ${date(r.fimEm)}</div>`:""}
      </div>
      <button class="secondary-button detail-button" data-id="${r.id}">Detalhar</button>
    </article>`).join(""):`<div class="empty-state">Nenhum registro encontrado.</div>`;
  $("pagination")?.replaceChildren();
  if($("pagination")) $("pagination").innerHTML=`
    <button class="secondary-button" id="prevPage" ${page<=1?"disabled":""}>Anterior</button>
    <span>Página ${page} de ${pages}</span>
    <button class="secondary-button" id="nextPage" ${page>=pages?"disabled":""}>Próxima</button>`;
  $("statTotal")&&( $("statTotal").textContent=allReports.length);
  $("statOpen")&&( $("statOpen").textContent=allReports.filter(r=>r.status!=="Resolvido").length);
  $("statResolved")&&( $("statResolved").textContent=allReports.filter(r=>r.status==="Resolvido").length);
}
function openDetails(id){
  const r=allReports.find(x=>x.id===id); if(!r)return;
  $("detailContent").innerHTML=`
    <h2>${esc(r.titulo||"Sem título")}</h2>
    <p><b>Protocolo:</b> ${esc(r.protocolo||"Não informado")}</p>
    <p><b>Status:</b> ${esc(r.status||"Aberto")}</p>
    <p><b>Categoria:</b> ${esc(r.categoria||"Não informada")}</p>
    <p><b>Prioridade:</b> ${esc(r.prioridade||"Não informada")}</p>
    <p><b>Local:</b> ${esc(r.local||"Não informado")}</p>
    <p><b>Referência:</b> ${esc(r.referenciaLocal||"Não informada")}</p>
    <p><b>Data de início:</b> ${date(r.inicioEm||r.criadoEm)}</p>
    <p><b>Data de fim:</b> ${date(r.fimEm)}</p>
    <p><b>Descrição:</b><br>${esc(r.descricao||"Sem descrição")}</p>
    <p><b>Oferece risco:</b> ${r.ofereceRisco?"Sim":"Não"}</p>
    ${r.fotoData?`<img class="detail-photo" src="${r.fotoData}" alt="Foto da ocorrência">`:""}`;
  show("detailModal");
}
$("btnCloseDetail")?.addEventListener("click",()=>hide("detailModal"));
$("detailModal")?.addEventListener("click",e=>{if(e.target.id==="detailModal")hide("detailModal");});
document.addEventListener("click",e=>{
  if(e.target.matches(".detail-button"))openDetails(e.target.dataset.id);
  if(e.target.id==="prevPage"){page--;render();}
  if(e.target.id==="nextPage"){page++;render();}
});

$("btnShowRegister")?.addEventListener("click",()=>{hide("loginView");show("registerView");});
$("btnBackLogin")?.addEventListener("click",()=>{hide("registerView");show("loginView");});
$("btnNewReport")?.addEventListener("click",()=>{show("reportFormCard");$("reportTitle")?.focus();});
$("btnCancelReport")?.addEventListener("click",()=>{hide("reportFormCard");$("reportForm")?.reset();});
$("statusFilter")?.addEventListener("change",()=>{page=1;render();});
$("btnLogout")?.addEventListener("click",()=>signOut(auth));

$("loginForm")?.addEventListener("submit",async e=>{
  e.preventDefault(); msg("loginMessage","Entrando...");
  try{await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);}
  catch(x){msg("loginMessage",err(x));}
});
$("registerForm")?.addEventListener("submit",async e=>{
  e.preventDefault(); msg("registerMessage","Criando cadastro...");
  try{
    const name=$("registerName").value.trim(),unit=$("registerUnit").value.trim(),email=$("registerEmail").value.trim(),password=$("registerPassword").value;
    const c=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(c.user,{displayName:name});
    await setDoc(doc(db,"users",c.user.uid),{uid:c.user.uid,nome:name,unidade:unit,bloco:$("registerBlock").value.trim(),telefone:$("registerPhone").value.trim(),email,criadoEm:serverTimestamp()});
    msg("registerMessage","Cadastro criado com sucesso.",true);
  }catch(x){msg("registerMessage",err(x));}
});

$("reportForm")?.addEventListener("submit",async e=>{
  e.preventDefault(); const user=auth.currentUser; if(!user)return msg("reportMessage","Faça login antes de enviar.");
  const b=$("btnSubmitReport"); if(b)b.disabled=true; msg("reportMessage","Enviando...");
  try{
    const file=$("reportPhoto")?.files?.[0]; let fotoData="";
    if(file){if(file.size>10*1024*1024)throw new Error("A imagem original deve ter no máximo 10 MB."); fotoData=await compressImage(file);}
    const u=await getDoc(doc(db,"users",user.uid)),p=u.exists()?u.data():{},now=new Date();
    const protocolo=`COND-${now.toISOString().slice(0,10).replaceAll("-","")}-${String(Date.now()).slice(-5)}`;
    await addDoc(collection(db,"reports"),{
      protocolo,moradorId:user.uid,nome:p.nome||user.displayName||"",email:user.email||"",unidade:p.unidade||"",bloco:p.bloco||"",
      titulo:$("reportTitle").value.trim(),categoria:$("reportCategory").value,prioridade:$("reportPriority").value,local:$("reportLocation").value,
      referenciaLocal:$("reportReference").value.trim(),descricao:$("reportDescription").value.trim(),ofereceRisco:$("reportRisk").checked,
      desejaAtualizacao:$("reportUpdates").checked,status:"Aberto",inicioEm:serverTimestamp(),fimEm:null,fotoData,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()
    });
    $("reportForm").reset(); hide("reportFormCard"); toast(`Registro enviado. Protocolo: ${protocolo}`);
  }catch(x){msg("reportMessage",err(x));}finally{if(b)b.disabled=false;}
});

onAuthStateChanged(auth,async user=>{
  if(!user){hide("appView");hide("registerView");show("loginView");$("btnLogout")?.classList.add("hidden");unsub?.();return;}
  hide("loginView");hide("registerView");show("appView");$("btnLogout")?.classList.remove("hidden");
  const u=await getDoc(doc(db,"users",user.uid)),p=u.exists()?u.data():{};
  $("userName")&&( $("userName").textContent=p.nome||user.displayName||"Morador");
  // Importante: where garante que "Meus registros" só carregue os registros do usuário logado.
  const q=query(collection(db,"reports"),where("moradorId","==",user.uid));
  unsub=onSnapshot(q,s=>{allReports=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.criadoEm?.toMillis?.()||0)-(a.criadoEm?.toMillis?.()||0));page=1;render();},x=>{console.error(x);$("reportsList").innerHTML=`<div class="empty-state">${esc(err(x))}</div>`;});
});
