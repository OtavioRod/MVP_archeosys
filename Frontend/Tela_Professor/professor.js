const token = localStorage.getItem("token");
const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
const professorNome = payload?.nome || "Professor";
const professorEscola = payload?.escola || "Escola nao identificada";

window.onload = async () => {
  document.getElementById("professor-nome").innerText = professorNome;
  document.getElementById("professor-escola").innerText = professorEscola;

  await carregarTurmasEDisciplinas();
  abrirAba("frequencia");
  configurarEventosFixos();
};

function configurarEventosFixos() {
  ["turma-select", "disciplina-select"].forEach((id) => {
    document.getElementById(id).addEventListener("change", async () => {
      gerarChaveDiario();

      if (document.getElementById("alunos-section").style.display !== "none") {
        await carregarAlunos(document.getElementById("btn-iniciar-aula"));
      }

      restaurarRascunho();
    });
  });
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/app/login.html";
}

function recarregarDiario() {
  carregarAlunos(document.getElementById("btn-iniciar-aula"));
}

function gerarChaveDiario() {
  const turma = document.getElementById("turma-select")?.value || "sem-turma";
  const disciplina = document.getElementById("disciplina-select")?.value || "sem-disciplina";

  const turmaAtual = document.getElementById("turma-atual");
  const disciplinaAtual = document.getElementById("disciplina-atual");

  if (turmaAtual) turmaAtual.innerText = turma === "sem-turma" ? "-" : turma;
  if (disciplinaAtual) disciplinaAtual.innerText = disciplina === "sem-disciplina" ? "-" : disciplina;

  return `diario_${turma}_${disciplina}`;
}

function salvarRascunho() {
  const dados = {
    conteudo: document.getElementById("conteudo")?.value || "",
    metodologia: document.getElementById("metodologia")?.value || "",
    recursos: document.getElementById("recursos")?.value || "",
    tarefa: document.getElementById("tarefa-casa")?.value || "",
    observacoes: document.getElementById("observacoes-aula")?.value || "",
    avaliacaoAtiva: document.getElementById("avaliacao-ativa")?.checked || false,
    tipoAvaliacao: document.getElementById("tipo-avaliacao")?.value || "Atividade",
    tituloAvaliacao: document.getElementById("titulo-avaliacao")?.value || "",
    bimestreAvaliacao: document.getElementById("bimestre-avaliacao")?.value || "1",
    presencas: [],
    notas: [],
    justificativas: [],
  };

  document.querySelectorAll(".presente-checkbox").forEach((cb) => {
    dados.presencas.push({
      aluno: cb.dataset.aluno,
      presente: cb.checked,
    });
  });

  document.querySelectorAll(".nota-input").forEach((input) => {
    dados.notas.push({
      aluno: input.dataset.aluno,
      nota: input.value,
    });
  });

  document.querySelectorAll(".justificativa-input").forEach((input) => {
    dados.justificativas.push({
      aluno: input.dataset.aluno,
      justificativa: input.value,
    });
  });

  localStorage.setItem(gerarChaveDiario(), JSON.stringify(dados));
  document.getElementById("status-rascunho").innerText =
    `Rascunho salvo as ${new Date().toLocaleTimeString("pt-BR")}`;

  atualizarResumo();
}

function restaurarRascunho() {
  const rascunho = localStorage.getItem(gerarChaveDiario());
  if (!rascunho) {
    return;
  }

  const dados = JSON.parse(rascunho);

  document.getElementById("conteudo").value = dados.conteudo || "";
  document.getElementById("metodologia").value = dados.metodologia || "";
  document.getElementById("recursos").value = dados.recursos || "";
  document.getElementById("tarefa-casa").value = dados.tarefa || "";
  document.getElementById("observacoes-aula").value = dados.observacoes || "";
  document.getElementById("avaliacao-ativa").checked = Boolean(dados.avaliacaoAtiva);
  document.getElementById("tipo-avaliacao").value = dados.tipoAvaliacao || "Atividade";
  document.getElementById("titulo-avaliacao").value = dados.tituloAvaliacao || "";
  document.getElementById("bimestre-avaliacao").value = dados.bimestreAvaliacao || "1";
  alternarAvaliacao(false);

  dados.presencas?.forEach((p) => {
    const checkbox = document.querySelector(`.presente-checkbox[data-aluno="${p.aluno}"]`);
    if (checkbox) checkbox.checked = p.presente;
  });

  dados.notas?.forEach((n) => {
    const input = document.querySelector(`.nota-input[data-aluno="${n.aluno}"]`);
    if (input) input.value = n.nota;
  });

  dados.justificativas?.forEach((j) => {
    const input = document.querySelector(`.justificativa-input[data-aluno="${j.aluno}"]`);
    if (input) input.value = j.justificativa;
  });

  mostrarMensagem("Rascunho recuperado automaticamente.");
  document.getElementById("status-rascunho").innerText = "Rascunho recuperado";
  atualizarResumo();
}

