const token = localStorage.getItem("token");
const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
const professorNome = payload?.nome || "Professor";
const professorEscola = payload?.escola || "Escola nao identificada";

const STORAGE_PREFIX = "diario_professor_";
const HISTORICO_KEY = "diarios_professor_historico";

window.onload = async () => {
  document.getElementById("professor-nome").innerText = professorNome;
  document.getElementById("professor-escola").innerText = professorEscola;

  configurarDataInicial();
  await carregarTurmasEDisciplinas();

  configurarEventosFixos();
  abrirAba("frequencia");
  renderizarHistoricoDiarios();
};

function configurarDataInicial() {
  const inputData = document.getElementById("data-aula-input");
  if (!inputData) return;

  inputData.value = new Date().toISOString().slice(0, 10);
  atualizarDataExibida();
}

function configurarEventosFixos() {
  ["turma-select", "disciplina-select", "data-aula-input"].forEach((id) => {
    const campo = document.getElementById(id);
    if (!campo) return;

    campo.addEventListener("change", async () => {
      gerarChaveDiario();
      atualizarDataExibida();

      if (document.getElementById("alunos-section").style.display !== "none") {
        await carregarAlunos(document.getElementById("btn-iniciar-aula"));
      }

      restaurarRascunho();
      atualizarResumo();
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

function obterDataAula() {
  return document.getElementById("data-aula-input")?.value || new Date().toISOString().slice(0, 10);
}

function formatarData(dataISO) {
  if (!dataISO) return "--/--/----";

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function atualizarDataExibida() {
  const dataAula = document.getElementById("data-aula");
  if (dataAula) dataAula.innerText = formatarData(obterDataAula());
}

function gerarChaveDiario() {
  const data = obterDataAula();
  const turma = document.getElementById("turma-select")?.value || "sem-turma";
  const disciplina = document.getElementById("disciplina-select")?.value || "sem-disciplina";

  const turmaAtual = document.getElementById("turma-atual");
  const disciplinaAtual = document.getElementById("disciplina-atual");

  if (turmaAtual) turmaAtual.innerText = turma === "sem-turma" ? "-" : turma;
  if (disciplinaAtual) disciplinaAtual.innerText = disciplina === "sem-disciplina" ? "-" : disciplina;

  return `${STORAGE_PREFIX}${data}_${turma}_${disciplina}`;
}

function coletarDadosDiario(status = "Rascunho") {
  const presencas = [];
  const notas = [];
  const justificativas = [];

  document.querySelectorAll(".presente-checkbox").forEach((cb) => {
    presencas.push({
      aluno: cb.dataset.aluno,
      presente: cb.checked,
    });
  });

  document.querySelectorAll(".nota-input").forEach((input) => {
    notas.push({
      aluno: input.dataset.aluno,
      nota: input.value,
    });
  });

  document.querySelectorAll(".justificativa-input").forEach((input) => {
    justificativas.push({
      aluno: input.dataset.aluno,
      justificativa: input.value,
    });
  });

  return {
    id: gerarChaveDiario(),
    data: obterDataAula(),
    turma: document.getElementById("turma-select")?.value || "",
    disciplina: document.getElementById("disciplina-select")?.value || "",
    status,
    atualizadoEm: new Date().toISOString(),

    conteudo: document.getElementById("conteudo")?.value || "",
    metodologia: document.getElementById("metodologia")?.value || "",
    recursos: document.getElementById("recursos")?.value || "",

    houveTarefa: document.getElementById("houve-tarefa")?.checked || false,
    tarefa: document.getElementById("tarefa-casa")?.value || "",

    houveObservacoes: document.getElementById("houve-observacoes")?.checked || false,
    observacoes: document.getElementById("observacoes-aula")?.value || "",

    avaliacaoAtiva: document.getElementById("avaliacao-ativa")?.checked || false,
    tipoAvaliacao: document.getElementById("tipo-avaliacao")?.value || "Atividade",
    tituloAvaliacao: document.getElementById("titulo-avaliacao")?.value || "",
    bimestreAvaliacao: document.getElementById("bimestre-avaliacao")?.value || "1",

    presencas,
    notas,
    justificativas,
    pendencias: obterPendenciasAtuais(),
  };
}

function salvarRascunho() {
  const dados = coletarDadosDiario(obterStatusAtual());

  localStorage.setItem(gerarChaveDiario(), JSON.stringify(dados));
  salvarNoHistoricoLocal(dados);

  const status = document.getElementById("status-rascunho");
  if (status) {
    status.innerText = `Rascunho salvo as ${new Date().toLocaleTimeString("pt-BR")}`;
  }

  atualizarResumo();
  atualizarChecklist();
}

function salvarRascunhoManual() {
  salvarRascunho();
  atualizarStatusDiario("Rascunho");
  mostrarMensagem("Rascunho salvo com sucesso.");
}

function continuarDepois() {
  salvarRascunho();
  atualizarStatusDiario("Em andamento");
  mostrarMensagem("Diario salvo para continuar depois.");
  abrirAba("historico");
}

function restaurarRascunho() {
  const rascunho = localStorage.getItem(gerarChaveDiario());

  if (!rascunho) {
    atualizarStatusDiario("Rascunho");
    atualizarPendencias([]);
    return;
  }

  const dados = JSON.parse(rascunho);
  aplicarDadosDiarioNaTela(dados);

  mostrarMensagem("Rascunho recuperado automaticamente.");
  document.getElementById("status-rascunho").innerText = "Rascunho recuperado";

  atualizarResumo();
  atualizarChecklist();
}

function aplicarDadosDiarioNaTela(dados) {
  document.getElementById("conteudo").value = dados.conteudo || "";
  document.getElementById("metodologia").value = dados.metodologia || "";
  document.getElementById("recursos").value = dados.recursos || "";

  document.getElementById("houve-tarefa").checked = Boolean(dados.houveTarefa);
  document.getElementById("tarefa-casa").value = dados.tarefa || "";

  document.getElementById("houve-observacoes").checked = Boolean(dados.houveObservacoes);
  document.getElementById("observacoes-aula").value = dados.observacoes || "";

  document.getElementById("avaliacao-ativa").checked = Boolean(dados.avaliacaoAtiva);
  document.getElementById("tipo-avaliacao").value = dados.tipoAvaliacao || "Atividade";
  document.getElementById("titulo-avaliacao").value = dados.tituloAvaliacao || "";
  document.getElementById("bimestre-avaliacao").value = dados.bimestreAvaliacao || "1";

  alternarCampoExtra("tarefa", false);
  alternarCampoExtra("observacoes", false);
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

  atualizarPendencias(dados.pendencias || []);
  atualizarStatusDiario(dados.status || "Rascunho");
}

function mostrarMensagem(texto, tipo = "sucesso") {
  const msg = document.getElementById("mensagem-feedback");
  if (!msg) return;

  msg.innerText = texto;
  msg.className = tipo === "sucesso" ? "sucesso" : "erro";

  setTimeout(() => {
    msg.className = "";
    msg.innerText = "";
  }, 4500);
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

  atualizarDataExibida();

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
          <input type="checkbox" data-aluno="${aluno.nome}" class="presente-checkbox" onchange="atualizarResumo(); salvarRascunho();" />
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
          <input type="number" min="0" max="10" step="0.1" data-aluno="${aluno.nome}" class="nota-input" placeholder="0.0" oninput="atualizarResumo(); salvarRascunho();" />
        </td>
      `;

      notasBody.appendChild(linhaNota);
    });

    document.getElementById("alunos-section").style.display = "grid";
    document.getElementById("total-alunos").innerText = alunos.length;

    gerarChaveDiario();
    restaurarRascunho();
    conectarAutosave();
    alternarAvaliacao(false);
    atualizarResumo();

    document.getElementById("alunos-section").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao carregar alunos.", "erro");
  } finally {
    desativarLoading(botao);
  }
}

function conectarAutosave() {
  document.querySelectorAll("#alunos-section input, #alunos-section textarea, #alunos-section select").forEach((campo) => {
    campo.removeEventListener("input", salvarRascunho);
    campo.removeEventListener("change", salvarRascunho);

    campo.addEventListener("input", salvarRascunho);
    campo.addEventListener("change", salvarRascunho);
  });
}

async function enviarDiario() {
  const botao = document.querySelector(".enviar");
  ativarLoading(botao, "Enviando");

  zerarSincronizacao();

  const turma = document.getElementById("turma-select").value;
  const disciplina = document.getElementById("disciplina-select").value;

  if (!turma || !disciplina) {
    desativarLoading(botao);
    return mostrarMensagem("Selecione turma e disciplina antes de finalizar.", "erro");
  }

  const conteudo = document.getElementById("conteudo").value.trim();
  const metodologia = document.getElementById("metodologia").value.trim();
  const recursos = document.getElementById("recursos").value.trim();

  const tarefa = document.getElementById("tarefa-casa")?.value.trim() || "";
  const observacoes = document.getElementById("observacoes-aula")?.value.trim() || "";

  const avaliacaoAtiva = document.getElementById("avaliacao-ativa")?.checked || false;
  const tipoAvaliacao = document.getElementById("tipo-avaliacao")?.value || "";
  const tituloAvaliacao = document.getElementById("titulo-avaliacao")?.value.trim() || "";
  const bimestreAvaliacao = parseInt(document.getElementById("bimestre-avaliacao")?.value || "1", 10);

  const presencas = [];
  const notas = [];
  const pendencias = [];

  document.querySelectorAll(".presente-checkbox").forEach((cb) => {
    const aluno = cb.dataset.aluno;

    const justificativa =
      document.querySelector(`.justificativa-input[data-aluno="${aluno}"]`)?.value || "";

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

        notas.push({
          aluno,
          disciplina,
          bimestre: bimestreAvaliacao,
          nota,
        });
      }
    });
  }

  try {
    let presencasSalvas = 0;

    for (const presenca of presencas) {
      try {
        await salvarComFallback({
          url: "http://localhost:8000/presenca/",
          payload: presenca,
          etapa: `frequencia de ${presenca.aluno}`,
        });

        presencasSalvas++;
      } catch (err) {
        pendencias.push({
          tipo: "frequencia",
          aluno: presenca.aluno,
          payload: presenca,
          erro: err.message,
        });
      }
    }

    atualizarSyncItem(
      "sync-presenca",
      pendencias.some((p) => p.tipo === "frequencia")
        ? `Frequencia: ${presencasSalvas}/${presencas.length} salvas`
        : "Frequencia: salva",
      !pendencias.some((p) => p.tipo === "frequencia")
    );

    let notasSalvas = 0;

    for (const nota of notas) {
      try {
        await salvarComFallback({
          url: "http://localhost:8000/notas/",
          payload: nota,
          etapa: `nota de ${nota.aluno}`,
        });

        notasSalvas++;
      } catch (err) {
        pendencias.push({
          tipo: "nota",
          aluno: nota.aluno,
          payload: nota,
          erro: err.message,
        });
      }
    }

    atualizarSyncItem(
      "sync-notas",
      !avaliacaoAtiva
        ? "Notas: nao aplicadas"
        : pendencias.some((p) => p.tipo === "nota")
          ? `Notas: ${notasSalvas}/${notas.length} salvas`
          : "Notas: salvas",
      !pendencias.some((p) => p.tipo === "nota")
    );

    const relatorio = {
      professor: professorNome,
      disciplina,
      conteudo: montarTextoRelatorio(conteudo, {
        Avaliacao: avaliacaoAtiva
          ? `${tipoAvaliacao}${tituloAvaliacao ? ` - ${tituloAvaliacao}` : ""}`
          : "",
        "Tarefa/encaminhamento": tarefa,
        Observacoes: observacoes,
      }),
      metodologia,
      recursos,
    };

    try {
      await enviarJson({
        url: "http://localhost:8000/relatorioaula/",
        method: "POST",
        payload: relatorio,
        etapa: "relatorio da aula",
      });

      atualizarSyncItem("sync-relatorio", "Relatorio: salvo", true);
    } catch (err) {
      pendencias.push({
        tipo: "relatorio",
        aluno: null,
        payload: relatorio,
        erro: err.message,
      });

      atualizarSyncItem("sync-relatorio", "Relatorio: falhou", false);
    }

    const statusFinal = pendencias.length > 0 ? "Parcial" : "Concluido";
    const dadosFinalizados = coletarDadosDiario(statusFinal);

    dadosFinalizados.pendencias = pendencias;

    localStorage.setItem(gerarChaveDiario(), JSON.stringify(dadosFinalizados));
    salvarNoHistoricoLocal(dadosFinalizados);

    atualizarPendencias(pendencias);
    atualizarStatusDiario(statusFinal);
    renderizarHistoricoDiarios();

    if (pendencias.length > 0) {
      atualizarSyncGeral("Parcial", false);
      mostrarMensagem("Diario salvo parcialmente. Existem pendencias para reenviar.", "erro");
    } else {
      atualizarSyncGeral("Concluido", true);
      document.getElementById("status-rascunho").innerText = "Diario finalizado com sucesso.";
      mostrarMensagem("Diario enviado com sucesso.");
    }
  } catch (err) {
    console.error("ERRO AO FINALIZAR AULA:", err);
    mostrarMensagem(`Erro ao enviar diario: ${err.message}`, "erro");
  } finally {
    desativarLoading(botao);
  }
}

async function enviarJson({ url, method, payload, etapa }) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detalhe = "";

    try {
      detalhe = await response.text();
    } catch {
      detalhe = response.statusText;
    }

    throw new Error(
      `Falha ao salvar ${etapa}. Status ${response.status}. ${detalhe || response.statusText}`
    );
  }

  return response;
}

async function salvarComFallback({ url, payload, etapa }) {
  try {
    return await enviarJson({
      url,
      method: "POST",
      payload,
      etapa,
    });
  } catch (erroPost) {
    console.warn(`POST falhou em ${etapa}. Tentando PUT...`, erroPost);

    try {
      return await enviarJson({
        url,
        method: "PUT",
        payload,
        etapa,
      });
    } catch (erroPut) {
      console.error(`PUT tambem falhou em ${etapa}.`, erroPut);

      throw new Error(
        `${etapa}: nao foi possivel criar nem atualizar. ${erroPut.message}`
      );
    }
  }
}

function obterPendenciasAtuais() {
  const diario = JSON.parse(localStorage.getItem(gerarChaveDiario()) || "{}");
  return diario.pendencias || [];
}

function atualizarPendencias(pendencias) {
  const box = document.getElementById("pendencias-box");
  const lista = document.getElementById("pendencias-list");

  if (!box || !lista) return;

  lista.innerHTML = "";

  if (!pendencias.length) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";

  pendencias.forEach((p) => {
    const item = document.createElement("div");
    item.className = "pendencia-item";
    item.innerHTML = `
      <strong>${p.tipo}</strong>
      ${p.aluno ? `<span> - ${p.aluno}</span>` : ""}
      <p>${p.erro}</p>
    `;
    lista.appendChild(item);
  });
}

async function reenviarPendencias() {
  const diario = JSON.parse(localStorage.getItem(gerarChaveDiario()) || "{}");
  const pendencias = diario.pendencias || [];

  if (!pendencias.length) {
    return mostrarMensagem("Nao ha pendencias para reenviar.");
  }

  const novasPendencias = [];

  for (const pendencia of pendencias) {
    try {
      if (pendencia.tipo === "relatorio") {
        await enviarJson({
          url: "http://localhost:8000/relatorioaula/",
          method: "POST",
          payload: pendencia.payload,
          etapa: "relatorio da aula",
        });
      } else {
        await salvarComFallback({
          url: pendencia.tipo === "nota"
            ? "http://localhost:8000/notas/"
            : "http://localhost:8000/presenca/",
          payload: pendencia.payload,
          etapa: pendencia.tipo,
        });
      }
    } catch (err) {
      novasPendencias.push({
        ...pendencia,
        erro: err.message,
      });
    }
  }

  diario.pendencias = novasPendencias;
  diario.status = novasPendencias.length ? "Parcial" : "Concluido";

  localStorage.setItem(gerarChaveDiario(), JSON.stringify(diario));
  salvarNoHistoricoLocal(diario);

  atualizarPendencias(novasPendencias);
  atualizarStatusDiario(diario.status);
  renderizarHistoricoDiarios();

  if (novasPendencias.length) {
    mostrarMensagem("Ainda existem pendencias no diario.", "erro");
  } else {
    atualizarSyncGeral("Concluido", true);
    mostrarMensagem("Pendencias reenviadas com sucesso.");
  }
}

function zerarSincronizacao() {
  atualizarSyncGeral("Enviando", false);
  atualizarSyncItem("sync-presenca", "Frequencia: enviando", false);
  atualizarSyncItem("sync-notas", "Notas: aguardando", false);
  atualizarSyncItem("sync-relatorio", "Relatorio: aguardando", false);
}

function atualizarSyncGeral(texto, sucesso) {
  const status = document.getElementById("sync-status");
  if (!status) return;

  status.innerText = texto;
  status.classList.remove("status-rascunho", "status-andamento", "status-finalizado", "status-parcial");

  if (texto === "Concluido") {
    status.classList.add("status-finalizado");
  } else if (texto === "Parcial") {
    status.classList.add("status-parcial");
  } else {
    status.classList.add(sucesso ? "status-finalizado" : "status-andamento");
  }
}

function atualizarSyncItem(id, texto, sucesso) {
  const item = document.getElementById(id);
  if (!item) return;

  item.innerText = texto;
  item.classList.remove("check-ok", "check-pendente");
  item.classList.add(sucesso ? "check-ok" : "check-pendente");
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

    if (!isNaN(nota)) {
      notas.push({
        aluno,
        disciplina,
        bimestre: 1,
        nota,
      });
    }
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nota),
      });
    }

    for (const presenca of presencas) {
      await fetch("http://localhost:8000/presenca/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

function atualizarResumo() {
  const totalAlunos = document.querySelectorAll(".presente-checkbox").length;
  const presentes = document.querySelectorAll(".presente-checkbox:checked").length;
  const ausentes = totalAlunos - presentes;
  const percentual = totalAlunos > 0 ? Math.round((presentes / totalAlunos) * 100) : 0;

  const avaliacaoAtiva = document.getElementById("avaliacao-ativa")?.checked || false;
  const notas = [];

  if (avaliacaoAtiva) {
    document.querySelectorAll(".nota-input").forEach((input) => {
      const valor = parseFloat(input.value);
      if (!isNaN(valor)) notas.push(valor);
    });
  }

  const media =
    notas.length > 0
      ? notas.reduce((a, b) => a + b, 0) / notas.length
      : 0;

  document.getElementById("total-alunos").innerText = totalAlunos;
  document.getElementById("total-presentes").innerText = presentes;
  document.getElementById("total-ausentes").innerText = ausentes;
  document.getElementById("contador-presentes").innerText = presentes;
  document.getElementById("contador-notas").innerText = notas.length;
  document.getElementById("media-turma").innerText = avaliacaoAtiva ? media.toFixed(1) : "-";

  const percentualEl = document.getElementById("percentual-presenca");
  if (percentualEl) percentualEl.innerText = `${percentual}%`;

  atualizarStatus(
    "status-presenca",
    presentes === totalAlunos && totalAlunos > 0,
    "Frequencia concluida",
    "Frequencia pendente"
  );

  if (avaliacaoAtiva) {
    atualizarStatus(
      "status-notas",
      notas.length === totalAlunos && totalAlunos > 0,
      "Avaliacao concluida",
      "Avaliacao pendente"
    );
  } else {
    atualizarStatus("status-notas", true, "Sem avaliacao hoje", "Avaliacao pendente");
  }

  const relatorioCompleto = ["conteudo", "metodologia"].every((id) =>
    document.getElementById(id)?.value.trim()
  );

  atualizarStatus("status-relatorio", relatorioCompleto, "Aula registrada", "Registro pendente");

  atualizarChecklist();
  atualizarStatusDiario(obterStatusAtual());
}

function atualizarChecklist() {
  const totalAlunos = document.querySelectorAll(".presente-checkbox").length;
  const presentes = document.querySelectorAll(".presente-checkbox:checked").length;

  const conteudo = document.getElementById("conteudo")?.value.trim();
  const metodologia = document.getElementById("metodologia")?.value.trim();

  const avaliacaoAtiva = document.getElementById("avaliacao-ativa")?.checked || false;
  const notasInputs = Array.from(document.querySelectorAll(".nota-input"));
  const notasLancadas = notasInputs.filter((input) => input.value !== "").length;

  const houveTarefa = document.getElementById("houve-tarefa")?.checked || false;
  const tarefa = document.getElementById("tarefa-casa")?.value.trim();

  const frequenciaOk = totalAlunos > 0 && presentes === totalAlunos;
  const conteudoOk = Boolean(conteudo && metodologia);
  const avaliacaoOk = !avaliacaoAtiva || notasLancadas === totalAlunos;
  const tarefaOk = !houveTarefa || Boolean(tarefa);
  const pronto = frequenciaOk && conteudoOk && avaliacaoOk && tarefaOk;

  marcarChecklist("check-frequencia", frequenciaOk);
  marcarChecklist("check-conteudo", conteudoOk);
  marcarChecklist("check-avaliacao", avaliacaoOk, !avaliacaoAtiva);
  marcarChecklist("check-tarefa", tarefaOk, !houveTarefa);
  marcarChecklist("check-pronto", pronto);
}

function marcarChecklist(id, ok, neutro = false) {
  const item = document.getElementById(id);
  if (!item) return;

  item.classList.remove("check-ok", "check-pendente", "check-neutro");

  if (neutro) {
    item.classList.add("check-neutro");
  } else {
    item.classList.add(ok ? "check-ok" : "check-pendente");
  }
}

function atualizarStatus(id, concluido, textoOk, textoPendente) {
  const elemento = document.getElementById(id);
  if (!elemento) return;

  elemento.innerText = concluido ? textoOk : textoPendente;
  elemento.classList.toggle("status-ok", concluido);
  elemento.classList.toggle("status-pendente", !concluido);
}

function obterStatusAtual() {
  const atual = document.getElementById("status-diario")?.innerText;

  if (atual === "Concluido") return "Concluido";
  if (atual === "Parcial") return "Parcial";

  const conteudo = document.getElementById("conteudo")?.value.trim();
  const presencas = document.querySelectorAll(".presente-checkbox:checked").length;

  if (conteudo || presencas > 0) return "Em andamento";

  return "Rascunho";
}

function atualizarStatusDiario(status) {
  const badge = document.getElementById("status-diario");
  if (!badge) return;

  badge.innerText = status;
  badge.classList.remove("status-rascunho", "status-andamento", "status-finalizado", "status-parcial");

  if (status === "Concluido") {
    badge.classList.add("status-finalizado");
  } else if (status === "Parcial") {
    badge.classList.add("status-parcial");
  } else if (status === "Em andamento") {
    badge.classList.add("status-andamento");
  } else {
    badge.classList.add("status-rascunho");
  }
}

function abrirAba(nome) {
  document.querySelectorAll(".aba").forEach((aba) => {
    aba.style.display = "none";
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const aba = document.getElementById(`aba-${nome}`);
  if (aba) aba.style.display = "block";

  const botaoAtivo = document.querySelector(`.tab-btn[data-aba="${nome}"]`);
  if (botaoAtivo) botaoAtivo.classList.add("active");

  if (nome === "historico") {
    renderizarHistoricoDiarios();
  }
}

function marcarTodosPresentes() {
  document.querySelectorAll(".presente-checkbox").forEach((checkbox) => {
    checkbox.checked = true;
  });

  salvarRascunho();
  atualizarResumo();
}

function desmarcarTodos() {
  document.querySelectorAll(".presente-checkbox").forEach((checkbox) => {
    checkbox.checked = false;
  });

  salvarRascunho();
  atualizarResumo();
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

  if (deveSalvar) {
    salvarRascunho();
  }
}

function alternarCampoExtra(tipo, deveSalvar = true) {
  const checkbox = tipo === "tarefa"
    ? document.getElementById("houve-tarefa")
    : document.getElementById("houve-observacoes");

  const campo = tipo === "tarefa"
    ? document.getElementById("campo-tarefa")
    : document.getElementById("campo-observacoes");

  if (!checkbox || !campo) return;

  campo.style.display = checkbox.checked ? "grid" : "none";

  if (deveSalvar) {
    salvarRascunho();
  }
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
    grupo: {
      metodologia: "Trabalho em grupo com orientacao do professor e socializacao das respostas.",
      recursos: "Material impresso, caderno dos alunos e quadro.",
    },
    laboratorio: {
      metodologia: "Atividade pratica em laboratorio com observacao, registro e discussao dos resultados.",
      recursos: "Laboratorio, equipamentos disponiveis e roteiro de atividade.",
    },
  };

  const modelo = modelos[tipo];
  if (!modelo) return;

  document.getElementById("metodologia").value = modelo.metodologia;
  document.getElementById("recursos").value = modelo.recursos;

  salvarRascunho();
  atualizarResumo();
}

function montarTextoRelatorio(conteudo, extras) {
  const linhas = [conteudo];

  Object.entries(extras).forEach(([rotulo, valor]) => {
    if (valor) linhas.push(`${rotulo}: ${valor}`);
  });

  return linhas.filter(Boolean).join("\n\n");
}

function salvarNoHistoricoLocal(diario) {
  const historico = obterHistoricoLocal();
  const index = historico.findIndex((item) => item.id === diario.id);

  if (index >= 0) {
    historico[index] = diario;
  } else {
    historico.unshift(diario);
  }

  localStorage.setItem(HISTORICO_KEY, JSON.stringify(historico.slice(0, 50)));
}

function obterHistoricoLocal() {
  return JSON.parse(localStorage.getItem(HISTORICO_KEY) || "[]");
}

function renderizarHistoricoDiarios() {
  const lista = document.getElementById("historico-diarios");
  const vazio = document.getElementById("historico-vazio");

  if (!lista || !vazio) return;

  const historico = obterHistoricoLocal();

  lista.innerHTML = "";
  vazio.style.display = historico.length ? "none" : "block";

  historico.forEach((diario) => {
    const item = document.createElement("article");
    item.className = "item-historico";

    const total = diario.presencas?.length || 0;
    const presentes = diario.presencas?.filter((p) => p.presente).length || 0;
    const avaliacao = diario.avaliacaoAtiva ? diario.tipoAvaliacao : "Sem avaliacao";

    item.innerHTML = `
      <div>
        <h4>${formatarData(diario.data)} - ${diario.turma || "-"}</h4>
        <p><strong>Disciplina:</strong> ${diario.disciplina || "-"}</p>
        <p><strong>Status:</strong> ${diario.status || "Rascunho"}</p>
        <p><strong>Frequencia:</strong> ${presentes}/${total} presentes</p>
        <p><strong>Avaliacao:</strong> ${avaliacao}</p>
      </div>

      <div class="item-historico-acoes">
        <button class="btn secundario" type="button" onclick="abrirDiarioHistorico('${diario.id}')">Abrir</button>
        <button class="btn primario" type="button" onclick="continuarDiarioHistorico('${diario.id}')">Continuar</button>
      </div>
    `;

    lista.appendChild(item);
  });
}

async function carregarRelatoriosBackend() {
  const lista = document.getElementById("relatorios-backend");
  const vazio = document.getElementById("relatorios-vazio");

  if (!lista || !vazio) return;

  try {
    const response = await fetch("http://localhost:8000/relatorios/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const relatorios = await response.json();

    lista.innerHTML = "";
    vazio.style.display = relatorios.length ? "none" : "block";

    relatorios.forEach((relatorio) => {
      const item = document.createElement("article");
      item.className = "item-historico";

      item.innerHTML = `
        <div>
          <h4>Relatorio enviado</h4>
          <p><strong>Data:</strong> ${relatorio.data || "-"}</p>
          <p><strong>Conteudo:</strong> ${relatorio.conteudo || "-"}</p>
          <p><strong>Metodologia:</strong> ${relatorio.metodologia || "-"}</p>
          <p><strong>Recursos:</strong> ${relatorio.recursos || "-"}</p>
        </div>
      `;

      lista.appendChild(item);
    });

    mostrarMensagem("Relatorios carregados com sucesso.");
  } catch (err) {
    console.error(err);
    mostrarMensagem("Erro ao carregar relatorios enviados.", "erro");
  }
}

function abrirDiarioHistorico(id) {
  const diario = obterHistoricoLocal().find((item) => item.id === id);

  if (!diario) {
    return mostrarMensagem("Diario nao encontrado.", "erro");
  }

  selecionarContextoDoDiario(diario);
  mostrarMensagem("Diario aberto para consulta.");
}

function continuarDiarioHistorico(id) {
  const diario = obterHistoricoLocal().find((item) => item.id === id);

  if (!diario) {
    return mostrarMensagem("Diario nao encontrado.", "erro");
  }

  selecionarContextoDoDiario({
    ...diario,
    status: diario.status === "Concluido" ? "Concluido" : "Em andamento",
  });

  mostrarMensagem("Diario carregado para continuar.");
}

async function selecionarContextoDoDiario(diario) {
  document.getElementById("data-aula-input").value = diario.data;
  document.getElementById("turma-select").value = diario.turma;
  document.getElementById("disciplina-select").value = diario.disciplina;

  await carregarAlunos(document.getElementById("btn-iniciar-aula"));

  localStorage.setItem(gerarChaveDiario(), JSON.stringify(diario));
  aplicarDadosDiarioNaTela(diario);

  abrirAba("frequencia");
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