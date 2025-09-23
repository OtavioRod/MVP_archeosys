document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
    return;
  }

  // Elementos globais
  const nomeDiretorEl = document.getElementById("nomeDiretor");
  const nomeEscolaEl = document.getElementById("nomeEscola");
  const escolaCoordEl = document.getElementById("escolaCoord");

  // Formularios e respostas
  const formCadastro = document.getElementById("formCoordenador");
  const formAtualizar = document.getElementById("formUpdateCoord");
  const formExcluir = document.getElementById("formDeleteCoord");

  const respostaCadastro = document.getElementById("respostaCoord");
  const respostaAtualizar = document.getElementById("respostaUpdate");
  const respostaExcluir = document.getElementById("respostaDelete");

  const listaCoordenadoresEl = document.getElementById("listaCoordenadores");
  const btnListar = document.getElementById("btnListar");

  // Função para mensagem
  function mostrarMensagem(el, msg, tipo = "success") {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("success", "error");
    el.classList.add(tipo === "success" ? "success" : "error");
  }

  // Aqui vai  Buscar dados do diretor logado
  try {
    const resposta = await fetch("http://localhost:8000/escoladiretor/", {
      method: "GET",
      credentials: "include",
    });

    if (!resposta.ok) throw new Error("Falha ao carregar dados do diretor");

    const dados = await resposta.json();
    if (nomeDiretorEl) nomeDiretorEl.textContent = `Bem-vindo, ${dados.nome_diretor}`;
    if (nomeEscolaEl) nomeEscolaEl.textContent = `Escola: ${dados.escola}`;
    if (escolaCoordEl) escolaCoordEl.value = dados.escola;
    escolaCoordEl.setAttribute("readonly", "true");
  } catch (error) {
    console.error("Erro ao buscar informações do diretor:", error);
    alert("Erro ao carregar dados. Faça login novamente.");
    window.location.href = "login.html";
  }

  // Cadastrar coordenador
  if (formCadastro) {
    formCadastro.addEventListener("submit", async (e) => {
      e.preventDefault();
      const coordenador = {
        nome: document.getElementById("nomeCoord").value,
        email: document.getElementById("emailCoord").value,
        senha: document.getElementById("senhaCoord").value,
        escola: document.getElementById("escolaCoord").value,
      };

      try {
        const resposta = await fetch("http://localhost:8000/coordenadores/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(coordenador),
        });

        if (resposta.ok) {
          mostrarMensagem(respostaCadastro, " Coordenador cadastrado com sucesso!", "success");
          formCadastro.reset();
        } else {
          const erro = await resposta.json();
          mostrarMensagem(respostaCadastro, ` Erro: ${erro.detail}`, "error");
        }
      } catch (err) {
        mostrarMensagem(respostaCadastro, " Erro de conexão com o servidor.", "error");
      }
    });
  }

  // Listar coordenadores
  if (btnListar) {
    btnListar.addEventListener("click", async () => {
      try {
        const resposta = await fetch("http://localhost:8000/diretores/coordenadores", {
          method: "GET",
          credentials: "include",
        });

        if (!resposta.ok) throw new Error("Falha ao listar coordenadores");

        const coordenadores = await resposta.json();
        listaCoordenadoresEl.innerHTML = "";

        if (coordenadores.length === 0) {
          listaCoordenadoresEl.innerHTML = "<li>Nenhum coordenador cadastrado.</li>";
          return;
        }

        coordenadores.forEach((c) => {
          const li = document.createElement("li");
          li.textContent = `${c.nome_usuarios} - ${c.email}`;
          listaCoordenadoresEl.appendChild(li);
        });
      } catch (err) {
        listaCoordenadoresEl.innerHTML = "<li> Erro ao carregar coordenadores.</li>";
        console.error(err);
      }
    });
  }

  // Atualizar coordenador
  if (formAtualizar) {
    formAtualizar.addEventListener("submit", async (e) => {
      e.preventDefault();

      const coordenadorUpdate = {
        email_atual: document.getElementById("emailAtual").value,
        novo_nome: document.getElementById("novoNome").value,
        novo_email: document.getElementById("novoEmail").value,
        novo_senha: document.getElementById("novaSenha").value,
        // novo_escola removido, pois não é mais necessário
      };

      try {
        const resposta = await fetch("http://localhost:8000/diretores/coordenadores/", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(coordenadorUpdate),
        });

        if (resposta.ok) {
          mostrarMensagem(respostaAtualizar, " Coordenador atualizado com sucesso!", "success");
          formAtualizar.reset();
        } else {
          const erro = await resposta.json();
          mostrarMensagem(respostaAtualizar, ` Erro: ${erro.detail}`, "error");
        }
      } catch (err) {
        mostrarMensagem(respostaAtualizar, "Erro de conexão com o servidor.", "error");
      }
    });
  }

  // Excluir coordenador
  if (formExcluir) {
    formExcluir.addEventListener("submit", async (e) => {
      e.preventDefault();

      const coordenadorDelete = {
        email: document.getElementById("emailDelete").value,
      };

      try {
        const resposta = await fetch("http://localhost:8000/diretores/coordenadores", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(coordenadorDelete),
        });

        if (resposta.ok) {
          mostrarMensagem(respostaExcluir, " Coordenador excluído com sucesso!", "success");
          formExcluir.reset();
        } else {
          const erro = await resposta.json();
          mostrarMensagem(respostaExcluir, ` Erro: ${erro.detail}`, "error");
        }
      } catch (err) {
        mostrarMensagem(respostaExcluir, " Erro de conexão com o servidor.", "error");
      }
    });
  }
});