function mostrarMensagem(texto, tipo = "sucesso") {
  const msg = document.getElementById("mensagem-feedback");
  msg.innerText = texto;
  msg.className = tipo === "sucesso" ? "sucesso" : "erro";

  setTimeout(() => {
    msg.className = "";
    msg.innerText = "";
  }, 4000);
}

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

    gerarChaveDiario();
  } catch {
    mostrarMensagem("Erro ao carregar turmas e disciplinas.", "erro");
  }
}

async function carregarAlunos(botao) {
  ativarLoading(botao, "Carregando");

  document.getElementById("data-aula").innerText =
    new Date().toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;

  if (!turma || !disciplina) {
    desativarLoading(botao);
    return mostrarMensagem("Selecione turma e disciplina.", "erro");
  }

  try {
    const response = await fetch(
      `http://localhost:8000/professor/alunos?turma=${turma}&disciplina=${disciplina}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const alunos = await response.json();
    const frequenciaBody = document.getElementById("frequencia-tbody");
    const notasBody = document.getElementById("notas-tbody");

    frequenciaBody.innerHTML = "";
    notasBody.innerHTML = "";

    alunos.forEach((aluno) => {
      const linhaFreq = document.createElement("tr");
      linhaFreq.innerHTML = `
        <td><strong>${aluno.nome}</strong></td>
        <td>
          <input type="checkbox" data-aluno="${aluno.nome}" class="presente-checkbox" onchange="atualizarResumo()" />
        </td>
        <td>
          <input type="text" placeholder="Motivo da ausencia, se houver" data-aluno="${aluno.nome}" class="justificativa-input" />
        </td>
        <td>
          <button class="acao-btn" type="button" title="Excluir presenca" onclick="deletarPresenca('${aluno.nome}')">Excluir</button>
        </td>
      `;
      frequenciaBody.appendChild(linhaFreq);

      const linhaNota = document.createElement("tr");
      linhaNota.innerHTML = `
        <td><strong>${aluno.nome}</strong></td>
        <td>
          <input type="number" min="0" max="10" step="0.1" data-aluno="${aluno.nome}" class="nota-input" placeholder="0.0" oninput="atualizarResumo()" />
        </td>
      `;
      notasBody.appendChild(linhaNota);
    });

    document.getElementById("alunos-section").style.display = "grid";
    document.getElementById("total-alunos").innerText = alunos.length;

    gerarChaveDiario();
    restaurarRascunho();
    atualizarResumo();
    conectarAutosave();

    document.getElementById("alunos-section").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao carregar alunos.", "erro");
  } finally {
    desativarLoading(botao);
  }
}

function conectarAutosave() {
  document.querySelectorAll("#alunos-section input, #alunos-section textarea").forEach((campo) => {
    campo.removeEventListener("input", salvarRascunho);
    campo.removeEventListener("change", salvarRascunho);
    campo.addEventListener("input", salvarRascunho);
    campo.addEventListener("change", salvarRascunho);
  });
}

async function enviarDiario() {
  const botao = document.querySelector(".enviar");
  ativarLoading(botao, "Enviando");

  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;
  const conteudo = document.getElementById("conteudo").value.trim();
  const metodologia = document.getElementById("metodologia").value.trim();
  const recursos = document.getElementById("recursos").value.trim();
  const tarefa = document.getElementById("tarefa-casa").value.trim();
  const observacoes = document.getElementById("observacoes-aula").value.trim();
  const avaliacaoAtiva = document.getElementById("avaliacao-ativa").checked;
  const tipoAvaliacao = document.getElementById("tipo-avaliacao").value;
  const tituloAvaliacao = document.getElementById("titulo-avaliacao").value.trim();
  const bimestreAvaliacao = parseInt(document.getElementById("bimestre-avaliacao").value, 10);
  const presencas = [];
  const notas = [];

  document.querySelectorAll(".presente-checkbox").forEach((cb) => {
    const aluno = cb.dataset.aluno;
    const justificativa = document.querySelector(`.justificativa-input[data-aluno="${aluno}"]`).value;

    presencas.push({
      aluno,
      presente: cb.checked,
      disciplina,
      justificativa,
    });
  });

  if (avaliacaoAtiva) {
    document.querySelectorAll(".nota-input").forEach((input) => {
      const aluno = input.dataset.aluno;
      let nota = parseFloat(input.value);

      if (!isNaN(nota)) {
        if (nota < 0) nota = 0;
        if (nota > 10) nota = 10;
        notas.push({ aluno, disciplina, bimestre: bimestreAvaliacao, nota });
      }
    });
  }

  try {
    for (const presenca of presencas) {
      const response = await fetch("http://localhost:8000/presenca/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(presenca),
      });

      if (!response.ok) throw new Error(await response.text());
    }

    for (const nota of notas) {
      const response = await fetch("http://localhost:8000/notas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nota),
      });

      if (!response.ok) throw new Error(await response.text());
    }

    const relatorio = {
      professor: professorNome,
      turma,
      disciplina,
      conteudo: montarTextoRelatorio(conteudo, {
        "Avaliacao": avaliacaoAtiva ? `${tipoAvaliacao}${tituloAvaliacao ? ` - ${tituloAvaliacao}` : ""}` : "",
        "Tarefa/encaminhamento": tarefa,
        "Observacoes": observacoes,
      }),
      metodologia,
      recursos,
    };

    const responseRelatorio = await fetch("http://localhost:8000/relatorioaula/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(relatorio),
    });

    if (!responseRelatorio.ok) throw new Error(await responseRelatorio.text());

    localStorage.removeItem(gerarChaveDiario());
    document.getElementById("status-rascunho").innerText = "Aula finalizada. Rascunho limpo.";
    mostrarMensagem("Diario enviado com sucesso.");
  } catch (err) {
    console.error("ERRO:", err);
    mostrarMensagem(`Erro ao enviar diario: ${err.message}`, "erro");
  } finally {
    desativarLoading(botao);
  }
}

async function mostrarVisualizacaoNotas() {
  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;

  if (!turma || !disciplina) {
    return mostrarMensagem("Selecione a turma e disciplina.", "erro");
  }

  try {
    const response = await fetch(
      `http://localhost:8000/professor/alunos?turma=${turma}&disciplina=${disciplina}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const alunos = await response.json();
    const tbody = document.getElementById("visualizacao-tbody");
    tbody.innerHTML = "";

    alunos.forEach((aluno) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${aluno.nome}</strong></td>
        <td>
          <input type="number" class="nota-editavel" data-aluno="${aluno.nome}" value="${aluno.nota || ""}" min="0" max="10" step="0.1" />
          <button class="acao-btn" type="button" title="Excluir nota" onclick="deletarNota('${aluno.nome}')">Excluir</button>
        </td>
        <td>
          <input type="checkbox" class="presenca-editavel" data-aluno="${aluno.nome}" ${aluno.presente ? "checked" : ""} />
          <button class="acao-btn" type="button" title="Excluir presenca" onclick="deletarPresenca('${aluno.nome}')">Excluir</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    document.getElementById("visualizacao-notas").style.display = "block";
    document.getElementById("visualizacao-notas").scrollIntoView({ behavior: "smooth" });
  } catch {
    mostrarMensagem("Erro ao carregar visualizacao.", "erro");
  }
}

async function atualizarNotasEPresencas() {
  const disciplina = document.getElementById("disciplina-select").value;
  const notas = [];
  const presencas = [];

  document.querySelectorAll(".nota-editavel").forEach((input) => {
    const aluno = input.dataset.aluno;
    const nota = parseFloat(input.value);
    if (!isNaN(nota)) notas.push({ aluno, disciplina, bimestre: 1, nota });
  });

  document.querySelectorAll(".presenca-editavel").forEach((input) => {
    presencas.push({
      aluno: input.dataset.aluno,
      disciplina,
      presente: input.checked,
    });
  });

  if (notas.length === 0 && presencas.length === 0) {
    return mostrarMensagem("Nenhuma alteracao detectada.", "erro");
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

    mostrarMensagem("Notas e presencas atualizadas com sucesso.");
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao atualizar dados.", "erro");
  }
}

async function deletarNota(aluno) {
  const disciplina = document.getElementById("disciplina-select").value;
  if (!confirm(`Deseja realmente excluir a nota de ${aluno}?`)) return;

  try {
    await fetch("http://localhost:8000/notas/", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ aluno, disciplina }),
    });

    mostrarMensagem("Nota excluida com sucesso.");
    mostrarVisualizacaoNotas();
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao excluir nota.", "erro");
  }
}

