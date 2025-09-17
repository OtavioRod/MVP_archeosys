const token = localStorage.getItem("token");
const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
const professorNome = payload?.nome || "Professor não identificado";
const professorEscola = payload?.escola || "Escola não identificada";

window.onload = () => {
  document.getElementById("professor-nome").innerText = professorNome;
  document.getElementById("professor-escola").innerText = professorEscola;
  carregarTurmasEDisciplinas();
};

async function carregarTurmasEDisciplinas() {
  try {
    const response = await fetch("http://localhost:8000/professor/turmas_disciplinas", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const dados = await response.json();
    const turmaSelect = document.getElementById("turma-select");
    const disciplinaSelect = document.getElementById("disciplina-select");

    dados.turmas?.forEach((turma) => {
      turmaSelect.innerHTML += `<option value="${turma}">${turma}</option>`;
    });

    dados.disciplinas?.forEach((disciplina) => {
      disciplinaSelect.innerHTML += `<option value="${disciplina}">${disciplina}</option>`;
    });
  } catch {
    alert("Erro ao carregar turmas e disciplinas.");
  }
}

async function carregarAlunos() {
  document.getElementById("data-aula").innerText = new Date().toLocaleDateString("pt-BR");
  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;

  if (!turma || !disciplina) return alert("Selecione turma e disciplina.");

  try {
    const response = await fetch(`http://localhost:8000/professor/alunos?turma=${turma}&disciplina=${disciplina}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const alunos = await response.json();
    const tbody = document.getElementById("alunos-tbody");
    tbody.innerHTML = "";

    alunos.forEach((aluno) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${aluno.nome}</td>
        <td><input type="checkbox" data-aluno="${aluno.nome}" class="presente-checkbox" /></td>
        <td><input type="number" min="0" max="10" step="0.1" data-aluno="${aluno.nome}" class="nota-input" /></td>
        <td><input type="text" placeholder="Justificativa" data-aluno="${aluno.nome}" class="justificativa-input" /></td>
      `;
      tbody.appendChild(row);
    });

    document.getElementById("alunos-section").style.display = "block";
  } catch {
    alert("Erro ao carregar alunos.");
  }
}

async function enviarDiario() {
  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;
  const conteudo = document.getElementById("conteudo").value;
  const metodologia = document.getElementById("metodologia").value;
  const recursos = document.getElementById("recursos").value;

  const presencas = [], notas = [];

  document.querySelectorAll(".presente-checkbox").forEach((cb) => {
    const aluno = cb.dataset.aluno;
    const presente = cb.checked;
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
    for (const presenca of presencas) {
      await fetch("http://localhost:8000/presenca/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(presenca),
      });
    }

    for (const nota of notas) {
      await fetch("http://localhost:8000/notas/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(nota),
      });
    }

    const relatorio = { professor: professorNome, disciplina, conteudo, metodologia, recursos };
    await fetch("http://localhost:8000/relatorioaula/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(relatorio),
    });

    alert("Diário enviado com sucesso!");
  } catch (err) {
    alert("Erro ao enviar diário.");
  }
}

async function mostrarVisualizacaoNotas() {
  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;

  if (!turma || !disciplina) return alert("Selecione a turma e disciplina.");

  try {
    const response = await fetch(`http://localhost:8000/professor/alunos?turma=${turma}&disciplina=${disciplina}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const alunos = await response.json();
    const tbody = document.getElementById("visualizacao-tbody");
    tbody.innerHTML = "";

    alunos.forEach((aluno) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${aluno.nome}</td>
        <td><input type="number" class="nota-editavel" data-aluno="${aluno.nome}" value="${aluno.nota || ''}" min="0" max="10" step="0.1" /></td>
        <td><input type="checkbox" class="presenca-editavel" data-aluno="${aluno.nome}" ${aluno.presente ? "checked" : ""} /></td>
      `;
      tbody.appendChild(row);
    });

    document.getElementById("visualizacao-notas").style.display = "block";
  } catch {
    alert("Erro ao carregar visualização.");
  }
}

async function atualizarNotasEPresencas() {
  const disciplina = document.getElementById("disciplina-select").value;
  const turma = document.getElementById("turma-select").value;

  const notas = [], presencas = [];

  document.querySelectorAll(".nota-editavel").forEach((input) => {
    const aluno = input.dataset.aluno;
    const nota = parseFloat(input.value);
    if (!isNaN(nota)) {
      notas.push({ aluno, disciplina, bimestre: 1, nota });
    }
  });

  document.querySelectorAll(".presenca-editavel").forEach((input) => {
    const aluno = input.dataset.aluno;
    const presente = input.checked;
    presencas.push({ aluno, disciplina, presente });
  });

  if (notas.length === 0 && presencas.length === 0) {
    return alert("Nenhuma alteração detectada.");
  }

  try {
    for (const nota of notas) {
      await fetch("http://localhost:8000/notas/", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(nota),
      });
    }

    for (const presenca of presencas) {
      await fetch("http://localhost:8000/presenca/", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(presenca),
      });
    }

    alert("Notas e presenças atualizadas com sucesso!");
  } catch (err) {
    alert("Erro ao atualizar dados.");
  }
}
