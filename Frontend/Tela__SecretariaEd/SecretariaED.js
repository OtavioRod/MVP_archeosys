const API_URL = "http://localhost:8000";

const tabela = document.querySelector("#tabela tbody");
const formEscola = document.getElementById("formEscola");
const formDiretor = document.getElementById("formDiretor");

const modalEditar = document.getElementById("modalEditar");
const modalExcluir = document.getElementById("modalExcluir");
const fecharEditar = document.getElementById("fecharEditar");
const fecharExcluir = document.getElementById("fecharExcluir");
const btnExcluirEscola = document.getElementById("btnExcluirEscola");
const btnExcluirEndereco = document.getElementById("btnExcluirEndereco");
const btnExcluirDiretor = document.getElementById("btnExcluirDiretor");
const btnExcluirEmail = document.getElementById("btnExcluirEmail");

let idSelecionado = null;

// ============================
// CARREGAR DADOS (READ)
// ============================
async function carregarEscolas() {
  try {
    const resp = await fetch(`${API_URL}/escolas/`);
    const escolas = await resp.json();

    tabela.innerHTML = "";
    escolas.forEach((e) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${e.nome || ""}</td>
        <td>${e.endereco || ""}</td>
        <td>${e.diretor?.nome || "-"}</td>
        <td>${e.diretor?.email || "-"}</td>
        <td>
          <button data-id="${e.id}" class="editar">Editar</button>
          <button data-id="${e.id}" class="excluir">Excluir</button>
        </td>`;
      tabela.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar escolas:", err);
  }
}
document.addEventListener("DOMContentLoaded", carregarEscolas);

// ============================
// CRIAR NOVA ESCOLA (CREATE)
// ============================
formEscola.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const nome = document.getElementById("nomeEscola").value.trim();
  const endereco = document.getElementById("enderecoEscola").value.trim();
  const resposta = document.getElementById("respostaEscola");
  resposta.textContent = "Enviando...";

  try {
    const r = await fetch(`${API_URL}/escolas/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, endereco }),
    });

    if (r.status === 201) {
      resposta.textContent = "✅ Escola cadastrada com sucesso!";
      formEscola.reset();
      carregarEscolas();
    } else if (r.status === 409) {
      resposta.textContent = "Escola já cadastrada.";
    } else {
      resposta.textContent = "Erro ao cadastrar escola.";
    }
  } catch {
    resposta.textContent = "Erro de conexão com o servidor.";
  }
});

// ============================
// CRIAR DIRETOR (CREATE)
// ============================
formDiretor.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const nome = document.getElementById("nomeDiretor").value.trim();
  const email = document.getElementById("emailDiretor").value.trim();
  const senha = document.getElementById("senhaDiretor").value;
  const escola = document.getElementById("escolaDiretor").value.trim();
  const resposta = document.getElementById("respostaDiretor");
  resposta.textContent = "Enviando...";

  try {
    const resp = await fetch(`${API_URL}/diretores/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, escola }),
    });

    if (resp.status === 201) {
      resposta.textContent = "Diretor cadastrado com sucesso!";
      formDiretor.reset();
      carregarEscolas();
    } else if (resp.status === 409) {
      resposta.textContent = "Diretor ou escola já cadastrada.";
    } else {
      resposta.textContent = "Erro ao cadastrar diretor.";
    }
  } catch {
    resposta.textContent = "Erro de conexão com o servidor.";
  }
});

// ============================
// AÇÕES DA TABELA (UPDATE / DELETE)
// ============================
tabela.addEventListener("click", async (event) => {
  const id = event.target.dataset.id;

  // EDITAR ESCOLA
  if (event.target.classList.contains("editar")) {
    const resp = await fetch(`${API_URL}/escolas/${id}`);
    const e = await resp.json();
    idSelecionado = id;

    document.getElementById("editId").value = id;
    document.getElementById("editEscola").value = e.nome;
    document.getElementById("editEndereco").value = e.endereco;
    document.getElementById("editDiretor").value = e.diretor?.nome || "";
    document.getElementById("editEmail").value = e.diretor?.email || "";

    modalEditar.showModal();
  }

  // EXCLUIR ESCOLA
  if (event.target.classList.contains("excluir")) {
    idSelecionado = id;
    modalExcluir.showModal();
  }
});

// ============================
// SALVAR EDIÇÃO (UPDATE)
// ============================
const formEditar = document.getElementById("formEditar");

formEditar.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = {
    nome: document.getElementById("editEscola").value,
    endereco: document.getElementById("editEndereco").value,
    diretor: {
      nome: document.getElementById("editDiretor").value,
      email: document.getElementById("editEmail").value,
    },
  };

  await fetch(`${API_URL}/escolas/${idSelecionado}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  modalEditar.close();
  carregarEscolas();
});

fecharEditar.addEventListener("click", () => modalEditar.close());

// ============================
// EXCLUSÕES PARCIAIS (PATCH / DELETE)
// ============================
btnExcluirEscola.onclick = async () => {
  await fetch(`${API_URL}/escolas/${idSelecionado}`, { method: "DELETE" });
  modalExcluir.close();
  carregarEscolas();
};

btnExcluirEndereco.onclick = async () => {
  await fetch(`${API_URL}/escolas/${idSelecionado}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endereco: null }),
  });
  modalExcluir.close();
  carregarEscolas();
};

btnExcluirDiretor.onclick = async () => {
  await fetch(`${API_URL}/escolas/${idSelecionado}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diretor: null }),
  });
  modalExcluir.close();
  carregarEscolas();
};

btnExcluirEmail.onclick = async () => {
  await fetch(`${API_URL}/escolas/${idSelecionado}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diretor: { email: null } }),
  });
  modalExcluir.close();
  carregarEscolas();
};

fecharExcluir.addEventListener("click", () => modalExcluir.close());
