import { rangesOverlap, calcEndHour, Agenda, getSalasDisponiveis } from "../src/agendaCore.js";

QUnit.module("Regras de agendamento");

QUnit.test("Unitário: rangesOverlap detecta conflito de horário", (assert) => {
  // Encostou (10-12 com 8-10) -> NÃO é conflito
  assert.notOk(rangesOverlap(8, 10, 10, 12));

  // Sobrepôs (9-11 com 8-10) -> conflito
  assert.ok(rangesOverlap(8, 10, 9, 11));

  // Igual (8-10 com 8-10) -> conflito
  assert.ok(rangesOverlap(8, 10, 8, 10));
});

QUnit.test("Componente: Agenda.addAgendamento impede conflito na mesma sala/dia", (assert) => {
  const agenda = new Agenda();

  assert.ok(agenda.addAgendamento({
    sala: "Sala 101",
    professor: "Henry",
    dia: 2,
    startHour: 8,
    endHour: 10
  }));

  assert.throws(() => agenda.addAgendamento({
    sala: "Sala 101",
    professor: "Daniel",
    dia: 2,
    startHour: 9,   // conflita
    endHour: 11
  }), /Conflito/);

  // Outra sala no mesmo horário -> OK
  assert.ok(agenda.addAgendamento({
    sala: "Sala 202",
    professor: "Daniel",
    dia: 2,
    startHour: 9,
    endHour: 11
  }));
});

QUnit.test("Integração simples: getSalasDisponiveis retorna só as salas livres", (assert) => {
  const salas = [
    { nome: "Sala 101", tipo: "Teórica", bloco: "A", capacidade: 40 },
    { nome: "Sala 102", tipo: "Teórica", bloco: "A", capacidade: 35 },
    { nome: "Lab 201",  tipo: "Laboratório", bloco: "B", capacidade: 25 }
  ];

  const agendamentos = [
    { sala: "Sala 101", professor: "Henry", dia: 2, startHour: 8, endHour: 10 }
  ];

  const disponiveis = getSalasDisponiveis(salas, agendamentos, {
    tipo: "Teórica",
    bloco: "A",
    dia: 2,
    startHour: 9,
    endHour: 11
  });

  // Sala 101 está ocupada, então só sobra a 102
  assert.deepEqual(disponiveis, ["Sala 102"]);
});

QUnit.test("Unitário (bônus): calcEndHour calcula horário final por períodos", (assert) => {
  assert.equal(calcEndHour(8, 2), 10);
  assert.throws(() => calcEndHour(8, 0), /inválidos/i);
});
