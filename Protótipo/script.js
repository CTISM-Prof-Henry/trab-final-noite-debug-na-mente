/*************************************************
 * Filtro de Sala + Exibição por Sala
 *************************************************/

const $id = (id) => document.getElementById(id);
const $all = (sel) => document.querySelectorAll(sel);
const pad2 = (n) => String(n).padStart(2, "0");
const abrirModal = (el) => new bootstrap.Modal(el).show();
const fecharModal = (el) => bootstrap.Modal.getInstance(el)?.hide();

let db;

/* ===== Estado da Semana ===== */
let currentWeekStart = startOfWeek(new Date()); // domingo
/* ===== Estado do Filtro (tipo/bloco/sala) ===== */
let filtroAtual = { tipo: "", bloco: "", sala: "" };
/* Para pré-selecionar sala no modal após carregar opções */
let salaParaSelecionar = "";

/* ===== IndexedDB Setup ===== */
const request = indexedDB.open("AgendamentoDB", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains("salas")) {
    db.createObjectStore("salas", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("agendamentos")) {
    const store = db.createObjectStore("agendamentos", { keyPath: "id", autoIncrement: true });
    store.createIndex("sala_dia", ["sala", "dia"], { unique: false });
  }
};

request.onsuccess = () => {
  db = request.result;
  generateCalendar();
  renderLegendProfessores();
  renderWeekLabel();
  bindWeekNav();
  bindFiltroUI();
};

request.onerror = () => alert("Erro ao abrir IndexedDB");

/* ===== Datas ===== */
const MESES_ABR = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
const DIAS_ABR  = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

function startOfWeek(ref) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toISOyyyyMMdd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
}
function formatDiaCabecalho(date) {
  const dd = String(date.getDate()).replace(/^0/, "");
  const ddd = DIAS_ABR[date.getDay()];
  return `${dd} - ${ddd}`;
}
function formatRangeWeek(start) {
  const end = addDays(start, 6);
  const dd1 = String(start.getDate()).replace(/^0/, "");
  const dd2 = String(end.getDate()).replace(/^0/, "");
  return `${dd1} ${MESES_ABR[start.getMonth()]} até ${dd2} ${MESES_ABR[end.getMonth()]}`;
}

/* ===== Cores por Professor ===== */
const PROF_COLORS = {
  "Alencar": "#ffd166",
  "Henry":   "#f4a261",
  "Bruno":   "#ff7f50",
  "Daniel":  "#ff6b6b"
};

function renderLegendProfessores() {
  const cont = $id("legendProfessores");
  if (!cont) return;
  cont.innerHTML = "";
  Object.entries(PROF_COLORS).forEach(([nome, cor]) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-swatch" style="background:${cor}"></span><span>${nome}</span>`;
    cont.appendChild(item);
  });
}

/* ===== Navegação (páginas) ===== */
function showPage(pageId, event) {
  $all(".page").forEach(p => p.style.display = "none");
  $id(pageId).style.display = "block";
  $all(".nav-link").forEach(n => n.classList.remove("active"));
  if (event?.target) event.target.classList.add("active");
  if (pageId === "listarSalas") carregarSalas();
}

/* ===== Login ===== */
function abrirLogin() { abrirModal($id("modalLogin")); }
function logar() {
  // Login "vitrine": apenas fecha o modal (sem validação / sem regras)
  const form = $id("formLogin");
  if (form) form.reset();
  fecharModal($id("modalLogin"));
}

/* ===== Cadastro de Salas ===== */
const formCadastroSala = $id("formCadastroSala");
formCadastroSala.onsubmit = (e) => {
  e.preventDefault();

  const registro = {
    tipo: $id("tipoCadastro").value,
    bloco: $id("blocoCadastro").value,
    nome: $id("nomeSala").value,
    capacidade: parseInt($id("capacidade").value, 10)
  };

  const editId = $id("cadastro").dataset.editId;
  const tx = db.transaction("salas", "readwrite");
  const store = tx.objectStore("salas");

  if (editId) {
    registro.id = parseInt(editId, 10);
    store.put(registro);
    delete $id("cadastro").dataset.editId;
  } else {
    store.add(registro);
  }

  tx.oncomplete = () => {
    formCadastroSala.reset();
    alert("Sala salva com sucesso!");
    carregarSalas();
  };
};

