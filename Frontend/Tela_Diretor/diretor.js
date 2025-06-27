document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html"; 
    return;
  }

  // Elementos da tela
  const nomeDiretorEl = document.getElementById("nomeDiretor");
  const nomeEscolaEl = document.getElementById("nomeEscola");
  const escolaCoordEl = document.getElementById("escolaCoord");
  const respostaEl = document.getElementById("respostaCoord");
  const form = document.getElementById("formCoordenador");

  try {
    // Requisição para buscar dados do diretor e da escola vinculada
    const resposta = await fetch("http://localhost:8000/escoladiretor/", {
      method: "GET",
      credentials: "include"
    });
    
    console.log("Resposta fetch:", resposta);

    if (!resposta.ok) {
      throw new Error("Falha ao carregar dados do diretor");
    }

    const dados = await resposta.json();
    console.log(dados);
    // Atualiza os elementos da tela com segurança
    if (nomeDiretorEl) nomeDiretorEl.textContent = `Bem-vindo, ${dados.nome_diretor}`;
    if (nomeEscolaEl) nomeEscolaEl.textContent = `Escola: ${dados.escola}`;
    if (escolaCoordEl) escolaCoordEl.value = dados.escola;

    // Torna o campo escola apenas leitura
    escolaCoordEl.setAttribute("readonly", "true");

  } catch (error) {
    console.error("Erro ao buscar informações do diretor:", error);
    alert("Erro ao carregar dados. Faça login novamente.");
    window.location.href = "login.html";
  }

  // Envio do formulário de coordenador
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const coordenador = {
        nome: document.getElementById("nomeCoord").value,
        email: document.getElementById("emailCoord").value,
        senha: document.getElementById("senhaCoord").value,
        escola: document.getElementById("escolaCoord").value
      };

      try {
        const resposta = await fetch("http://localhost:8000/coordenadores/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(coordenador)
        });

        if (resposta.ok) {
          respostaEl.textContent = "✅ Coordenador cadastrado com sucesso!";
          respostaEl.style.color = "green";
          form.reset();
        } else {
          const erro = await resposta.json();
          respostaEl.textContent = `❌ Erro: ${erro.detail}`;
          respostaEl.style.color = "red";
        }
      } catch (err) {
        respostaEl.textContent = "❌ Erro de conexão com o servidor.";
        respostaEl.style.color = "red";
      }
    });
  }
});
