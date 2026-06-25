const backend = "http://localhost:8000";

document.addEventListener("DOMContentLoaded", () => {
  inicializarPainel();
});

async function inicializarPainel() {
  try {
    await carregarPerfil();
    await carregarNotas();
    await carregarDisciplinas();

    document
      .getElementById("disciplinaSelect")
      .addEventListener("change", carregarPresencas);

  } catch (erro) {
    console.error(erro);
    alert("Erro ao carregar os dados do aluno.");
  }
}

// ==============================
// PERFIL
// ==============================

async function carregarPerfil() {

  const resposta = await fetch(
    `${backend}/aluno/perfil`,
    {
      credentials: "include",
    }
  );

  if (!resposta.ok) {
    throw new Error("Erro ao buscar perfil.");
  }

  const aluno = await resposta.json();

  document.getElementById("alunoInfo").innerHTML = `
    <div class="card">
      <strong>Nome</strong>
      <p>${aluno.nome}</p>
    </div>

    <div class="card">
      <strong>Turma</strong>
      <p>${aluno.turma}</p>
    </div>

    <div class="card">
      <strong>Escola</strong>
      <p>${aluno.escola}</p>
    </div>
  `;
}

// ==============================
// NOTAS
// ==============================

async function carregarNotas() {

  const resposta = await fetch(
    `${backend}/aluno/notas`,
    {
      credentials: "include",
    }
  );

  if (!resposta.ok) {
    throw new Error("Erro ao carregar notas.");
  }

  const notas = await resposta.json();

  const container =
    document.getElementById("notas");

  container.innerHTML = "";

  if (notas.length === 0) {

    container.innerHTML =
      "<p>Nenhuma nota cadastrada.</p>";

    return;
  }

  notas.forEach((nota) => {

    const card =
      document.createElement("div");

    card.className = "card";

    card.innerHTML = `
      <strong>${nota.disciplina}</strong>

      <p>Bimestre: ${nota.bimestre}</p>

      <p>Nota: ${nota.nota}</p>
    `;

    container.appendChild(card);

  });

}

// ==============================
// DISCIPLINAS
// ==============================

async function carregarDisciplinas() {

  const resposta = await fetch(
    `${backend}/aluno/disciplinas`,
    {
      credentials: "include",
    }
  );

  if (!resposta.ok) {
    throw new Error("Erro ao carregar disciplinas.");
  }

  const disciplinas =
    await resposta.json();

  const select =
    document.getElementById("disciplinaSelect");

  select.innerHTML = `
    <option value="">
      Selecione uma disciplina
    </option>
  `;

  disciplinas.forEach((disciplina) => {

    const option =
      document.createElement("option");

    option.value = disciplina;
    option.textContent = disciplina;

    select.appendChild(option);

  });

}

// ==============================
// PRESENÇAS
// ==============================

async function carregarPresencas() {

  const disciplina =
    document.getElementById("disciplinaSelect").value;

  const container =
    document.getElementById("presencas");

  if (!disciplina) {

    container.innerHTML =
      "<p>Selecione uma disciplina.</p>";

    return;

  }

  try {

    const resposta = await fetch(
      `${backend}/aluno/presencas?disciplina=${encodeURIComponent(disciplina)}`,
      {
        credentials: "include",
      }
    );

    if (!resposta.ok) {
      throw new Error();
    }

    const presencas =
      await resposta.json();

    container.innerHTML = "";

    if (presencas.length === 0) {

      container.innerHTML =
        "<p>Nenhuma presença encontrada.</p>";

      return;

    }

    presencas.forEach((presenca) => {

      const card =
        document.createElement("div");

      card.className = "card";

      card.innerHTML = `
        <strong>Data</strong>

        <p>${presenca.data}</p>

        <p>
          Status:
          ${presenca.presente ? "Presente" : "Faltou"}
        </p>

        <p>
          Justificativa:
          ${presenca.justificativa || "-"}
        </p>
      `;

      container.appendChild(card);

    });

  } catch (erro) {

    console.error(erro);

    alert("Erro ao carregar presenças.");

  }

}