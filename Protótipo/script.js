let db;

/* ===== IndexedDB Setup ===== */
const request = indexedDB.open("AgendamentoDB", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;

  if (!db.objectStoreNames.contains("salas")) {
    db.createObjectStore("salas", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("agendamentos")) {
    const store = db.createObjectStore("agendamentos", { keyPath: "id", autoIncrement: true });
    store.createIndex("sala_dia", ["sala", "dia"], { unique: false });
  }
};

request.onsuccess = function (e) {
  db = e.target.result;
  generateCalendar();
};

request.onerror = function () {
  alert("Erro ao abrir IndexedDB");
};

/* ===== Navegação ===== */
function showPage(pageId, event) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }

  if (pageId === "listarSalas") {
  carregarSalas();
}

}

/* ===== Modal Login ===== */
function abrirLogin() {
  new bootstrap.Modal(document.getElementById('modalLogin')).show();
}

function logar() {
  const usuario = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  if (usuario === "admin" && senha === "1234") {
    alert("Login realizado com sucesso!");
    bootstrap.Modal.getInstance(document.getElementById('modalLogin')).hide();
  } else {
    alert("Usuário ou senha inválidos!");
  }
}

/* ===== Cadastro de Salas ===== */
const formCadastroSala = document.getElementById("formCadastroSala");

formCadastroSala.onsubmit = function (e) {
  e.preventDefault();

  const tipo = document.getElementById("tipoCadastro").value;
  const bloco = document.getElementById("blocoCadastro").value;
  const nome = document.getElementById("nomeSala").value;
  const capacidade = parseInt(document.getElementById("capacidade").value, 10);

  const registro = { tipo, bloco, nome, capacidade };

  const editId = document.getElementById("cadastro").dataset.editId;
  const tx = db.transaction("salas", "readwrite");
  const store = tx.objectStore("salas");

  if (editId) {
    registro.id = parseInt(editId, 10);
    store.put(registro);
    delete document.getElementById("cadastro").dataset.editId;
  } else {
    store.add(registro);
  }

  tx.oncomplete = function () {
    formCadastroSala.reset();
    alert("Sala salva com sucesso!");
    carregarSalas();
  };
};

/* ===== Modal de Agendamento ===== */
function openModal(hora, diaIndex) {
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const startHour = parseInt(hora.split(":")[0], 10);

  const horarioInput = document.getElementById("modalHorario");
  horarioInput.dataset.startHour = String(startHour);
  horarioInput.dataset.day = String(diaIndex);
  horarioInput.dataset.dayLabel = dayNames[diaIndex];

  atualizarHorario();
  atualizarSalas();

  new bootstrap.Modal(document.getElementById('modalAgendar')).show();
}