/* ===== Horário livre no modal ===== */
function hourStrToInt(hhmm) {
  if (!/^\d{2}:\d{2}$/.test(hhmm || "")) return NaN;
  return parseInt(hhmm.split(":")[0], 10);
}
function readModalHorario() {
  const dia = parseInt($id("modalDia").value, 10);
  const startHour = hourStrToInt($id("horaInicio").value);
  const endHour   = hourStrToInt($id("horaFim").value);

  if (Number.isNaN(startHour) || Number.isNaN(endHour)) {
    alert("Defina início e fim do horário.");
    return null;
  }
  if (startHour < 8 || startHour > 22 || endHour < 9 || endHour > 23) {
    alert("Horário fora do intervalo permitido (08:00 até 22:00/23:00).");
    return null;
  }
  if (endHour <= startHour) {
    alert("O horário de fim deve ser maior que o de início.");
    return null;
  }
  return { startHour, endHour, dia };
}

/* ===== Abrir Modal de Agendar ===== */
function openModal(hora, diaIndex) {
  const startHour = parseInt(hora.split(":")[0], 10);
  $id("modalDia").value = String(diaIndex);
  $id("horaInicio").value = `${pad2(startHour)}:00`;
  $id("horaFim").value    = `${pad2(Math.min(startHour + 1, 23))}:00`;

  // Se houver filtro ativo, pré-preenche o modal
  if (filtroAtual.tipo)  $id("tipoSala").value  = filtroAtual.tipo;
  if (filtroAtual.bloco) $id("blocoSala").value = filtroAtual.bloco;
  if (filtroAtual.sala)  salaParaSelecionar = filtroAtual.sala;

  atualizarSalas();
  abrirModal($id("modalAgendar"));
}

/* ===== Navegação de Semana ===== */
function renderWeekLabel() {
  $id("weekLabel").textContent = formatRangeWeek(currentWeekStart);
  $id("weekPicker").value = toISOyyyyMMdd(currentWeekStart);
}
function bindWeekNav() {
  $id("prevWeek").addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    renderWeekLabel();
    generateCalendar();
  });
  $id("nextWeek").addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    renderWeekLabel();
    generateCalendar();
  });
  const picker = $id("weekPicker");
  $id("weekLabel").addEventListener("click", () => {
    picker.showPicker ? picker.showPicker() : picker.click();
  });
  picker.addEventListener("change", () => {
    if (!picker.value) return;
    currentWeekStart = startOfWeek(new Date(picker.value));
    renderWeekLabel();
    generateCalendar();
  });
}

/* ===== Repetição ===== */
const TODAY_WEEK_ISO = toISOyyyyMMdd(startOfWeek(new Date()));

function expandOccurrencesForCurrentWeek(ag) {
  const base = { sala: ag.sala, professor: ag.professor, startHour: ag.startHour, endHour: ag.endHour };
  const curIso = toISOyyyyMMdd(currentWeekStart);

  if (ag.repeat === "weekly") return [{ ...base, dia: ag.dia }];

  if (ag.repeat === "monthly") {
    const targetDay = ag.repeatDay || (() => {
      const anchor = ag.weekStart ? new Date(ag.weekStart) : startOfWeek(new Date());
      return addDays(anchor, ag.dia).getDate();
    })();
    for (let i = 0; i < 7; i++) {
      if (addDays(currentWeekStart, i).getDate() === targetDay) {
        return [{ ...base, dia: i }];
      }
    }
    return [];
  }

  const inThisWeek = (ag.weekStart && ag.weekStart === curIso) || (!ag.weekStart && curIso === TODAY_WEEK_ISO);
  return inThisWeek ? [{ ...base, dia: ag.dia }] : [];
}

/* ===== Filtro (UI) ===== */
function bindFiltroUI() {
  $id("filtroTipo").addEventListener("change", atualizarFiltroSalas);
  $id("filtroBloco").addEventListener("change", atualizarFiltroSalas);
  $id("btnAplicarFiltro").addEventListener("click", aplicarFiltro);
}

/** Preenche o select de Sala do filtro conforme Tipo/Bloco */
function atualizarFiltroSalas() {
  const tipo = $id("filtroTipo").value;
  const bloco = $id("filtroBloco").value;
  const selSala = $id("filtroSala");
  selSala.innerHTML = `<option value="">Sala</option>`;

  if (!tipo || !bloco) return;

  const tx = db.transaction("salas", "readonly");
  tx.objectStore("salas").getAll().onsuccess = (e) => {
    const salas = (e.target.result || [])
      .filter(s => s.tipo === tipo && s.bloco === bloco)
      .sort((a,b) => a.nome.localeCompare(b.nome));

    salas.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.nome;
      opt.textContent = s.nome;
      selSala.appendChild(opt);
    });
  };
}

