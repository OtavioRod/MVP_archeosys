// URL base da API
const API_URL = "http://localhost:8000";

// Formulário de Escola
document.getElementById("formEscola").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nomeEscola").value.trim();
  const endereco = document.getElementById("enderecoEscola").value.trim();

  const resposta = document.getElementById("respostaEscola");
  resposta.textContent = "Enviando...";

  try {
    const r = await fetch(`${API_URL}/escolas/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, endereco }),
      credentials: "include"
    });

    if (r.status === 201) {
      resposta.textContent = "✅ Escola cadastrada com sucesso!";
    } else if (r.status === 409) {
      resposta.textContent = "⚠️ Escola já cadastrada.";
    } else {
      resposta.textContent = "❌ Erro ao cadastrar escola.";
    }
  } catch (err) {
    resposta.textContent = "❌ Erro de conexão com o servidor.";
  }
});

// Formulário de Diretor
document.getElementById("formDiretor").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nomeDiretor").value.trim();
  const email = document.getElementById("emailDiretor").value.trim();
  const senha = document.getElementById("senhaDiretor").value;
  const escola = document.getElementById("escolaDiretor").value.trim();

  const resposta = document.getElementById("respostaDiretor");
  resposta.textContent = "Enviando...";

  try {
    const r = await fetch(`${API_URL}/diretores/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, escola }),
      credentials: "include"
    });

    if (r.status === 201) {
      resposta.textContent = "✅ Diretor cadastrado com sucesso!";
    } else if (r.status === 409) {
      resposta.textContent = "⚠️ Diretor ou escola já cadastrada.";
    } else {
      resposta.textContent = "❌ Erro ao cadastrar diretor.";
    }
  } catch (err) {
    resposta.textContent = "❌ Erro de conexão com o servidor.";
  }
});