async function deletarPresenca(aluno) {
  const disciplina = document.getElementById("disciplina-select").value;
  if (!confirm(`Deseja realmente excluir a presenca de ${aluno}?`)) return;

  try {
    await fetch("http://localhost:8000/presenca/", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ aluno, disciplina }),
    });

    mostrarMensagem("Presenca excluida com sucesso.");
    if (document.getElementById("visualizacao-notas").style.display !== "none") {
      mostrarVisualizacaoNotas();
    }
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao excluir presenca.", "erro");
  }
}

function ativarLoading(botao, texto = "Carregando") {
  if (!botao) return;
  botao.disabled = true;
  botao.dataset.textoOriginal = botao.innerText;
  botao.innerText = texto;
  botao.classList.add("botao-loading");
  document.body.classList.add("loading");
}

function desativarLoading(botao) {
  if (!botao) return;
  botao.disabled = false;

  if (botao.dataset.textoOriginal) {
    botao.innerText = botao.dataset.textoOriginal;
  }

  botao.classList.remove("botao-loading");
  document.body.classList.remove("loading");
}

function atualizarResumo() {
  const totalAlunos = document.querySelectorAll(".presente-checkbox").length;
  const presentes = document.querySelectorAll(".presente-checkbox:checked").length;
  const ausentes = totalAlunos - presentes;
  const avaliacaoAtiva = document.getElementById("avaliacao-ativa")?.checked || false;
  const notas = [];

  if (avaliacaoAtiva) {
    document.querySelectorAll(".nota-input").forEach((input) => {
      const valor = parseFloat(input.value);
      if (!isNaN(valor)) notas.push(valor);
    });
  }

  const media = notas.length > 0
    ? notas.reduce((a, b) => a + b, 0) / notas.length
    : 0;

  document.getElementById("total-alunos").innerText = totalAlunos;
  document.getElementById("total-presentes").innerText = presentes;
  document.getElementById("total-ausentes").innerText = ausentes;
  document.getElementById("contador-presentes").innerText = presentes;
  document.getElementById("media-turma").innerText = avaliacaoAtiva ? media.toFixed(1) : "-";
  document.getElementById("contador-notas").innerText = notas.length;

  atualizarStatus("status-presenca", presentes === totalAlunos && totalAlunos > 0, "Frequencia concluida", "Frequencia pendente");
  if (avaliacaoAtiva) {
    atualizarStatus("status-notas", notas.length === totalAlunos && totalAlunos > 0, "Avaliacao concluida", "Avaliacao pendente");
  } else {
    atualizarStatus("status-notas", true, "Sem avaliacao hoje", "Avaliacao pendente");
  }

  const relatorioCompleto = ["conteudo", "metodologia"]
    .every((id) => document.getElementById(id)?.value.trim());
  atualizarStatus("status-relatorio", relatorioCompleto, "Aula registrada", "Registro pendente");
}

