document.addEventListener("DOMContentLoaded", async () => {
  const alunoInfoDiv = document.getElementById("alunoInfo");
  const notasDiv = document.getElementById("notas");
  const disciplinaSelect = document.getElementById("disciplinaSelect");
  const presencasDiv = document.getElementById("presencas");

  const backend = "http://localhost:8000";

  try {
    // ---------- PERFIL ----------
    const perfilResp = await fetch("http://localhost:8000/aluno/perfil", {
      credentials: "include",

    });

    if (!perfilResp.ok) throw new Error("Erro ao buscar perfil");

    const aluno = await perfilResp.json();

    alunoInfoDiv.innerHTML = `
      <div><strong>Nome:</strong> ${aluno.nome}</div>
      <div><strong>Turma:</strong> ${aluno.turma}</div>
      <div><strong>Escola:</strong> ${aluno.escola}</div>
    `;

    // ---------- NOTAS ----------
    const notasResp = await fetch("http://localhost:8000/aluno/notas", {
      credentials: "include",
    });

    if (!notasResp.ok) throw new Error("Erro ao carregar notas");

    const notas = await notasResp.json();

    if (notas.length === 0) {
      notasDiv.innerHTML = "<p>Nenhuma nota cadastrada ainda.</p>";
    } else {
      notas.forEach((nota) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <strong>Disciplina:</strong> ${nota.disciplina}<br>
          <strong>Bimestre:</strong> ${nota.bimestre}<br>
          <strong>Nota:</strong> ${nota.nota}
        `;
        notasDiv.appendChild(card);
      });
    }

    // ---------- DISCIPLINAS ----------
    const disciplinasResp = await fetch("http://localhost:8000/aluno/disciplinas", {
      credentials: "include",
    });

    if (!disciplinasResp.ok) throw new Error("Erro ao carregar disciplinas");

    const disciplinas = await disciplinasResp.json();

    disciplinas.forEach((nome) => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      disciplinaSelect.appendChild(option);
    });

    // ---------- PRESENÇAS ----------
    disciplinaSelect.addEventListener("change", async () => {
      const disciplina = disciplinaSelect.value;
      if (!disciplina) {
        presencasDiv.innerHTML = "<p>Selecione uma disciplina para ver as presenças.</p>";
        return;
      }

      try {
        const resp = await fetch(`http://localhost:8000/aluno/presencas?disciplina=${encodeURIComponent(disciplina)}`, {
          credentials: "include",
        });

        if (!resp.ok) throw new Error("Erro ao carregar presenças");

        const presencas = await resp.json();
        presencasDiv.innerHTML = "";

        if (presencas.length === 0) {
          presencasDiv.innerHTML = "<p>Nenhuma presença registrada para essa disciplina.</p>";
        } else {
          presencas.forEach((p) => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
              <strong>Data:</strong> ${p.data}<br>
              <strong>Status:</strong> ${p.presente ? "Presente" : "Faltou"}<br>
              <strong>Justificativa:</strong> ${p.justificativa || "-"}
            `;
            presencasDiv.appendChild(card);
          });
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar presenças.");
      }
    });

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar dados.");
  }
});
