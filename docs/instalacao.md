#  Instalação e Execução do Sistema de Agendamento de Salas

Este guia ensina **passo a passo** como baixar, instalar e rodar o sistema de agendamento de salas localmente.  
Mesmo que você nunca tenha usado Git ou MkDocs antes, basta seguir as instruções abaixo.

---

##  1. Pré-requisitos

Antes de começar, verifique se você possui os seguintes itens instalados:

### 🔹 Git
O **Git** é usado para baixar o código do projeto diretamente do repositório no GitHub.

- Para instalar no **Windows**:
  1. Acesse [https://git-scm.com/downloads](https://git-scm.com/downloads)
  2. Baixe o instalador e siga as instruções (pode deixar todas as opções padrão).
  3. Após instalado, abra o terminal (ou PowerShell) e digite:
     ```bash
     git --version
     ```

- No **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt update
  sudo apt install git

##  2. Baixar o Projeto (Clonar o Repositório)

Agora, vamos baixar o código do site diretamente do GitHub.

1. Escolha uma pasta no seu computador (por exemplo, Documentos ou Área de Trabalho).
2. Clique com o botão direito e selecione **“Abrir no terminal”** ou **“Git Bash Here”**.
3. Digite o comando abaixo:

   ```bash
   git clone https://github.com/CTISM-Prof-Henry/trab-final-noite-debug-na-mente.git

  Aguarde o download terminar.
  Isso criará uma nova pasta chamada:

  trab-final-noite-debug-na-mente

##  3. Acessar o Projeto

  Depois que o repositório for clonado, entre na pasta do projeto:
  cd trab-final-noite-debug-na-mente

##  4. Estrutura do Projeto

  Dentro da pasta, você verá algo como:

  trab-final-noite-debug-na-mente/
├── index.html

├── script.js

├── style.css

├── docs/

│   ├── index.md
│   ├── instalacao.md
│   ├── funcionamento.md
│   └── melhorias.md
└── mkdocs.yml


## 5. Executar o Site Localmente

O site é feito em HTML, CSS e JavaScript puro, então não precisa de servidor.
Para executá-lo:

1. Localize o arquivo index.html dentro da pasta do projeto.
2. Clique duas vezes nele.

O site abrirá automaticamente no navegador padrão.

##  6. Banco de Dados (IndexedDB)

O projeto usa o IndexedDB, um banco de dados interno do navegador.

🔹 Não é necessário instalar nada.

🔹Os dados são salvos localmente, dentro do próprio navegador.

🔹Mesmo ao fechar o site, as informações continuam armazenadas.

 Isso é ideal para testes e uso local. Em versões futuras, o sistema poderá se conectar a um banco de dados real (como MySQL ou Firebase).


##  7. Conclusão

Se todos os passos foram seguidos corretamente:

🔹O site deve abrir normalmente no navegador.

🔹Professores podem cadastrar, agendar e alterar salas.

🔹Alunos podem visualizar os horários e locais disponíveis.

Você agora possui o sistema rodando localmente e pode fazer alterações livremente no código, visualizar a documentação, e até contribuir com melhorias no GitHub! 






