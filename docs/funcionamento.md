# Funcionamento do Sistema

O sistema de agendamento de salas foi desenvolvido para ser simples, didático e funcional, com armazenamento local via **IndexedDB**.

---

## 🔹 Acesso dos usuários

- **Professores:**  
  - Podem **cadastrar salas**, incluindo tipo (Sala de Aula, Laboratório, Auditório), bloco, nome e capacidade;  
  - Podem **agendar horários** e alterar reservas existentes;  
  - Todas as informações ficam salvas no **IndexedDB**, garantindo persistência local.

- **Alunos:**  
  - Podem **visualizar as reservas** de salas, horários e blocos;  
  - Não têm permissão para criar ou alterar dados.

---

## 🔹 Tipos de espaços disponíveis

- **Salas de Aula**  
- **Laboratórios**  
- **Auditórios**

---

## 🔹 Fluxo de funcionamento

1. O professor acessa o site e seleciona **Cadastro de Salas** ou **Agendamento de Salas**;  
2. Para cadastro, o professor preenche os dados da sala e salva no IndexedDB;  
3. Para agendamento, o sistema verifica se há disponibilidade e salva a reserva no IndexedDB;  
4. Alunos podem consultar horários e salas na página **Listar Salas**;  
5. Modais e validações ajudam a evitar conflitos ou agendamentos duplicados.

> 🔹 Todas as interações são feitas localmente, sem necessidade de servidor.

---

## 🔹 Observações

- O sistema funciona offline, desde que o navegador já tenha carregado os recursos externos (Bootstrap e ícones);  
- O IndexedDB mantém os dados mesmo após fechar o navegador;  
- Caso queira limpar dados, é necessário limpar o cache ou histórico do navegador.
