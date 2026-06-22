/* ----------------------------
   ARCKEOSYS — PAINEL DO DIRETOR
   Funcionalidades da tela diretor
   Objetivo: Gerenciar coordenadores (CRUD)
   Estou organizando, siga os Comentarios!, para entender a logica. 
 */

document.addEventListener("DOMContentLoaded", async () => {
  // AUTENTICAÇÃO
  // ---------------
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
    return;
  }

  // ------------------------------------------------------
  // ELEMENTOS GERAIS
  const nomeDiretorEl = document.getElementById("nomeDiretor");
  const nomeEscolaEl = document.getElementById("nomeEscola");
  const escolaCoordEl = document.getElementById("escolaCoord");

  const formCadastro = document.getElementById("formCoordenador");
  const formAtualizar = document.getElementById("formUpdateCoord");
  const formExcluir = document.getElementById("formDeleteCoord");

  const respostaCadastro = document.getElementById("respostaCoord");
  const respostaAtualizar = document.getElementById("respostaUpdate");
  const respostaExcluir = document.getElementById("respostaDelete");

  const listaCoordenadoresEl = document.getElementById("listaCoordenadores");
  const btnListar = document.getElementById("btnListar");

  // -------------------------------------------------------------
  // BOTÕES DE NAVEGAÇÃO
  const botoesNav = {
    inicio: document.getElementById("btnInicio"),
    cadastro: document.getElementById("btnCadastro"),
    listar: document.getElementById("btnListarNav"),
    atualizar: document.getElementById("btnAtualizar"),
    excluir: document.getElementById("btnExcluir"),
    voltar: document.getElementById("btnVoltarLogin"),
  };

  const secoes = {
    inicio: document.getElementById("inicio"),
    cadastro: document.getElementById("cadastro"),
    listar: document.getElementById("listar"),
    atualizar: document.getElementById("atualizar"),
    excluir: document.getElementById("excluir"),
  };

  // --------------------------------------------------------------
  // FUNÇÕES AUXILIARES ( documentada para não haver erros.)
  /**
   * Exibe apenas a seção selecionada e atualiza o botão ativo.
   * @param {string} id - ID da seção a ser exibida.
   */
  function mostrarSecao(id) {
    Object.values(secoes).forEach((secao) => secao.classList.add("hidden"));
    if (secoes[id]) secoes[id].classList.remove("hidden");

    Object.values(botoesNav).forEach((btn) => btn.classList.remove("ativo"));
    if (botoesNav[id]) botoesNav[id].classList.add("ativo");
  }

  /**
   * Exibe uma mensagem ao usuário (sucesso ou erro).
   * @param {HTMLElement} el - Elemento de resposta.
   * @param {string} msg - Mensagem a ser exibida.
   * @param {"success"|"error"} tipo - Tipo da mensagem.
   */
  function mostrarMensagem(el, msg, tipo = "success") {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("success", "error");
    el.classList.add(tipo);
  }

  /**
   * Faz requisições com tratamento de erro padronizado.
   * @param {string} url - Endpoint a ser chamado.
   * @param {object} options - Opções da requisição (método, headers, body etc).
   */
  async function requisicaoSegura(url, options = {}) {
    try {
      const resposta = await fetch(url, {
        ...options,
        credentials: "include",
      });

      if (!resposta.ok) {
        let erro;
        try {
          erro = await resposta.json();
        } catch {
          erro = { detail: "Erro inesperado no servidor." };
        }
        throw new Error(erro.detail || "Falha na requisição.");
      }

      // Retorna o JSON apenas se houver resposta com conteúdo
      try {
        return await resposta.json();
      } catch {
        return {};
      }
    } catch (erro) {
      console.error("Erro de conexão:", erro);
      throw erro;
    }
  }

  // =====================================================
  // INICIALIZAÇÃO DE TELA

  // Exibir seção inicial por padrão
  mostrarSecao("inicio");

  // Adiciona eventos de navegação
  botoesNav.inicio.addEventListener("click", () => mostrarSecao("inicio"));
  botoesNav.cadastro.addEventListener("click", () => mostrarSecao("cadastro"));
  botoesNav.listar.addEventListener("click", () => mostrarSecao("listar"));
  botoesNav.atualizar.addEventListener("click", () => mostrarSecao("atualizar"));
  botoesNav.excluir.addEventListener("click", () => mostrarSecao("excluir"));

  // Logout
  botoesNav.voltar.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/app/login.html";
  });

  // =====================================================
  // DADOS DO DIRETOR
  // =====================================================
  try {
    const dados = await requisicaoSegura("http://localhost:8000/escoladiretor/", {
      method: "GET",
    });

    nomeDiretorEl.textContent = `Bem-vindo, ${dados.nome_diretor}`;
    nomeEscolaEl.textContent = `Escola: ${dados.escola}`;
    escolaCoordEl.value = dados.escola;
    escolaCoordEl.readOnly = true;
  } catch (error) {
    alert("Erro ao carregar dados do diretor. Faça login novamente.");
    window.location.href = "login.html";
  }

  // =====================================================
  // CADASTRAR COORDENADOR
  // =====================================================
  formCadastro?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const coordenador = {
      nome: document.getElementById("nomeCoord").value.trim(),
      email: document.getElementById("emailCoord").value.trim(),
      senha: document.getElementById("senhaCoord").value.trim(),
      escola: document.getElementById("escolaCoord").value.trim(),
    };

    if (!coordenador.nome || !coordenador.email || !coordenador.senha) {
      mostrarMensagem(respostaCadastro, "Preencha todos os campos obrigatórios.", "error");
      return;
    }

    try {
      await requisicaoSegura("http://localhost:8000/coordenadores/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coordenador),
      });

      mostrarMensagem(respostaCadastro, "Coordenador cadastrado com sucesso!", "success");
      formCadastro.reset();
    } catch (err) {
      mostrarMensagem(respostaCadastro, err.message, "error");
    }
  });

  // =====================================================
  // LISTAR COORDENADORES
  // =====================================================
  btnListar?.addEventListener("click", async () => {
    listaCoordenadoresEl.innerHTML = "<li>Carregando lista...</li>";

    try {
      const coordenadores = await requisicaoSegura("http://localhost:8000/diretores/coordenadores", {
        method: "GET",
      });

      listaCoordenadoresEl.innerHTML = "";

      if (!coordenadores.length) {
        listaCoordenadoresEl.innerHTML = "<li>Nenhum coordenador cadastrado.</li>";
        return;
      }

      coordenadores.forEach((c) => {
        const li = document.createElement("li");
        li.textContent = `${c.nome_usuarios} — ${c.email}`;
        listaCoordenadoresEl.appendChild(li);
      });
    } catch (err) {
      listaCoordenadoresEl.innerHTML = "<li>Erro ao carregar coordenadores.</li>";
      console.error(err);
    }
  });

  // =====================================================
  // ATUALIZAR COORDENADOR
  // =====================================================
  formAtualizar?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const coordenadorUpdate = {
      email_atual: document.getElementById("emailAtual").value.trim(),
      novo_nome: document.getElementById("novoNome").value.trim(),
      novo_email: document.getElementById("novoEmail").value.trim(),
      novo_senha: document.getElementById("novaSenha").value.trim(),
    };

    if (!coordenadorUpdate.email_atual || !coordenadorUpdate.novo_email) {
      mostrarMensagem(respostaAtualizar, "Preencha todos os campos obrigatórios.", "error");
      return;
    }

    try {
      await requisicaoSegura("http://localhost:8000/diretores/coordenadores/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coordenadorUpdate),
      });

      mostrarMensagem(respostaAtualizar, "Coordenador atualizado com sucesso!", "success");
      formAtualizar.reset();
    } catch (err) {
      mostrarMensagem(respostaAtualizar, err.message, "error");
    }
  });

  // =====================================================
  // EXCLUIR COORDENADOR
  // =====================================================
  formExcluir?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const coordenadorDelete = {
      email: document.getElementById("emailDelete").value.trim(),
    };

    if (!coordenadorDelete.email) {
      mostrarMensagem(respostaExcluir, "Informe o e-mail do coordenador.", "error");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este coordenador?")) return;

    try {
      await requisicaoSegura("http://localhost:8000/diretores/coordenadores", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coordenadorDelete),
      });

      mostrarMensagem(respostaExcluir, "Coordenador excluído com sucesso!", "success");
      formExcluir.reset();
    } catch (err) {
      mostrarMensagem(respostaExcluir, err.message, "error");
    }
  });
});
