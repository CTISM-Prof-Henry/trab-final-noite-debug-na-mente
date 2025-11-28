# Testes automatizados (QUnit)
## Estrutura criada

- `static/js/src/agendaCore.js`  
  Camada de regras (testável): conflito de horário e filtro de salas disponíveis (sem DOM/IndexedDB).

- `static/js/test/agendaCore.test.js`  
  Testes automatizados (unitário, "componente" e integração simples).

## Como executar

No terminal, entrar na pasta `Protótipo` e rodar:

```bash
npm install
npm test
```

## O que os testes cobrem

1. **Unitário**: `rangesOverlap()` valida a regra central de conflito de horário.
2. **Componente**: `Agenda.addAgendamento()` valida inserir e impedir conflitos na mesma sala/dia.
3. **Integração**: `getSalasDisponiveis()` usa salas + agendamentos para retornar apenas as salas livres.
