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
  if (pageId === "listarSalas") {
    carregarSalas();
  }
  if (event && event.target) event.target.classList.add('active');
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
const form = document.getElementById("formCadastroSala");

form.onsubmit = (e) => {
  e.preventDefault();

  const tipo = document.getElementById("tipoCadastro").value;
  const bloco = document.getElementById("blocoCadastro").value;
  const nome = document.getElementById("nomeSala").value;
  const capacidade = parseInt(document.getElementById("capacidade").value, 10);

  const sala = { tipo, bloco, nome, capacidade };

  const editId = document.getElementById("cadastro").dataset.editId;
  const tx = db.transaction("salas", "readwrite");
  const store = tx.objectStore("salas");

  if (editId) {
    sala.id = parseInt(editId, 10);
    store.put(sala);
    delete document.getElementById("cadastro").dataset.editId;
  } else {
    store.add(sala);
  }

  tx.oncomplete = () => {
    form.reset();
    alert("Sala salva com sucesso!");
    carregarSalas();
  };
};

/* ===== Modal de Agendamento ===== */
function openModal(hora, diaIndex) {
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const startHour = parseInt(hora.split(':')[0], 10);
  const dayLabel = dayNames[diaIndex];

  const horarioInput = document.getElementById('modalHorario');
  horarioInput.dataset.startHour = String(startHour);
  horarioInput.dataset.day = diaIndex;
  horarioInput.dataset.dayLabel = dayLabel;

  atualizarHorario();
  atualizarSalas();
  new bootstrap.Modal(document.getElementById('modalAgendar')).show();
}

/* Atualizar lista de salas com verificação de bloqueio */
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
    const todasSalas = e.target.result;
    const lista = todasSalas.filter(s => s.tipo === tipo && s.bloco === bloco);

    if (lista.length === 0) {
      salaSelect.innerHTML = "<option>Sem salas para este bloco</option>";

      // Fechar modal de agendamento antes de abrir o modal de atenção
      const modalAg = bootstrap.Modal.getInstance(document.getElementById('modalAgendar'));
      if (modalAg) modalAg.hide();

      new bootstrap.Modal(document.getElementById('modalSemSalas')).show();
      return;
    }

    const horarioInput = document.getElementById("modalHorario");
    const startHour = parseInt(horarioInput.dataset.startHour, 10);
    const endHour = startHour + parseInt(document.querySelector('input[name="periodos"]:checked').value, 10);
    const dia = parseInt(horarioInput.dataset.day, 10);

    const tx2 = db.transaction("agendamentos", "readonly");
    tx2.objectStore("agendamentos").getAll().onsuccess = function (ev) {
      const agendamentos = ev.target.result;

      lista.forEach(s => {
        const estaOcupada = agendamentos.some(ag => 
          ag.sala === s.nome &&
          ag.dia === dia &&
          !(endHour <= ag.startHour || startHour >= ag.endHour)
        );

        const opt = document.createElement("option");
        opt.value = s.nome;
        opt.textContent = s.nome;
        if (estaOcupada) {
          opt.disabled = true;
          opt.textContent += " (Ocupada)";
        }
        salaSelect.appendChild(opt);
      });
    };
  };
}

