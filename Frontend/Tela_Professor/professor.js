const token = localStorage.getItem("token");
const professorNome = localStorage.getItem("nome");/////////////
const professorEscola = localStorage.getItem("usuario_escola");

// Ao carregar a página
window.onload = () => {
  document.getElementById("professor-nome").innerText = professorNome || "Professor";
  document.getElementById("professor-escola").innerText = professorEscola || "Escola vinculada não encontrada";
  carregarTurmasEDisciplinas();
};

// Carrega turmas e disciplinas do professor
async function carregarTurmasEDisciplinas() {
  try {
    const response = await fetch("http://localhost:8000/professor/turmas_disciplinas", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const dados = await response.json();
    const turmaSelect = document.getElementById("turma-select");
    const disciplinaSelect = document.getElementById("disciplina-select");

    dados.turmas.forEach((turma) => {
      const option = document.createElement("option");
      option.value = turma;
      option.text = turma;
      turmaSelect.appendChild(option);
    });

    dados.disciplinas.forEach((disciplina) => {
      const option = document.createElement("option");
      option.value = disciplina;
      option.text = disciplina;
      disciplinaSelect.appendChild(option);
    });
  } catch (error) {
    alert("Erro ao carregar turmas e disciplinas.");
  }
}

// Carrega os alunos ao clicar em "Carregar Alunos"
async function carregarAlunos() {
  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;

  if (!turma || !disciplina) {
    alert("Selecione a turma e a disciplina.");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:8000/professor/alunos?turma=${turma}&disciplina=${disciplina}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const alunos = await response.json();
    const tbody = document.querySelector("#alunos-tbody");
    tbody.innerHTML = "";

    alunos.forEach((aluno) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${aluno.nome}</td>
        <td><input type="checkbox" data-aluno="${aluno.nome}" class="presente-checkbox" /></td>
        <td><input type="number" min="0" max="10" step="0.1" data-aluno="${aluno.nome}" class="nota-input" /></td>
        <td><input type="text" placeholder="Justificativa (se necessário)" data-aluno="${aluno.nome}" class="justificativa-input" /></td>
      `;

      tbody.appendChild(row);
    });

    document.getElementById("alunos-section").style.display = "block";
  } catch (err) {
    alert("Erro ao carregar alunos.");
  }
}

// Envia o diário completo
async function enviarDiario() {
  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;
  const conteudo = document.getElementById("conteudo").value;
  const metodologia = document.getElementById("metodologia").value;
  const recursos = document.getElementById("recursos").value;

  const presencas = [];
  const notas = [];

  document.querySelectorAll(".presente-checkbox").forEach((checkbox) => {
    const aluno = checkbox.dataset.aluno;
    const presente = checkbox.checked;
    const justificativa = document.querySelector(`.justificativa-input[data-aluno="${aluno}"]`).value;

    presencas.push({ aluno, presente, disciplina, justificativa });
  });

  document.querySelectorAll(".nota-input").forEach((input) => {
    const aluno = input.dataset.aluno;
    const nota = parseFloat(input.value);
    if (!isNaN(nota)) {
      notas.push({ aluno, disciplina, bimestre: 1, nota });
    }
  });

  try {
    // Enviar presenças
    for (const presenca of presencas) {
      await fetch("http://localhost:8000/presenca/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(presenca),
      });
    }

    // Enviar notas
    for (const nota of notas) {
      await fetch("http://localhost:8000/notas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nota),
      });
    }

    // Enviar relatório
    const relatorio = {
      professor: professorNome || "",
      disciplina,
      conteudo,
      metodologia,
      recursos
    };
    console.log("Relatório a enviar:", relatorio);
    await fetch("http://localhost:8000/relatorioaula/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(relatorio),
    });

    alert("Diário enviado com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao enviar diário.");
  }
}
