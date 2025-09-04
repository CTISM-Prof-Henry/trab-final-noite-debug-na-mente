// Trocar de página (agenda <-> cadastro)
function showPage(pageId, event) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';

  // Atualizar nav ativo
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  event.target.classList.add('active');
}

// Abrir modal com hora/dia
function openModal(hora, diaIndex) {
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const startHour = parseInt(hora.split(':')[0], 10);
  const dayLabel = isNaN(diaIndex) ? String(diaIndex) : dayNames[parseInt(diaIndex, 10)];

  // Guardar dados para cálculo posterior
  const horarioInput = document.getElementById('modalHorario');
  horarioInput.dataset.startHour = String(startHour);
  horarioInput.dataset.dayLabel = dayLabel;

  // Setar valor inicial (início) e depois calcular fim conforme períodos
  horarioInput.value = `${dayLabel}, ${String(startHour).padStart(2,'0')}:00`;
  atualizarHorario(); // completa com hora final

  new bootstrap.Modal(document.getElementById('modalAgendar')).show();
}

// Montar calendário semanal dinamicamente
function generateCalendar() {
  const calendar = document.getElementById("calendar");

  // Cabeçalho
  let html = `
    <div></div>
    <div class="calendar-header">Dom</div>
    <div class="calendar-header">Seg</div>
    <div class="calendar-header">Ter</div>
    <div class="calendar-header">Qua</div>
    <div class="calendar-header">Qui</div>
    <div class="calendar-header">Sex</div>
    <div class="calendar-header">Sáb</div>
  `;

  // Linhas por hora (ex: 8h às 22h)
  for (let hour = 8; hour <= 22; hour++) {
    html += `<div class="calendar-time">${hour}:00</div>`;
    for (let day = 0; day < 7; day++) {
      html += `<div class="calendar-cell" onclick="openModal('${hour}:00','${day}')"></div>`;
    }
  }

  calendar.innerHTML = html;
}

/* --- Novos elementos/lógicas --- */

// Base de salas por tipo e bloco
const salasData = {
  laboratorio: {
    A: ["Lab A1", "Lab A2"],
    B: ["Lab B1"],
    C: ["Lab C Redes"],
    D: ["Lab D Automação"],
    E: [], F: [], G: []
  },
  sala: {
    A: ["Sala A101", "Sala A102"],
    B: ["Sala B201"],
    C: ["Sala C301"],
    D: [], E: [], F: [], G: []
  },
  auditorio: {
    A: ["Auditório A"], B: [], C: [], D: [], E: [], F: [], G: ["Auditório G"]
  }
};

// Atualiza dropdown de salas com base em tipo + bloco
function atualizarSalas() {
  const tipo = document.getElementById("tipoSala").value;
  const bloco = document.getElementById("blocoSala").value;
  const salaSelect = document.getElementById("sala");

  salaSelect.innerHTML = "";

  if (!tipo || !bloco || !salasData[tipo]) {
    const opt = document.createElement("option");
    opt.textContent = "Selecione tipo e bloco";
    salaSelect.appendChild(opt);
    return;
  }

  const lista = salasData[tipo][bloco] || [];
  if (lista.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "Sem salas para este bloco";
    salaSelect.appendChild(opt);
    return;
  }

  lista.forEach(nome => {
    const opt = document.createElement("option");
    opt.value = nome;
    opt.textContent = nome;
    salaSelect.appendChild(opt);
  });
}

// Calcula e exibe horário final conforme nº de períodos
function atualizarHorario() {
  const horarioInput = document.getElementById("modalHorario");
  const startHour = parseInt(horarioInput.dataset.startHour || "8", 10);
  const dayLabel = horarioInput.dataset.dayLabel || "";
  const periodosEl = document.querySelector('input[name="periodos"]:checked');
  const periodos = periodosEl ? parseInt(periodosEl.value, 10) : 1;

  const endHour = startHour + periodos;
  const startStr = String(startHour).padStart(2, '0') + ":00";
  const endStr = String(endHour).padStart(2, '0') + ":00";
  horarioInput.value = `${dayLabel}, ${startStr} - ${endStr}`;
}

// Rodar ao carregar a página
window.onload = () => {
  generateCalendar();

  // Listeners para atualizar salas
  const tipoSel = document.getElementById("tipoSala");
  const blocoSel = document.getElementById("blocoSala");
  if (tipoSel && blocoSel) {
    tipoSel.addEventListener("change", atualizarSalas);
    blocoSel.addEventListener("change", atualizarSalas);
  }

  // Listener para períodos
  document.querySelectorAll('input[name="periodos"]').forEach(r => {
    r.addEventListener("change", atualizarHorario);
  });
};
