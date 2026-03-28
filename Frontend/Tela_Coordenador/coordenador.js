document.addEventListener("DOMContentLoaded", () => {
  const backend = "http://localhost:8000";
  let escolaUsuario = null;

  // Pop-up (modal) genérico
  const modal = document.createElement("div");
  modal.id = "editModal";
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <h3 id="modalTitulo">Editar Registro</h3>
      <form id="modalForm"></form>
      <div class="modal-buttons">
        <button id="btnAtualizar" type="button">Atualizar</button>
        <button id="btnCancelar" type="button">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const overlay = modal.querySelector(".modal-overlay");
  const modalForm = modal.querySelector("#modalForm");
  const btnAtualizar = modal.querySelector("#btnAtualizar");
  const btnCancelar = modal.querySelector("#btnCancelar");

  function abrirModal(titulo, campos, dadosAtuais, endpoint, idCampo) {
    modal.querySelector("#modalTitulo").textContent = titulo;
    modalForm.innerHTML = "";

    campos.forEach((campo) => {
      const div = document.createElement("div");
      div.innerHTML = `
        <label>${campo.label}</label>
        <input type="text" name="${campo.name}" value="${dadosAtuais[campo.name] || ""}" />
      `;
      modalForm.appendChild(div);
    });

    modal.style.display = "flex";

    btnAtualizar.onclick = async () => {
      const formData = new FormData(modalForm);
      const dados = {};
      formData.forEach((v, k) => (dados[k] = v));

      try {
        const res = await fetch(`${backend}/coordenador${endpoint}${dadosAtuais[idCampo]}/`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        });

        if (!res.ok) throw new Error("Falha ao atualizar registro");

        alert("Registro atualizado com sucesso!");
        fecharModal();
        recarregarTabelas();
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar registro.");
      }
    };
  }

  function fecharModal() {
    modal.style.display = "none";
    modalForm.innerHTML = "";
  }

  btnCancelar.onclick = fecharModal;
  overlay.onclick = fecharModal;

  // Carregar dados do Coordenador
  fetch(`${backend}/escolacoordenador/`, { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) {
        alert("Erro na autenticação, faça login novamente.");
        return (window.location.href = "/app/login.html");
      }

      const dados = await res.json();
      escolaUsuario = dados.id_escola;

      document.getElementById("nomeCoordenador").textContent =
        dados.nome_coordenador;
      document.getElementById("escolaCoordenador").textContent = dados.escola;

      recarregarTabelas();
      carregarProfessoresSelect();
    })
    .catch(() => {
      alert("Erro na conexão, faça login novamente.");
      window.location.href = "/app/login.html";
    });

  function recarregarTabelas() {
    carregarTurmas();
    carregarProfessores();
    carregarAlunos();
    carregarDisciplinas();
    carregarAlunoTurmas();
  }

  // Preencher select de professores
  async function carregarProfessoresSelect() {
    try {
      const res = await fetch(`${backend}/coordenador/professores/`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Falha ao buscar professores");

      const professores = await res.json();
      const select = document.getElementById("professorSelect");
      select.innerHTML = "";

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
        console.log("📤 Enviando para o backend:", dados);

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
        recarregarTabelas();
      } catch (error) {
        alert(`Erro no cadastro (${formId}): ` + error.message);
        console.error(error);
      }
    });
  }

  // Formulários de criação
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

  // ======== TABELAS COM BOTÃO EDITAR ========

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
          <td>${t.serie}</td>
          <td>${t.turno}</td>
          <td>${t.horario}</td>
          <td>${t.id_turma}</td>
          <td><button class="editar" data-id="${t.id_turma}">Editar</button></td>`;
        tabela.appendChild(tr);
      });

      tabela.querySelectorAll(".editar").forEach((btn) => {
        btn.addEventListener("click", () => {
          const turma = turmas.find((x) => x.id_turma == btn.dataset.id);
          abrirModal(
            "Editar Turma",
            [
              { label: "Nome da Turma", name: "nome_turma" },
              { label: "Série", name: "serie" },
              { label: "Turno", name: "turno" },
              { label: "Horário", name: "horario" },
            ],
            turma,
            "/turma/",
            "id_turma"
          );

        });
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
          <td>${p.id_professor}</td>
          <td><button class="editar" data-id="${p.id_professor}">Editar</button></td>`;
        tabela.appendChild(tr);
      });

      tabela.querySelectorAll(".editar").forEach((btn) => {
        btn.addEventListener("click", () => {
          const prof = professores.find((x) => x.id_professor == btn.dataset.id);
          abrirModal(
            "Editar Professor",
            [
              { label: "Nome", name: "nome" },
              { label: "Email", name: "email" },
              { label: "Senha", name: "senha" },
            ],
            prof,
            "/professores/",
            "id_professor"
          );
        });
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
          <td>${a.id_aluno}</td>
          <td><button class="editar" data-id="${a.id_aluno}">Editar</button></td>`;
        tabela.appendChild(tr);
      });

      tabela.querySelectorAll(".editar").forEach((btn) => {
        btn.addEventListener("click", () => {
          const aluno = alunos.find((x) => x.id_aluno == btn.dataset.id);
          abrirModal(
            "Editar Aluno",
            [
              { label: "Nome", name: "nome_aluno" },
              { label: "Email", name: "email_aluno" },
              { label: "Senha", name: "senha" },
            ],
            aluno,
            "/alunos/",
            "id_aluno"
          );
        });
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
      disciplinas.forEach((d) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${d.nome_disciplina}</td>
          <td>${d.id_disciplina}</td>
          <td><button class="editar" data-id="${d.id_disciplina}">Editar</button></td>`;
        tabela.appendChild(tr);
      });

      tabela.querySelectorAll(".editar").forEach((btn) => {
        btn.addEventListener("click", () => {
          const disc = disciplinas.find((x) => x.id_disciplina == btn.dataset.id);
          abrirModal(
            "Editar Disciplina",
            [{ label: "Nome da Disciplina", name: "nome_disciplina" }],
            disc,
            "/disciplina/",
            "id_disciplina"
          );
        });
      });
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
          <td>${r.id_aluno_turma}</td>
          <td><button class="editar" data-id="${r.id_aluno_turma}">Editar</button></td>`;
        tabela.appendChild(tr);
      });

      tabela.querySelectorAll(".editar").forEach((btn) => {
        btn.addEventListener("click", () => {
          const rel = relacoes.find((x) => x.id_aluno_turma == btn.dataset.id);
          abrirModal(
            "Editar Aluno-Turma",
            [
              { label: "Nome aluno", name: "nome_aluno" },
              { label: "Nome turma", name: "nome_turma" },
            ],
            rel,
            "/aluno_turma/",
            "id_aluno_turma"
          );
        });
      });
    } catch (err) {
      console.error("Erro ao carregar aluno-turma:", err);
    }
  }
  const botoes = document.querySelectorAll(".nav-btn[data-section]");
  const todasSecoes = document.querySelectorAll("section.card");

  // Mapeamento explícito: data-section => [selectors a mostrar]
  const mapaSecoes = {
    turmas: ["#formTurma", "#tabelaTurmas"],
    professores: ["#formProfessor", "#tabelaProfessores"],
    alunos: ["#formAluno", "#tabelaAlunos"],
    disciplinas: ["#formDisciplina", "#tabelaDisciplinas"],
    vincular: ["#formAlunoTurma", "#tabelaAlunoTurma"],
  };

  function esconderTodas() {
    todasSecoes.forEach(s => (s.style.display = "none"));
  }

  function removerAtivoDeTodos() {
    botoes.forEach(b => b.classList.remove("ativo"));
  }

  function mostrarPara(sectionKey) {
    esconderTodas();
    removerAtivoDeTodos();

    const seletores = mapaSecoes[sectionKey] || [];
    let mostrouAlgo = false;

    seletores.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      // se o elemento for o próprio <section> já mostra, senão procura a section pai
      const sec = el.tagName.toLowerCase() === "section" ? el : el.closest("section.card");
      if (sec) {
        sec.style.display = "block";
        mostrouAlgo = true;
      }
    });

    // Se nada foi mostrado (selector errado), mostrar primeira section por segurança
    if (!mostrouAlgo) {
      const primeira = document.querySelector("section.card");
      if (primeira) primeira.style.display = "block";
    }

    // marcar botão ativo
    const botao = document.querySelector(`.nav-btn[data-section="${sectionKey}"]`);
    if (botao) botao.classList.add("ativo");
  }

  // eventos nos botões
  botoes.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.section;
      mostrarPara(key);
    });
  });

  // Mostrar padrão ao carregar
  mostrarPara("turmas");
});

