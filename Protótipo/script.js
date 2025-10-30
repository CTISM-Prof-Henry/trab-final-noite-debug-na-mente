"use strict";

/* ===== Helpers rápidos ===== */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);

/* ===== IndexedDB ===== */
let db;
const DB_NAME = "AgendamentoDB";
const STORES = {
  SALAS: "salas",
  AGEND: "agendamentos",
};

const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;

  if (!db.objectStoreNames.contains(STORES.SALAS)) {
    db.createObjectStore(STORES.SALAS, { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(STORES.AGEND)) {
    const store = db.createObjectStore(STORES.AGEND, { keyPath: "id", autoIncrement: true });
    store.createIndex("sala_dia", ["sala", "dia"], { unique: false });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  bindListeners();
  generateCalendar();
};

request.onerror = () => alert("Erro ao abrir IndexedDB");

/* =========================================================================
   Navegação
   ====================================================================== */
function showPage(pageId, event) {
  $$(".page").forEach((p) => (p.style.display = "none"));
  byId(pageId).style.display = "block";

  $$(".nav-link").forEach((n) => n.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");

  if (pageId === "listarSalas") carregarSalas();
}

/* =========================================================================
   Login (simples, para demonstração)
   ====================================================================== */
function abrirLogin() {
  new bootstrap.Modal(byId("modalLogin")).show();
}

function logar() {
  const usuario = byId("usuario").value;
  const senha   = byId("senha").value;

  if (usuario === "admin" && senha === "1234") {
    alert("Login realizado com sucesso!");
    bootstrap.Modal.getInstance(byId("modalLogin")).hide();
  } else {
    alert("Usuário ou senha inválidos!");
  }
}

/* =========================================================================
   Cadastro de Salas
   ====================================================================== */
const formCadastroSala = byId("formCadastroSala");

formCadastroSala.onsubmit = (e) => {
  e.preventDefault();

  const tipo       = byId("tipoCadastro").value;
  const bloco      = byId("blocoCadastro").value;
  const nome       = byId("nomeSala").value;
  const capacidade = parseInt(byId("capacidade").value, 10);

  const registro = { tipo, bloco, nome, capacidade };

  const editId = byId("cadastro").dataset.editId;
  const tx   = db.transaction(STORES.SALAS, "readwrite");
  const store = tx.objectStore(STORES.SALAS);

  if (editId) {
    registro.id = parseInt(editId, 10);
    store.put(registro);
    delete byId("cadastro").dataset.editId;
  } else {
    store.add(registro);
  }

  tx.oncomplete = () => {
    formCadastroSala.reset();
    alert("Sala salva com sucesso!");
    carregarSalas();
  };
};

/* Abrir cadastro a partir do modal de “sem salas” */
function abrirCadastroDoModalSemSalas() {
  const modalAg = bootstrap.Modal.getInstance(byId("modalAgendar"));
  if (modalAg) modalAg.hide();

  const modalSem = bootstrap.Modal.getInstance(byId("modalSemSalas"));
  if (modalSem) modalSem.hide();

  showPage("cadastro", { target: document.querySelector('[onclick*="cadastro"]') });
}

/* =========================================================================
   Modal de Agendamento
   ====================================================================== */
function openModal(hora, diaIndex) {
  // Dia/hora escolhidos pelo usuário no calendário
  const dayNames  = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const startHour = parseInt(hora.split(":")[0], 10);

  const horarioInput = byId("modalHorario");
  horarioInput.dataset.startHour = String(startHour);
  horarioInput.dataset.day       = String(diaIndex);
  horarioInput.dataset.dayLabel  = dayNames[diaIndex];

  atualizarHorario();
  atualizarSalas();

  new bootstrap.Modal(byId("modalAgendar")).show();
}

/* Atualiza o preview do horário no input do modal (conforme períodos) */
function atualizarHorario() {
  const horarioInput = byId("modalHorario");

  const startHour = parseInt(horarioInput.dataset.startHour || "8", 10);
  const endHour   = startHour + parseInt($('input[name="periodos"]:checked').value, 10);
  const dayLabel  = horarioInput.dataset.dayLabel || "";

  horarioInput.dataset.endHour = String(endHour);
  horarioInput.value = `${dayLabel}, ${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
}

/* Monta a lista de salas no modal, já indicando ocupadas no horário escolhido */
function atualizarSalas() {
  const tipo       = byId("tipoSala").value;
  const bloco      = byId("blocoSala").value;
  const salaSelect = byId("sala");
  salaSelect.innerHTML = "";

  if (!tipo || !bloco) {
    salaSelect.innerHTML = "<option>Selecione tipo e bloco</option>";
    return;
  }

  const tx = db.transaction(STORES.SALAS, "readonly");
  tx.objectStore(STORES.SALAS).getAll().onsuccess = (e) => {
    const todasSalas = e.target.result || [];
    const lista = todasSalas.filter((s) => s.tipo === tipo && s.bloco === bloco);

    if (lista.length === 0) {
      salaSelect.innerHTML = "<option>Sem salas para este bloco</option>";

      // Fecha modal de agendamento e abre o de atenção
      const modalAg = bootstrap.Modal.getInstance(byId("modalAgendar"));
      if (modalAg) modalAg.hide();
      new bootstrap.Modal(byId("modalSemSalas")).show();
      return;
    }

    // Checa ocupação para o intervalo selecionado
    const startHour = parseInt(byId("modalHorario").dataset.startHour, 10);
    const endHour   = parseInt(byId("modalHorario").dataset.endHour, 10);
    const dia       = parseInt(byId("modalHorario").dataset.day, 10);

    const txAg = db.transaction(STORES.AGEND, "readonly");
    txAg.objectStore(STORES.AGEND).getAll().onsuccess = (ev) => {
      const agendamentos = ev.target.result || [];

      lista.forEach((s) => {
        const ocupada = agendamentos.some((ag) =>
          ag.sala === s.nome &&
          ag.dia === dia &&
          !(endHour <= ag.startHour || startHour >= ag.endHour)
        );

        const opt = document.createElement("option");
        opt.value = s.nome;
        opt.textContent = ocupada ? `${s.nome} (Ocupada)` : s.nome;
        if (ocupada) opt.disabled = true;

        salaSelect.appendChild(opt);
      });
    };
  };
}

/* Confirma o agendamento (botão do modal) */
byId("confirmarAgendamento").addEventListener("click", () => {
  const sala      = byId("sala").value;
  const professor = byId("professor").value;
  const horario   = byId("modalHorario");

  if (!sala || !professor) {
    alert("Preencha sala e professor.");
    return;
  }

  const data = {
    sala,
    professor,
    dia:       parseInt(horario.dataset.day, 10),
    startHour: parseInt(horario.dataset.startHour, 10),
    endHour:   parseInt(horario.dataset.endHour, 10),
  };

  verificarConflitoESalvar(data);
});

/* Verifica conflito de horário antes de gravar */
function verificarConflitoESalvar(data) {
  const tx     = db.transaction(STORES.AGEND, "readonly");
  const index  = tx.objectStore(STORES.AGEND).index("sala_dia");
  const range  = IDBKeyRange.only([data.sala, data.dia]);

  let conflito = null;

  index.openCursor(range).onsuccess = (e) => {
    const cursor = e.target.result;
    if (!cursor) return;

    const ag = cursor.value;
    // Sem conflito se intervalos não se sobrepõem
    if (!(data.endHour <= ag.startHour || data.startHour >= ag.endHour)) {
      conflito = ag;
    }
    cursor.continue();
  };

  tx.oncomplete = () => {
    if (conflito) {
      alert(`Horário ocupado pelo professor ${conflito.professor}, selecione outro.`);
      return;
    }

    const tx2 = db.transaction(STORES.AGEND, "readwrite");
    tx2.objectStore(STORES.AGEND).add(data);
    tx2.oncomplete = () => {
      bootstrap.Modal.getInstance(byId("modalAgendar")).hide();
      marcarAgendamentos();
      alert("Agendamento salvo!");
    };
  };
}

/* =========================================================================
   Calendário
   ====================================================================== */
function marcarAgendamentos() {
  // Limpa marcações
  $$(".calendar-cell").forEach((c) => {
    c.style.backgroundColor = "";
    c.title = "";
    const dia  = parseInt(c.dataset.dia, 10);
    c.onclick = () => openModal(c.dataset.hora, dia);
  });

  // Reaplica marcações
  const tx = db.transaction(STORES.AGEND, "readonly");
  tx.objectStore(STORES.AGEND).getAll().onsuccess = (e) => {
    const lista = e.target.result || [];

    lista.forEach((ag) => {
      for (let h = ag.startHour; h < ag.endHour; h++) {
        const cell = $(`.calendar-cell[data-dia="${ag.dia}"][data-hora="${String(h).padStart(2, "0")}:00"]`);
        if (cell) {
          cell.style.backgroundColor = "#ffd6a5"; // destaque simples
          cell.title = `Ocupado: ${ag.professor} (${ag.sala})`;
          cell.onclick = () => {
            alert(`📌 Detalhes:\nProfessor: ${ag.professor}\nSala: ${ag.sala}\nHorário: ${ag.startHour}:00 - ${ag.endHour}:00`);
          };
        }
      }
    });
  };
}

function generateCalendar() {
  const calendar = byId("calendar");
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Cabeçalho (primeiro espaço vazio + dias)
  let html = `<div></div>`;
  dias.forEach((d) => (html += `<div class="calendar-header">${d}</div>`));

  // Linhas de 08:00 a 22:00
  for (let hour = 8; hour <= 22; hour++) {
    html += `<div class="calendar-time">${hour}:00</div>`;
    for (let day = 0; day < 7; day++) {
      html += `
        <div
          class="calendar-cell"
          data-dia="${day}"
          data-hora="${String(hour).padStart(2, "0")}:00"
          ></div>`;
    }
  }

  calendar.innerHTML = html;

  // Clicks nas células (abre modal)
  $$(".calendar-cell").forEach((cell) => {
    const dia = parseInt(cell.dataset.dia, 10);
    cell.onclick = () => openModal(cell.dataset.hora, dia);
  });

  marcarAgendamentos();
}

/* Listeners de UI (fora de funções globais) */
function bindListeners() {
  byId("tipoSala").addEventListener("change", atualizarSalas);
  byId("blocoSala").addEventListener("change", atualizarSalas);
  $$("input[name='periodos']").forEach((r) => r.addEventListener("change", atualizarHorario));
}

/* =========================================================================
   Lista, edição e exclusão de Salas
   ====================================================================== */
function carregarSalas() {
  const tbody = $("#tabelaSalas tbody");
  tbody.innerHTML = "";

  const tx = db.transaction(STORES.SALAS, "readonly");
  tx.objectStore(STORES.SALAS).getAll().onsuccess = (e) => {
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
  const tx = db.transaction(STORES.SALAS, "readonly");
  tx.objectStore(STORES.SALAS).get(id).onsuccess = (e) => {
    const sala = e.target.result;
    if (!sala) return;

    byId("tipoCadastro").value  = sala.tipo;
    byId("blocoCadastro").value = sala.bloco;
    byId("nomeSala").value      = sala.nome;
    byId("capacidade").value    = sala.capacidade;

    byId("cadastro").dataset.editId = String(id);
    showPage("cadastro", { target: document.querySelector('[onclick*="cadastro"]') });
  };
}

function excluirSala(id) {
  if (!confirm("Tem certeza que deseja excluir esta sala?")) return;

  const tx = db.transaction(STORES.SALAS, "readwrite");
  tx.objectStore(STORES.SALAS).delete(id);
  tx.oncomplete = () => {
    alert("Sala excluída.");
    carregarSalas();
  };
}