/** Aplica o filtro e regenera o calendário */
function aplicarFiltro() {
  const tipo  = $id("filtroTipo").value;
  const bloco = $id("filtroBloco").value;
  const sala  = $id("filtroSala").value;

  if (!tipo || !bloco || !sala) {
    alert("Selecione Tipo, Bloco e Sala para filtrar.");
    return;
  }

  filtroAtual = { tipo, bloco, sala };
  generateCalendar();
}

/* ===== Disponibilidade (no modal) ===== */
function atualizarSalas() {
  const tipo = $id("tipoSala").value;
  const bloco = $id("blocoSala").value;
  const salaSelect = $id("sala");
  salaSelect.innerHTML = "";

  if (!tipo || !bloco) {
    salaSelect.innerHTML = "<option>Selecione tipo e bloco</option>";
    return;
  }

  const intervalo = readModalHorario();
  if (!intervalo) {
    salaSelect.innerHTML = "<option>Defina início e fim</option>";
    return;
  }
  const { startHour, endHour, dia } = intervalo;

  const tx = db.transaction("salas", "readonly");
  tx.objectStore("salas").getAll().onsuccess = (e) => {
    const lista = (e.target.result || []).filter(s => s.tipo === tipo && s.bloco === bloco);

    if (lista.length === 0) {
      salaSelect.innerHTML = "<option>Sem salas para este bloco</option>";
      fecharModal($id("modalAgendar"));
      abrirModal($id("modalSemSalas"));
      return;
    }

    const txAg = db.transaction("agendamentos", "readonly");
    txAg.objectStore("agendamentos").getAll().onsuccess = (ev) => {
      const agds = ev.target.result || [];
      const occs = agds.flatMap(expandOccurrencesForCurrentWeek);

      lista.forEach((s) => {
        const ocupada = occs.some((o) =>
          o.sala === s.nome && o.dia === dia && !(endHour <= o.startHour || startHour >= o.endHour)
        );

        const opt = document.createElement("option");
        opt.value = s.nome;
        opt.textContent = ocupada ? `${s.nome} (Ocupada)` : s.nome;
        opt.disabled = !!ocupada;
        salaSelect.appendChild(opt);
      });

      // Pré-seleciona se veio do filtro
      if (salaParaSelecionar) {
        salaSelect.value = salaParaSelecionar;
        salaParaSelecionar = "";
      }
    };
  };
}

/* ===== Salvar / Conflitos (por sala) ===== */
$id("confirmarAgendamento").addEventListener("click", () => {
  const sala = $id("sala").value;
  const professor = $id("professor").value;
  const repeat = $id("repeatMode").value || "none";

  if (!sala || !professor) {
    alert("Preencha sala e professor.");
    return;
  }

  const intervalo = readModalHorario();
  if (!intervalo) return;

  const payload = {
    sala,
    professor,
    weekStart: toISOyyyyMMdd(currentWeekStart),
    repeat,                // "none" | "weekly" | "monthly"
    repeatDay: undefined,  // se monthly
    ...intervalo
  };

  if (repeat === "monthly") {
    payload.repeatDay = addDays(currentWeekStart, payload.dia).getDate();
  }

  verificarConflitoESalvar(payload);
});

function verificarConflitoESalvar(data) {
  const tx = db.transaction("agendamentos", "readonly");
  tx.objectStore("agendamentos").getAll().onsuccess = (e) => {
    const existentes = e.target.result || [];
    const occs = existentes.flatMap(expandOccurrencesForCurrentWeek);

    // Conflito: MESMA sala, mesmo dia, sobreposição de intervalo
    const conflito = occs.find((o) =>
      o.sala === data.sala &&
      o.dia === data.dia &&
      !(data.endHour <= o.startHour || data.startHour >= o.endHour)
    );

    if (conflito) {
      alert(`Horário ocupado pelo professor ${conflito.professor}, selecione outro.`);
      return;
    }

    const tx2 = db.transaction("agendamentos", "readwrite");
    tx2.objectStore("agendamentos").add(data);
    tx2.oncomplete = () => {
      fecharModal($id("modalAgendar"));
      marcarAgendamentos();
      alert("Agendamento salvo!");
    };
  };
}

