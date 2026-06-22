const API_URL = "http://localhost:8000";

// PEGA O TOKEN DA SUA SESSÃO (Caso o backend precise dele)
const TOKEN = localStorage.getItem("token") || sessionStorage.getItem("token") || "";

// Configuração padrão de cabeçalho unificada com autenticação opcional
const headersPadrao = {
  "Content-Type": "application/json",
  ...(TOKEN ? { "Authorization": `Bearer ${TOKEN}` } : {})
};

// ==========================================================================
// ELEMENTOS DA TELA
// ==========================================================================
const tabela = document.querySelector("#tabela tbody");

const formEscola = document.getElementById("formEscola");
const formDiretor = document.getElementById("formDiretor");
const formEditar = document.getElementById("formEditar");

const cardEscola = document.getElementById("cardEscola");
const cardDiretor = document.getElementById("cardDiretor");

const btnMostrarEscola = document.getElementById("btnMostrarEscola");
const btnMostrarDiretor = document.getElementById("btnMostrarDiretor");
const btnAtualizarLista = document.getElementById("btnAtualizarLista");
const btnListarTudo = document.getElementById("btnListarTudo");

const selectEscolaDiretor = document.getElementById("escolaDiretor");

const fecharEscola = document.getElementById("fecharEscola");
const fecharDiretor = document.getElementById("fecharDiretor");

const modalEditar = document.getElementById("modalEditar");
const modalExcluir = document.getElementById("modalExcluir");

const fecharEditar = document.getElementById("fecharEditar");
const fecharExcluir = document.getElementById("fecharExcluir");

const btnExcluirEscola = document.getElementById("btnExcluirEscola");
const btnExcluirEndereco = document.getElementById("btnExcluirEndereco");
const btnExcluirDiretor = document.getElementById("btnExcluirDiretor");
const btnExcluirEmail = document.getElementById("btnExcluirEmail");

let idSelecionado = null;

// ==========================================================================
// INTERNOCIONALIZAÇÃO / EXIBIÇÃO DE CARDS
// ==========================================================================
btnMostrarEscola.addEventListener("click", () => {
  cardEscola.style.display = "block";
  cardDiretor.style.display = "none";
});

btnMostrarDiretor.addEventListener("click", () => {
  cardDiretor.style.display = "block";
  cardEscola.style.display = "none";
  atualizarSelectEscolas();
});

fecharEscola.addEventListener("click", () => { cardEscola.style.display = "none"; });
fecharDiretor.addEventListener("click", () => { cardDiretor.style.display = "none"; });

btnAtualizarLista.addEventListener("click", () => { carregarEscolas(); });
if (btnListarTudo) {
  btnListarTudo.addEventListener("click", () => { carregarEscolas(); });
}

// Fechamento dos Modais Nativos <dialog>
fecharEditar.addEventListener("click", () => modalEditar.close());
fecharExcluir.addEventListener("click", () => modalExcluir.close());

// ==========================================================================
// POPULAR SELECT DE ESCOLAS DINAMICAMENTE
// ==========================================================================
async function atualizarSelectEscolas() {
  try {
    const resp = await fetch(`${API_URL}/escolas/`, { headers: headersPadrao });
    const escolas = await resp.json();

    selectEscolaDiretor.innerHTML = '<option value="" disabled selected>Selecione a Escola Vinculada</option>';

    const listaEscolas = Array.isArray(escolas) ? escolas : [];

    listaEscolas.forEach(e => {
      const nome = e.nome || e.nomeEscola || "";
      if (nome) {
        const option = document.createElement("option");
        // Mantendo compatibilidade com seu backend original: envia o nome do texto puro
        option.value = nome; 
        option.textContent = nome;
        selectEscolaDiretor.appendChild(option);
      }
    });
  } catch (err) {
    console.error("Erro ao carregar escolas para o select:", err);
  }
}

// ==========================================================================
// BUSCAR E RENDERIZAR ESCOLAS E DIRETORES (READ)
// ==========================================================================
async function carregarEscolas() {
  try {
    const resp = await fetch(`${API_URL}/escolas/`, { headers: headersPadrao });
    
    if (resp.status === 401) {
      tabela.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro de Autenticação (401). Faça login novamente.</td></tr>`;
      return;
    }

    const dados = await resp.json();
    const escolas = Array.isArray(dados) ? dados : [];

    tabela.innerHTML = "";

    if (escolas.length === 0) {
      tabela.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma escola cadastrada.</td></tr>`;
      return;
    }

    escolas.forEach((e) => {
      const tr = document.createElement("tr");

      const nomeEscola = e.nome || e.nomeEscola || "";
      const enderecoEscola = e.endereco || e.enderecoEscola || "";
      const nomeDiretor = e.diretor?.nome || e.nomeDiretor || "-";
      const emailDiretor = e.diretor?.email || e.emailDiretor || "-";

      tr.innerHTML = `
        <td>${nomeEscola}</td>
        <td>${enderecoEscola}</td>
        <td>${nomeDiretor}</td>
        <td>${emailDiretor}</td>
        <td>
          <div class="acoes">
            <button data-id="${e.id}" class="btn-editar editar">Editar</button>
            <button data-id="${e.id}" class="btn-excluir excluir">Excluir</button>
          </div>
        </td>
      `;
      tabela.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar escolas:", err);
    tabela.innerHTML = `<tr><td colspan="5" style="text-align:center;">Erro de conexão com o servidor.</td></tr>`;
  }
}

// Execução inicial ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  carregarEscolas();
  atualizarSelectEscolas();
});

