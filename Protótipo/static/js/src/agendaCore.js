/*
 *regras simples: conflito de horário e filtro de salas disponíveis.
 */

/**
 * Retorna true se os intervalos [startA, endA) e [startB, endB) se sobrepõem.
 * Observação: se um termina exatamente quando o outro começa, NÃO é conflito.
 */
export function rangesOverlap(startA, endA, startB, endB) {
  return !(endA <= startB || startA >= endB);
}

/** Calcula o horário final a partir do início e da quantidade de períodos. */
export function calcEndHour(startHour, periodos) {
  const p = Number(periodos);
  const s = Number(startHour);

  if (!Number.isInteger(s) || !Number.isInteger(p) || p <= 0) {
    throw new Error("Períodos inválidos");
  }
  return s + p;
}

/**
 * "Componente" simples: mantém uma lista de agendamentos em memória
 * e impede salvar quando existe conflito na mesma sala e mesmo dia.
 */
export class Agenda {
  constructor(agendamentos = []) {
    this.agendamentos = [...agendamentos];
  }

  addAgendamento(novo) {
    // validação básica
    if (!novo || !novo.sala || !novo.professor) throw new Error("Dados incompletos");
    if (!Number.isInteger(novo.dia)) throw new Error("Dia inválido");
    if (!Number.isInteger(novo.startHour) || !Number.isInteger(novo.endHour)) throw new Error("Horário inválido");

    const conflito = this.agendamentos.some((ag) =>
      ag.sala === novo.sala &&
      ag.dia === novo.dia &&
      rangesOverlap(novo.startHour, novo.endHour, ag.startHour, ag.endHour)
    );

    if (conflito) {
      throw new Error("Conflito de horário");
    }

    this.agendamentos.push({ ...novo });
    return true;
  }
}

/**
 * Integração simples: filtra salas por tipo/bloco e remove as ocupadas no horário escolhido.
 */
export function getSalasDisponiveis(salas, agendamentos, filtro) {
  const { tipo, bloco, dia, startHour, endHour } = filtro;

  return (salas || [])
    .filter((s) => s.tipo === tipo && s.bloco === bloco)
    .filter((s) => !(agendamentos || []).some((ag) =>
      ag.sala === s.nome &&
      ag.dia === dia &&
      rangesOverlap(startHour, endHour, ag.startHour, ag.endHour)
    ))
    .map((s) => s.nome);
}