/* Atualizar horário final */
function atualizarHorario() {
  const horarioInput = document.getElementById("modalHorario");
  const startHour = parseInt(horarioInput.dataset.startHour || "8", 10);
  const dayLabel = horarioInput.dataset.dayLabel || "";
  const periodos = parseInt(document.querySelector('input[name="periodos"]:checked').value, 10);

  const endHour = startHour + periodos;
  horarioInput.dataset.endHour = endHour;

  horarioInput.value = `${dayLabel}, ${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
}

/* Confirmar Agendamento */
document.getElementById("confirmarAgendamento").addEventListener("click", function () {
  const sala = document.getElementById("sala").value;
  const professor = document.getElementById("professor").value;
  const horarioInput = document.getElementById("modalHorario");

  if (!sala || !professor || sala === "Sem salas para este bloco") {
    alert("Selecione uma sala válida.");
    return;
  }

  const agendamento = {
    sala,
    professor,
    dia: parseInt(horarioInput.dataset.day, 10),
    startHour: parseInt(horarioInput.dataset.startHour, 10),
    endHour: parseInt(horarioInput.dataset.endHour, 10)
  };

  verificarConflitoESalvar(agendamento);
});

/* Verificar conflito antes de salvar */
function verificarConflitoESalvar(data) {
  const tx = db.transaction("agendamentos", "readonly");
  const index = tx.objectStore("agendamentos").index("sala_dia");
  const range = IDBKeyRange.only([data.sala, data.dia]);

  let conflito = null;

  index.openCursor(range).onsuccess = function (e) {
    const cursor = e.target.result;
    if (cursor) {
      const ag = cursor.value;
      if (!(data.endHour <= ag.startHour || data.startHour >= ag.endHour)) {
        conflito = ag;
      }
      cursor.continue();
    }
  };

  tx.oncomplete = function () {
    if (conflito) {
      alert(`Horário ocupado pelo professor ${conflito.professor}, selecione outro.`);
    } else {
      const tx2 = db.transaction("agendamentos", "readwrite");
      tx2.objectStore("agendamentos").add(data);
      tx2.oncomplete = () => {
        alert("Agendamento confirmado!");
        marcarAgendamentos();
        bootstrap.Modal.getInstance(document.getElementById('modalAgendar')).hide();
      };
    }
  };
}

/* ===== Pintar calendário com agendamentos ===== */
function marcarAgendamentos() {
  const tx = db.transaction("agendamentos", "readonly");
  tx.objectStore("agendamentos").getAll().onsuccess = function (e) {
    const lista = e.target.result;

    document.querySelectorAll(".calendar-cell").forEach(c => {
      c.style.backgroundColor = "";
      c.title = "";
      const hora = parseInt(c.dataset.hora.split(":")[0], 10);
      const dia = parseInt(c.dataset.dia, 10);
      c.onclick = () => openModal(c.dataset.hora, dia);
    });

    lista.forEach(ag => {
      for (let h = ag.startHour; h < ag.endHour; h++) {
        const cell = document.querySelector(
          `.calendar-cell[data-dia="${ag.dia}"][data-hora="${h}:00"]`
        );
        if (cell) {
          cell.style.backgroundColor = "#f8d7da";
          cell.title = `Ocupado: ${ag.professor} (${ag.sala})`;
          cell.onclick = () => {
            alert(`📌 Detalhes:\nProfessor: ${ag.professor}\nSala: ${ag.sala}\nHorário: ${ag.startHour}:00 - ${ag.endHour}:00`);
          };
        }
      }
    });
  };
}

/* ===== Montar calendário ===== */
function generateCalendar() {
  const calendar = document.getElementById("calendar");

  let html = `<div></div>`;
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  dias.forEach(d => html += `<div class="calendar-header">${d}</div>`);

  for (let hour = 8; hour <= 22; hour++) {
    html += `<div class="calendar-time">${hour}:00</div>`;
    for (let day = 0; day < 7; day++) {
      html += `<div class="calendar-cell" 
                     data-dia="${day}" 
                     data-hora="${hour}:00"
                     onclick="openModal('${hour}:00','${day}')"></div>`;
    }
  }
  calendar.innerHTML = html;

  marcarAgendamentos();
}

/* ===== Listeners ===== */
document.getElementById("tipoSala").addEventListener("change", atualizarSalas);
document.getElementById("blocoSala").addEventListener("change", atualizarSalas);
document.querySelectorAll("input[name='periodos']").forEach(r => r.addEventListener("change", atualizarHorario));

/* ===== Listagem de Salas ===== */
function carregarSalas() {
  const tbody = document.querySelector("#tabelaSalas tbody");
  tbody.innerHTML = "";

  const tx = db.transaction("salas", "readonly");
  const store = tx.objectStore("salas");
  store.getAll().onsuccess = (event) => {
    const salas = event.target.result;
    if (salas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma sala cadastrada</td></tr>`;
      return;
    }
    salas.forEach(sala => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
    <td>${sala.tipo}</td>
    <td>${sala.bloco}</td>
    <td>${sala.nome}</td>
    <td>${sala.capacidade}</td>
    <td>
      <button class="btn btn-sm btn-outline-primary me-1" onclick="editarSala(${sala.id})">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="excluirSala(${sala.id})">
        <i class="bi bi-trash"></i>
      </button>
    </td>`;
      tbody.appendChild(tr);
    });
  };
}

/* Excluir sala */
function excluirSala(id) {
  if (!confirm("Tem certeza que deseja excluir esta sala?")) return;

  const tx = db.transaction("salas", "readwrite");
  const store = tx.objectStore("salas");
  store.delete(id);
  tx.oncomplete = () => {
    carregarSalas();
  };
}

/* Editar sala */
function editarSala(id) {
  const tx = db.transaction("salas", "readonly");
  const store = tx.objectStore("salas");
  store.get(id).onsuccess = (event) => {
    const sala = event.target.result;
    if (!sala) return;

    document.getElementById("tipoCadastro").value = sala.tipo;
    document.getElementById("blocoCadastro").value = sala.bloco;
    document.getElementById("nomeSala").value = sala.nome;
    document.getElementById("capacidade").value = sala.capacidade;

    document.getElementById("cadastro").dataset.editId = id;
    showPage("cadastro", { target: document.querySelector('[onclick*="cadastro"]') });
  };
}

/* Abrir cadastro do modal de atenção */
function abrirCadastroDoModalSemSalas() {
  const modalAg = bootstrap.Modal.getInstance(document.getElementById('modalAgendar'));
  if (modalAg) modalAg.hide();

  const modalSem = bootstrap.Modal.getInstance(document.getElementById('modalSemSalas'));
  if (modalSem) modalSem.hide();

  showPage('cadastro', { target: document.querySelector('[onclick*="cadastro"]') });
}