// ==========================================================================
// REGISTRAR NOVA ESCOLA (CREATE)
// ==========================================================================
formEscola.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const nome = document.getElementById("nomeEscola").value.trim();
  const endereco = document.getElementById("enderecoEscola").value.trim();
  const resposta = document.getElementById("respostaEscola");

  resposta.textContent = "Enviando...";

  try {
    const r = await fetch(`${API_URL}/escolas/`, {
      method: "POST",
      headers: headersPadrao,
      body: JSON.stringify({ nome, endereco }),
    });

    if (r.status === 201 || r.ok) {
      resposta.textContent = "✅ Escola cadastrada com sucesso.";
      formEscola.reset();
      carregarEscolas();
      atualizarSelectEscolas();
    } else if (r.status === 409) {
      resposta.textContent = "Escola já cadastrada.";
    } else {
      resposta.textContent = `Erro ao cadastrar (Status: ${r.status})`;
    }
  } catch {
    resposta.textContent = "Erro de conexão com o servidor.";
  }
});

// ==========================================================================
// REGISTRAR NOVO DIRETOR (CREATE)
// ==========================================================================
formDiretor.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const nome = document.getElementById("nomeDiretor").value.trim();
  const email = document.getElementById("emailDiretor").value.trim();
  const senha = document.getElementById("senhaDiretor").value;
  const escola = selectEscolaDiretor.value; 
  const resposta = document.getElementById("respostaDiretor");

  if (!escola) {
    resposta.textContent = "Por favor, selecione uma escola cadastrada.";
    return;
  }

  resposta.textContent = "Enviando...";

  try {
    const resp = await fetch(`${API_URL}/diretores/`, {
      method: "POST",
      headers: headersPadrao,
      body: JSON.stringify({ nome, email, senha, escola }),
    });

    if (resp.status === 201 || resp.ok) {
      resposta.textContent = "✅ Diretor cadastrado com sucesso.";
      formDiretor.reset();
      carregarEscolas();
    } else if (resp.status === 409) {
      resposta.textContent = "Diretor ou escola já vinculada.";
    } else {
      resposta.textContent = `Erro ao cadastrar (Status: ${resp.status})`;
    }
  } catch {
    resposta.textContent = "Erro de conexão com o servidor.";
  }
});

// ==========================================================================
// ESCUTA DE CLIQUES NA TABELA (DISPARAR MODAIS)
// ==========================================================================
tabela.addEventListener("click", async (event) => {
  const id = event.target.dataset.id;
  if (!id) return;

  idSelecionado = id; 

  // Captura ação do Botão Editar
  if (event.target.classList.contains("editar")) {
    try {
      const resp = await fetch(`${API_URL}/escolas/${id}`, { headers: headersPadrao });
      const e = await resp.json();

      document.getElementById("editId").value = id;
      document.getElementById("editEscola").value = e.nome || e.nomeEscola || "";
      document.getElementById("editEndereco").value = e.endereco || e.enderecoEscola || "";
      document.getElementById("editDiretor").value = e.diretor?.nome || e.nomeDiretor || "";
      document.getElementById("editEmail").value = e.diretor?.email || e.emailDiretor || "";

      modalEditar.showModal(); // Comando nativo para renderizar <dialog>
    } catch (err) {
      console.error("Erro ao buscar dados para edição:", err);
    }
  }

  // Captura ação do Botão Excluir
  if (event.target.classList.contains("excluir")) {
    modalExcluir.showModal();
  }
});

// ==========================================================================
// SALVAR ALTERAÇÃO CADASTRAL (UPDATE)
// ==========================================================================
formEditar.addEventListener("submit", async (event) => { 
  event.preventDefault(); 
  
  const data = { 
    nome: document.getElementById("editEscola").value.trim(),
    endereco: document.getElementById("editEndereco").value.trim(),
    diretor: {
      nome: document.getElementById("editDiretor").value.trim(),
      email: document.getElementById("editEmail").value.trim(),
    },
  };

  try {
    // CORREÇÃO: Adicionadas as crases para a Template Literal
    await fetch(`${API_URL}/escolas/${idSelecionado}`, {
      method: "PUT",
      headers: headersPadrao,
      body: JSON.stringify(data),
    });
    modalEditar.close();
    carregarEscolas();
  } catch (err) {
    console.error("Erro ao atualizar registro:", err);
  }
});

// ==========================================================================
// SISTEMA DE EXCLUSÕES (TOTAIS E PARCIAIS VIA BODY/DELETE)
// ==========================================================================
async function realizarExclusao(tipo) {
  try {
    // CORREÇÃO: Adicionadas as crases para a Template Literal
    await fetch(`${API_URL}/escolas/${idSelecionado}`, {
      method: "DELETE",
      headers: headersPadrao,
      body: JSON.stringify({ tipo }),
    });
    modalExcluir.close();
    carregarEscolas();
    atualizarSelectEscolas();
  } catch (err) {
    // CORREÇÃO: Adicionadas as aspas/crases e fechamento correto no console.error
    console.error(`Erro ao tentar deletar (${tipo}):`, err);
  }
}

// Vinculando funções aos gatilhos do Modal de Exclusão
btnExcluirEscola.onclick = () => realizarExclusao("escola");
btnExcluirEndereco.onclick = () => realizarExclusao("endereco");
btnExcluirDiretor.onclick = () => realizarExclusao("diretor");
btnExcluirEmail.onclick = () => realizarExclusao("email");