/* ===== Calendário ===== */
function marcarAgendamentos() {
  // Limpa células e recoloca onclick para abrir modal
  $all(".calendar-cell").forEach((c) => {
    c.style.backgroundColor = "";
    c.title = "";
    const dia = parseInt(c.dataset.dia, 10);
    c.onclick = () => openModal(c.dataset.hora, dia);
  });

  // Sem filtro: não pinta nada (evita confusão)
  if (!filtroAtual.sala) return;

  const tx = db.transaction("agendamentos", "readonly");
  tx.objectStore("agendamentos").getAll().onsuccess = (e) => {
    const lista = e.target.result || [];
    // Expande e FILTRA pela sala selecionada
    const occs = lista
      .flatMap(expandOccurrencesForCurrentWeek)
      .filter(oc => oc.sala === filtroAtual.sala);

    occs.forEach((ag) => {
      for (let h = ag.startHour; h < ag.endHour; h++) {
        const cell = document.querySelector(
          `.calendar-cell[data-dia="${ag.dia}"][data-hora="${pad2(h)}:00"]`
        );
        if (!cell) continue;

        cell.style.backgroundColor = (PROF_COLORS[ag.professor] || "#ffd6a5");
        cell.title = `Ocupado: ${ag.professor} (${ag.sala})`;
        cell.onclick = () => {
          alert(`📌 Detalhes:\nProfessor: ${ag.professor}\nSala: ${ag.sala}\nHorário: ${ag.startHour}:00 - ${ag.endHour}:00`);
        };
      }
    });
  };
}

function generateCalendar() {
  const calendar = $id("calendar");

  // Cabeçalhos: canto vazio + 7 dias "DD - DDD"
  let html = `<div></div>`;
  for (let i = 0; i < 7; i++) {
    html += `<div class="calendar-header">${formatDiaCabecalho(addDays(currentWeekStart, i))}</div>`;
  }

  // Linhas 08–22
  for (let hour = 8; hour <= 22; hour++) {
    html += `<div class="calendar-time">${hour}:00</div>`;
    for (let day = 0; day < 7; day++) {
      html += `<div class="calendar-cell" data-dia="${day}" data-hora="${pad2(hour)}:00"></div>`;
    }
  }

  calendar.innerHTML = html;

  // Click nas células → abre modal
  $all(".calendar-cell").forEach((cell) => {
    const dia = parseInt(cell.dataset.dia, 10);
    cell.onclick = () => openModal(cell.dataset.hora, dia);
  });

  marcarAgendamentos();
}

/* ===== Listar / Editar / Excluir Salas ===== */
function carregarSalas() {
  const tbody = document.querySelector("#tabelaSalas tbody");
  tbody.innerHTML = "";

  const tx = db.transaction("salas", "readonly");
  tx.objectStore("salas").getAll().onsuccess = (e) => {
    const salas = e.target.result || [];

    if (salas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma sala cadastrada</td></tr>`;
      return;
    }

    salas.forEach((sala) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${sala.tipo}</td>
        <td>${sala.bloco}</td>
        <td>${sala.nome}</td>
        <td>${sala.capacidade}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-primary me-2" onclick="editarSala(${sala.id})">
            <i class="bi bi-pencil"></i> Editar
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="excluirSala(${sala.id})">
            <i class="bi bi-trash"></i> Excluir
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  };
}

function editarSala(id) {
  const tx = db.transaction("salas", "readonly");
  tx.objectStore("salas").get(id).onsuccess = (e) => {
    const sala = e.target.result;
    if (!sala) return;

    $id("tipoCadastro").value  = sala.tipo;
    $id("blocoCadastro").value = sala.bloco;
    $id("nomeSala").value      = sala.nome;
    $id("capacidade").value    = sala.capacidade;

    $id("cadastro").dataset.editId = String(id);
    showPage("cadastro", { target: document.querySelector('[onclick*="cadastro"]') });
  };
}

function excluirSala(id) {
  if (!confirm("Tem certeza que deseja excluir esta sala?")) return;

  const tx = db.transaction("salas", "readwrite");
  tx.objectStore("salas").delete(id);
  tx.oncomplete = () => {
    alert("Sala excluída.");
    carregarSalas();
  };
}

/* ===== Atalho do modal "sem salas" ===== */
function abrirCadastroDoModalSemSalas() {
  fecharModal($id("modalAgendar"));
  fecharModal($id("modalSemSalas"));
  showPage("cadastro", { target: document.querySelector('[onclick*="cadastro"]') });
}

/* ===== Exposição global (HTML onClick) ===== */
window.showPage = showPage;
window.abrirLogin = abrirLogin;
window.logar = logar;
window.openModal = openModal;
window.atualizarSalas = atualizarSalas;
window.editarSala = editarSala;
window.excluirSala = excluirSala;
window.abrirCadastroDoModalSemSalas = abrirCadastroDoModalSemSalas;
