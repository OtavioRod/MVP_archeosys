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

      // Depois de confirmar que é coordenador, carregue a lista de professores:
      carregarProfessores();
    })
    .catch(() => {
      alert("Erro na conexão, faça login novamente.");
      window.location.href = "/app/login.html";
    });

  // Carrega os professores no select
  async function carregarProfessores() {
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

  // Cadastrar disciplina para professor selecionado
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

  // Cadastrar Aluno
  enviarFormulario("formAluno", "/alunos/", (fd) => ({
    nome: fd.get("nome"),
    email: fd.get("email"),
    senha: fd.get("senha"),
    id_escola: escolaUsuario,
  }));

  // Vincular Aluno à Turma
  enviarFormulario("formAlunoTurma", "/aluno_turma/", (fd) => ({
    aluno: fd.get("aluno"),
    turma: fd.get("turma"),
  }));
});
