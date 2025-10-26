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


document.addEventListener("DOMContentLoaded", () => {
  const tabela = document.querySelector("table tbody");

 // CARREGAR DADOS 
  async function listarEscolas() {
    const resp = await fetch("http://localhost:8000/escolas"); 
    const dados = await resp.json();

    tabela.innerHTML = "";
    dados.forEach((escola) => {
      const tr = document.createElement("tr");
      tr.dataset.id = escola.id;

      tr.innerHTML = `
        <td><input type="checkbox" class="selecionar"></td>
        <td>${escola.nome}</td>
        <td>${escola.endereco}</td>
        <td>${escola.diretor ? escola.diretor.nome : "-"}</td>
        <td>${escola.diretor ? escola.diretor.email : "-"}</td>
        <td>
          <button class="editar">Editar</button>
          <button class="excluir">Excluir</button>
        </td>
      `;
      tabela.appendChild(tr);
    });
  }

  listarEscolas();

  // 🗑️ Exclusão individual
  tabela.addEventListener("click", async (e) => {
    if (e.target.classList.contains("excluir")) {
      const linha = e.target.closest("tr");
      const id = linha.dataset.id;

      if (confirm("Excluir esta escola e seus diretores vinculados?")) {
        const resp = await fetch(`http://localhost:8000/escolas/${id}`, {
          method: "DELETE",
        });

        if (resp.ok) linha.remove();
        else alert("Erro: NÃO FOI POSSÍVEL EXCLUIR A ESCOLA.");
      }
    }
  });

  // ATUALIZAR DADOS
  tabela.addEventListener("click", async (e) => {
    if (e.target.classList.contains("editar")) {
      const linha = e.target.closest("tr");
      const id = linha.dataset.id;

      // Obtém os valores atuais
      const nomeAtual = linha.children[1].textContent;
      const enderecoAtual = linha.children[2].textContent;
      const nomeDiretorAtual = linha.children[3].textContent;
      const emailDiretorAtual = linha.children[4].textContent;

      // Pede novos valores
      const novoNome = prompt("Novo nome da escola:", nomeAtual);
      const novoEndereco = prompt("Novo endereço:", enderecoAtual);
      const novoNomeDiretor = prompt("Novo nome do diretor:", nomeDiretorAtual);
      const novoEmailDiretor = prompt("Novo email do diretor:", emailDiretorAtual);

      if (!novoNome || !novoEndereco) return alert("Preencha todos os campos!");

      // Atualiza no backend
      const resp = await fetch(`http://localhost:8000/escolas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNome,
          endereco: novoEndereco,
          diretor: {
            nome: novoNomeDiretor,
            email: novoEmailDiretor,
          },
        }),
      });

      if (resp.ok) {
        alert("Dados atualizados com sucesso!");
        listarEscolas();
      } else {
        alert("Erro ao atualizar.");
      }
    }
  });

  // EXCLUIR MULTIPLOS
  const btnExcluirSelecionadas = document.createElement("button");
  btnExcluirSelecionadas.textContent = "Excluir Selecionadas";
  btnExcluirSelecionadas.style =
    "margin-top: 20px; background:#9c2828; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer;";
  document.querySelector(".user-management-section").appendChild(btnExcluirSelecionadas);

  btnExcluirSelecionadas.addEventListener("click", async () => {
    const selecionadas = Array.from(document.querySelectorAll(".selecionar:checked"));
    if (selecionadas.length === 0) return alert("Nenhuma escola selecionada.");

    if (confirm(`Excluir ${selecionadas.length} escolas?`)) {
      for (const check of selecionadas) {
        const id = check.closest("tr").dataset.id;
        await fetch(`http://localhost:8000/escolas/${id}`, { method: "DELETE" });
        check.closest("tr").remove();
      }
    }
  });
});
