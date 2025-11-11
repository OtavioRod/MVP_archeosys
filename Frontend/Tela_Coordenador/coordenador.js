document.addEventListener("DOMContentLoaded", () => {
  const backend = "http://localhost:8000";
  let escolaUsuario = null;

  // Carregar dados do Coordenador
  fetch(`${backend}/escolacoordenador/`, { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) {
        alert("Erro na autenticação, faça login novamente.");
        return window.location.href = "/app/login.html";
      }

      const dados = await res.json();
      escolaUsuario = dados.id_escola;

      document.getElementById("nomeCoordenador").textContent = dados.nome_coordenador;
      document.getElementById("escolaCoordenador").textContent = dados.escola;

      carregarTurmas();
      carregarProfessores();
      carregarAlunos();
      carregarDisciplinas();
      carregarAlunoTurmas();
      carregarProfessoresSelect();
    })
    .catch(() => {
      alert("Erro na conexão, faça login novamente.");
      window.location.href = "/app/login.html";
    });

  // Preencher select de professores
  async function carregarProfessoresSelect() {
    try {
      const res = await fetch(`${backend}/coordenador/professores/`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Falha ao buscar professores");

      const professores = await res.json();
      const select = document.getElementById("professorSelect");

      professores.forEach((prof) => {
        const option = document.createElement("option");
        option.value = prof.id_professor;
        option.textContent = prof.nome;
        select.appendChild(option);
      });
    } catch (err) {
      alert("Erro ao carregar professores");
      console.error(err);
    }
  }

  // Função genérica para envio de formulários
  function enviarFormulario(formId, endpoint, payloadBuilder) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const dados = payloadBuilder(formData);

      try {
        const res = await fetch(`${backend}${endpoint}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || `Erro no formulário ${formId}`);
        }

        alert(`Cadastro realizado com sucesso (${formId})!`);
        form.reset();
      } catch (error) {
        alert(`Erro no cadastro (${formId}): ` + error.message);
        console.error(error);
      }
    });
  }

  // Formulários
  enviarFormulario("formDisciplina", "/disciplina/", (fd) => ({
    nome: fd.get("nome"),
    turma: fd.get("turma"),
    id_professor: parseInt(fd.get("id_professor")),
  }));

  enviarFormulario("formTurma", "/turma/", (fd) => ({
    nome_turma: fd.get("nome_turma"),
    serie: fd.get("serie"),
    turno: fd.get("turno"),
    horario: fd.get("horario"),
    id_escola: escolaUsuario,
  }));

  enviarFormulario("formProfessor", "/professores/", (fd) => ({
    nome: fd.get("nome"),
    email: fd.get("email"),
    senha: fd.get("senha"),
    id_escola: escolaUsuario,
  }));

  enviarFormulario("formAluno", "/alunos/", (fd) => ({
    nome: fd.get("nome"),
    email: fd.get("email"),
    senha: fd.get("senha"),
    id_escola: escolaUsuario,
  }));

  enviarFormulario("formAlunoTurma", "/aluno_turma/", (fd) => ({
    aluno: fd.get("aluno"),
    turma: fd.get("turma"),
  }));

  // Tabelas
  async function carregarTurmas() {
    try {
      const resp = await fetch(`${backend}/coordenador/turmas/`, { credentials: "include" });
      const turmas = await resp.json();
      const tabela = document.querySelector("#tabelaTurmas tbody");
      tabela.innerHTML = "";
      turmas.forEach((t) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.nome_turma}</td>
          <td>${t.serie_turma}</td>
          <td>${t.turno_turma}</td>
          <td>${t.horario_turma}</td>
          <td>${t.id_turma}</td>`;
        tabela.appendChild(tr);
      });
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
    }
  }

  async function carregarProfessores() {
    try {
      const resp = await fetch(`${backend}/coordenador/professores/`, { credentials: "include" });
      const professores = await resp.json();
      const tabela = document.querySelector("#tabelaProfessores tbody");
      tabela.innerHTML = "";
      professores.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.nome}</td>
          <td>${p.email}</td>
          <td>${p.id_professor}</td>`;
        tabela.appendChild(tr);
      });
    } catch (err) {
      console.error("Erro ao carregar professores:", err);
    }
  }

  async function carregarAlunos() {
    try {
      const resp = await fetch(`${backend}/coordenador/alunos/`, { credentials: "include" });
      const alunos = await resp.json();
      const tabela = document.querySelector("#tabelaAlunos tbody");
      tabela.innerHTML = "";
      alunos.forEach((a) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${a.nome_aluno}</td>
          <td>${a.email_aluno}</td>
          <td>${a.id_aluno}</td>`;
        tabela.appendChild(tr);
      });
    } catch (err) {
      console.error("Erro ao carregar alunos:", err);
    }
  }

  async function carregarDisciplinas() {
    try {
      const resp = await fetch(`${backend}/coordenador/disciplinas/`, { credentials: "include" });
      const disciplinas = await resp.json();
      const tabela = document.querySelector("#tabelaDisciplinas tbody");
      tabela.innerHTML = "";

      if (Array.isArray(disciplinas)) {
        disciplinas.forEach((d) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${d.nome_disciplina}</td>
          <td>${d.id_disciplina}</td>`;
          tabela.appendChild(tr);
        });
      }
    } catch (err) {
      console.error("Erro ao carregar disciplinas:", err);
    }
  }

  async function carregarAlunoTurmas() {
    try {
      const resp = await fetch(`${backend}/coordenador/aluno_turma/`, { credentials: "include" });
      const relacoes = await resp.json();
      const tabela = document.querySelector("#tabelaAlunoTurma tbody");
      tabela.innerHTML = "";
      relacoes.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.nome_aluno}</td>
          <td>${r.nome_turma}</td>
          <td>${r.id_aluno_turma}</td>`;
        tabela.appendChild(tr);
      });
    } catch (err) {
      console.error("Erro ao carregar aluno-turma:", err);
    }
  }
});