function atualizarStatus(id, concluido, textoOk, textoPendente) {
  const elemento = document.getElementById(id);
  elemento.innerText = concluido ? textoOk : textoPendente;
  elemento.classList.toggle("status-ok", concluido);
  elemento.classList.toggle("status-pendente", !concluido);
}

function abrirAba(nome) {
  document.querySelectorAll(".aba").forEach((aba) => {
    aba.style.display = "none";
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.getElementById(`aba-${nome}`).style.display = "block";

  const botaoAtivo = document.querySelector(`.tab-btn[data-aba="${nome}"]`);
  if (botaoAtivo) botaoAtivo.classList.add("active");
}

function marcarTodosPresentes() {
  document.querySelectorAll(".presente-checkbox").forEach((checkbox) => {
    checkbox.checked = true;
  });
  salvarRascunho();
}

function desmarcarTodos() {
  document.querySelectorAll(".presente-checkbox").forEach((checkbox) => {
    checkbox.checked = false;
  });
  salvarRascunho();
}

function alternarAvaliacao(deveSalvar = true) {
  const ativa = document.getElementById("avaliacao-ativa").checked;
  document.getElementById("avaliacao-config").style.display = ativa ? "grid" : "none";
  document.getElementById("avaliacao-corpo").style.display = ativa ? "block" : "none";
  document.getElementById("avaliacao-vazia").style.display = ativa ? "none" : "block";

  document.querySelectorAll(".nota-input").forEach((input) => {
    input.disabled = !ativa;
  });

  atualizarResumo();
  if (deveSalvar) salvarRascunho();
}

function aplicarModeloAula(tipo) {
  const modelos = {
    expositiva: {
      metodologia: "Aula expositiva dialogada com participacao dos alunos.",
      recursos: "Quadro, livro didatico e exemplos resolvidos em sala.",
    },
    atividade: {
      metodologia: "Atividade pratica em sala com acompanhamento individual e correcao coletiva.",
      recursos: "Folha de atividade, quadro e material de apoio.",
    },
    revisao: {
      metodologia: "Revisao dos conteudos com retomada de duvidas e exercicios orientados.",
      recursos: "Quadro, caderno dos alunos e atividades de revisao.",
    },
  };

  const modelo = modelos[tipo];
  if (!modelo) return;

  document.getElementById("metodologia").value = modelo.metodologia;
  document.getElementById("recursos").value = modelo.recursos;
  salvarRascunho();
}

function montarTextoRelatorio(conteudo, extras) {
  const linhas = [conteudo];

  Object.entries(extras).forEach(([rotulo, valor]) => {
    if (valor) linhas.push(`${rotulo}: ${valor}`);
  });

  return linhas.filter(Boolean).join("\n\n");
}