/* Atualiza o preview do horário no input do modal (conforme períodos) */
function atualizarHorario() {
  const horarioInput = document.getElementById("modalHorario");

  const startHour = parseInt(horarioInput.dataset.startHour || "8", 10);
  const endHour = startHour + parseInt(document.querySelector('input[name="periodos"]:checked').value, 10);
  const dayLabel = horarioInput.dataset.dayLabel || "";

  horarioInput.dataset.endHour = String(endHour);
  horarioInput.value = `${dayLabel}, ${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
}

/* Monta a lista de salas no modal, já indicando ocupadas no horário escolhido */
function atualizarSalas() {
  const tipo = document.getElementById("tipoSala").value;
  const bloco = document.getElementById("blocoSala").value;
  const salaSelect = document.getElementById("sala");
  salaSelect.innerHTML = "";

  if (!tipo || !bloco) {
    salaSelect.innerHTML = "<option>Selecione tipo e bloco</option>";
    return;
  }

  const tx = db.transaction("salas", "readonly");
  tx.objectStore("salas").getAll().onsuccess = function (e) {
    const todasSalas = e.target.result || [];
    const lista = todasSalas.filter((s) => s.tipo === tipo && s.bloco === bloco);

    if (lista.length === 0) {
      salaSelect.innerHTML = "<option>Sem salas para este bloco</option>";

      const modalAg = bootstrap.Modal.getInstance(document.getElementById('modalAgendar'));
      if (modalAg) {
        modalAg.hide();
      }

      new bootstrap.Modal(document.getElementById('modalSemSalas')).show();
      return;
    }

    const startHour = parseInt(document.getElementById("modalHorario").dataset.startHour, 10);
    const endHour = parseInt(document.getElementById("modalHorario").dataset.endHour, 10);
    const dia = parseInt(document.getElementById("modalHorario").dataset.day, 10);

    const txAg = db.transaction("agendamentos", "readonly");
    txAg.objectStore("agendamentos").getAll().onsuccess = function (ev) {
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
        if (ocupada) {
          opt.disabled = true;
        }

        salaSelect.appendChild(opt);
      });
    };
  };
}

/* Confirma o agendamento (botão do modal) */
document.getElementById("confirmarAgendamento").addEventListener("click", function () {
  const sala = document.getElementById("sala").value;
  const professor = document.getElementById("professor").value;
  const horario = document.getElementById("modalHorario");

  if (!sala || !professor) {
    alert("Preencha sala e professor.");
    return;
  }

  const data = {
    sala,
    professor,
    dia: parseInt(horario.dataset.day, 10),
    startHour: parseInt(horario.dataset.startHour, 10),
    endHour: parseInt(horario.dataset.endHour, 10),
  };

  verificarConflitoESalvar(data);
});

/* Verifica conflito de horário antes de gravar */
function verificarConflitoESalvar(data) {
  const tx = db.transaction("agendamentos", "readonly");
  const index = tx.objectStore("agendamentos").index("sala_dia");
  const range = IDBKeyRange.only([data.sala, data.dia]);

  let conflito = null;

  index.openCursor(range).onsuccess = function (e) {
    const cursor = e.target.result;
    if (!cursor) {
      return;
    }

    const ag = cursor.value;
    if (!(data.endHour <= ag.startHour || data.startHour >= ag.endHour)) {
      conflito = ag;
    }
    cursor.continue();
  };

  tx.oncomplete = function () {
    if (conflito) {
      alert(`Horário ocupado pelo professor ${conflito.professor}, selecione outro.`);
      return;
    }

    const tx2 = db.transaction("agendamentos", "readwrite");
    tx2.objectStore("agendamentos").add(data);
    tx2.oncomplete = function () {
      bootstrap.Modal.getInstance(document.getElementById('modalAgendar')).hide();
      marcarAgendamentos();
      alert("Agendamento salvo!");
    };
  };
}

/* ===== Calendário ===== */
function marcarAgendamentos() {
  document.querySelectorAll(".calendar-cell").forEach((c) => {
    c.style.backgroundColor = "";
    c.title = "";
    const dia = parseInt(c.dataset.dia, 10);
    c.onclick = () => openModal(c.dataset.hora, dia);
  });

  const tx = db.transaction("agendamentos", "readonly");
  tx.objectStore("agendamentos").getAll().onsuccess = function (e) {
    const lista = e.target.result || [];

    lista.forEach((ag) => {
      for (let h = ag.startHour; h < ag.endHour; h++) {
        const cell = document.querySelector(
          `.calendar-cell[data-dia="${ag.dia}"][data-hora="${String(h).padStart(2, "0")}:00"]`
        );
        if (cell) {
          cell.style.backgroundColor = "#ffd6a5";
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
  const calendar = document.getElementById("calendar");
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  let html = `<div></div>`;
  dias.forEach((d) => (html += `<div class="calendar-header">${d}</div>`));

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

  document.querySelectorAll(".calendar-cell").forEach((cell) => {
    const dia = parseInt(cell.dataset.dia, 10);
    cell.onclick = () => openModal(cell.dataset.hora, dia);
  });

  marcarAgendamentos();
}

/* Listeners (UI) */
document.getElementById("tipoSala").addEventListener("change", atualizarSalas);
document.getElementById("blocoSala").addEventListener("change", atualizarSalas);
document.querySelectorAll("input[name='periodos']").forEach((r) => r.addEventListener("change", atualizarHorario));

/* ===== Lista, edição e exclusão de Salas ===== */
function carregarSalas() {
  const tbody = document.querySelector("#tabelaSalas tbody");
  tbody.innerHTML = "";

  const tx = db.transaction("salas", "readonly");
  tx.objectStore("salas").getAll().onsuccess = function (e) {
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
  tx.objectStore("salas").get(id).onsuccess = function (e) {
    const sala = e.target.result;
    if (!sala) {
      return;
    }

    document.getElementById("tipoCadastro").value = sala.tipo;
    document.getElementById("blocoCadastro").value = sala.bloco;
    document.getElementById("nomeSala").value = sala.nome;
    document.getElementById("capacidade").value = sala.capacidade;

    document.getElementById("cadastro").dataset.editId = String(id);
    showPage("cadastro", { target: document.querySelector('[onclick*="cadastro"]') });
  };
}

function excluirSala(id) {
  if (!confirm("Tem certeza que deseja excluir esta sala?")) {
    return;
  }

  const tx = db.transaction("salas", "readwrite");
  tx.objectStore("salas").delete(id);
  tx.oncomplete = function () {
    alert("Sala excluída.");
    carregarSalas();
  };
}

/* Abrir cadastro do modal de atenção */
function abrirCadastroDoModalSemSalas() {
  const modalAg = bootstrap.Modal.getInstance(document.getElementById('modalAgendar'));
  if (modalAg) {
    modalAg.hide();
  }

  const modalSem = bootstrap.Modal.getInstance(document.getElementById('modalSemSalas'));
  if (modalSem) {
    modalSem.hide();
  }

  showPage('cadastro', { target: document.querySelector('[onclick*="cadastro"]') });
}
