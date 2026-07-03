document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:8000";

    const TOKEN =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        "";

    const headersPadrao = {
        "Content-Type": "application/json",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
    };

    const $ = (id) => document.getElementById(id);

    const tabela = document.querySelector("#tabela tbody");

    const formEscola = $("formEscola");
    const formDiretor = $("formDiretor");
    const formEditar = $("formEditar");

    const cardEscola = $("cardEscola");
    const cardDiretor = $("cardDiretor");

    const btnMostrarEscola = $("btnMostrarEscola");
    const btnMostrarDiretor = $("btnMostrarDiretor");
    const btnAtualizarLista = $("btnAtualizarLista");
    const btnListarTudo = $("btnListarTudo");
    const btnVoltarLogin = $("btnVoltarLogin");

    const campoPesquisa = $("campoPesquisa");
    const selectEscolaDiretor = $("escolaDiretor");

    const respostaEscola = $("respostaEscola");
    const respostaDiretor = $("respostaDiretor");

    const fecharEscola = $("fecharEscola");
    const fecharDiretor = $("fecharDiretor");

    const modalEditar = $("modalEditar");
    const modalExcluir = $("modalExcluir");

    const fecharEditar = $("fecharEditar");
    const fecharExcluir = $("fecharExcluir");

    const btnExcluirEscola = $("btnExcluirEscola");
    const btnExcluirEndereco = $("btnExcluirEndereco");
    const btnExcluirDiretor = $("btnExcluirDiretor");
    const btnExcluirEmail = $("btnExcluirEmail");

    const totalEscolas = $("totalEscolas");
    const totalDiretores = $("totalDiretores");

    let listaEscolas = [];
    let listaFiltrada = [];
    let idSelecionado = null;

    function mostrarMensagem(elemento, mensagem, sucesso = true) {
        if (!elemento) {
            alert(mensagem);
            return;
        }

        elemento.textContent = mensagem;
        elemento.style.color = sucesso ? "#198754" : "#b42318";

        setTimeout(() => {
            elemento.textContent = "";
        }, 3500);
    }

    function esconderCards() {
        if (cardEscola) cardEscola.style.display = "none";
        if (cardDiretor) cardDiretor.style.display = "none";
    }

    function abrirCardEscola() {
        esconderCards();
        if (cardEscola) cardEscola.style.display = "block";
    }

    function abrirCardDiretor() {
        esconderCards();
        if (cardDiretor) cardDiretor.style.display = "block";
        atualizarSelectEscolas();
    }

    function atualizarDashboard(lista) {
        if (totalEscolas) totalEscolas.textContent = lista.length;

        const diretores = lista.filter((e) => e.diretor).length;

        if (totalDiretores) totalDiretores.textContent = diretores;
    }

    function renderizarTabela(lista) {
        if (!tabela) return;

        tabela.innerHTML = "";

        if (!lista || lista.length === 0) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        Nenhuma escola encontrada.
                    </td>
                </tr>
            `;
            return;
        }

        lista.forEach((escola) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${escola.nome || "-"}</td>
                <td>${escola.endereco || "-"}</td>
                <td>${escola.diretor?.nome || "<span style='color:#888;'>Sem Diretor</span>"}</td>
                <td>${escola.diretor?.email || "-"}</td>
                <td>
                    <div class="acoes">
                        <button
                            type="button"
                            class="btn-editar editar"
                            data-id="${escola.id}">
                            Editar
                        </button>

                        <button
                            type="button"
                            class="btn-excluir excluir"
                            data-id="${escola.id}">
                            Excluir
                        </button>
                    </div>
                </td>
            `;

            tabela.appendChild(tr);
        });
    }

    async function carregarEscolas() {
        if (!tabela) return;

        tabela.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Carregando informações...
                </td>
            </tr>
        `;

        try {
            const resp = await fetch(`${API_URL}/escolas/`, {
                headers: headersPadrao
            });

            if (resp.status === 401 || resp.status === 403) {
                tabela.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center;color:red;">
                            Sessão expirada ou acesso negado.
                        </td>
                    </tr>
                `;
                return;
            }

            if (!resp.ok) {
                throw new Error("Erro ao carregar escolas");
            }

            const dados = await resp.json();

            listaEscolas = Array.isArray(dados) ? dados : [];
            listaFiltrada = [...listaEscolas];

            atualizarDashboard(listaEscolas);
            renderizarTabela(listaFiltrada);

        } catch (erro) {
            console.error("Erro ao carregar escolas:", erro);

            tabela.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        Erro ao conectar com o servidor.
                    </td>
                </tr>
            `;
        }
    }

    async function atualizarSelectEscolas() {
        if (!selectEscolaDiretor) return;

        try {
            const resp = await fetch(`${API_URL}/escolas/`, {
                headers: headersPadrao
            });

            if (!resp.ok) throw new Error();

            const dados = await resp.json();
            const escolas = Array.isArray(dados) ? dados : [];

            selectEscolaDiretor.innerHTML = `
                <option value="" disabled selected>
                    Selecione a Escola
                </option>
            `;

            escolas.forEach((escola) => {
                const option = document.createElement("option");
                option.value = escola.nome;
                option.textContent = escola.nome;
                selectEscolaDiretor.appendChild(option);
            });

        } catch (erro) {
            console.error("Erro ao carregar select:", erro);
        }
    }

    function filtrarTabela() {
        const texto = campoPesquisa.value.toLowerCase().trim();

        listaFiltrada = listaEscolas.filter((escola) => {
            const nome = (escola.nome || "").toLowerCase();
            const endereco = (escola.endereco || "").toLowerCase();
            const diretor = (escola.diretor?.nome || "").toLowerCase();
            const email = (escola.diretor?.email || "").toLowerCase();

            return (
                nome.includes(texto) ||
                endereco.includes(texto) ||
                diretor.includes(texto) ||
                email.includes(texto)
            );
        });

        renderizarTabela(listaFiltrada);
    }

    formEscola?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nome = $("nomeEscola").value.trim();
        const endereco = $("enderecoEscola").value.trim();

        mostrarMensagem(respostaEscola, "Salvando...");

        try {
            const resp = await fetch(`${API_URL}/escolas/`, {
                method: "POST",
                headers: headersPadrao,
                body: JSON.stringify({ nome, endereco })
            });

            if (resp.ok) {
                mostrarMensagem(respostaEscola, "Escola cadastrada com sucesso.");
                formEscola.reset();
                esconderCards();
                carregarEscolas();
                atualizarSelectEscolas();
            } else if (resp.status === 409) {
                mostrarMensagem(respostaEscola, "Escola já cadastrada.", false);
            } else {
                mostrarMensagem(respostaEscola, "Erro ao cadastrar escola.", false);
            }

        } catch {
            mostrarMensagem(respostaEscola, "Erro de conexão.", false);
        }
    });

    formDiretor?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nome = $("nomeDiretor").value.trim();
        const email = $("emailDiretor").value.trim();
        const senha = $("senhaDiretor").value;
        const escola = selectEscolaDiretor.value;

        if (!escola) {
            mostrarMensagem(respostaDiretor, "Selecione uma escola.", false);
            return;
        }

        try {
            const resp = await fetch(`${API_URL}/diretores/`, {
                method: "POST",
                headers: headersPadrao,
                body: JSON.stringify({ nome, email, senha, escola })
            });

            if (resp.ok) {
                mostrarMensagem(respostaDiretor, "Diretor cadastrado com sucesso.");
                formDiretor.reset();
                esconderCards();
                carregarEscolas();
            } else {
                mostrarMensagem(respostaDiretor, "Erro ao cadastrar diretor.", false);
            }

        } catch {
            mostrarMensagem(respostaDiretor, "Erro de conexão.", false);
        }
    });

    tabela?.addEventListener("click", async (event) => {
        const botao = event.target.closest("button");
        if (!botao) return;

        const id = botao.dataset.id;
        if (!id) return;

        idSelecionado = id;

        if (botao.classList.contains("editar")) {
            try {
                const resp = await fetch(`${API_URL}/escolas/${id}`, {
                    headers: headersPadrao
                });

                if (!resp.ok) throw new Error();

                const escola = await resp.json();

                $("editId").value = id;
                $("editEscola").value = escola.nome || "";
                $("editEndereco").value = escola.endereco || "";
                $("editDiretor").value = escola.diretor?.nome || "";
                $("editEmail").value = escola.diretor?.email || "";

                modalEditar.showModal();

            } catch {
                alert("Não foi possível carregar os dados.");
            }
        }

        if (botao.classList.contains("excluir")) {
            modalExcluir.showModal();
        }
    });

    formEditar?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!idSelecionado) {
            alert("Nenhum registro selecionado.");
            return;
        }

        const dados = {
            nome: $("editEscola").value.trim(),
            endereco: $("editEndereco").value.trim(),
            diretor: {
                nome: $("editDiretor").value.trim(),
                email: $("editEmail").value.trim()
            }
        };

        try {
            const resp = await fetch(`${API_URL}/escolas/${idSelecionado}`, {
                method: "PUT",
                headers: headersPadrao,
                body: JSON.stringify(dados)
            });

            if (!resp.ok) throw new Error();

            modalEditar.close();
            alert("Registro atualizado com sucesso.");
            carregarEscolas();

        } catch {
            alert("Erro ao atualizar registro.");
        }
    });

    async function realizarExclusao(tipo) {
        if (!idSelecionado) {
            alert("Nenhum registro selecionado.");
            return;
        }

        try {
            const resp = await fetch(`${API_URL}/escolas/${idSelecionado}`, {
                method: "DELETE",
                headers: headersPadrao,
                body: JSON.stringify({ tipo })
            });

            if (!resp.ok) throw new Error();

            modalExcluir.close();
            alert("Exclusão realizada com sucesso.");

            carregarEscolas();
            atualizarSelectEscolas();

        } catch {
            alert("Erro durante a exclusão.");
        }
    }

    btnMostrarEscola?.addEventListener("click", abrirCardEscola);
    btnMostrarDiretor?.addEventListener("click", abrirCardDiretor);

    fecharEscola?.addEventListener("click", esconderCards);
    fecharDiretor?.addEventListener("click", esconderCards);

    btnAtualizarLista?.addEventListener("click", carregarEscolas);

    btnListarTudo?.addEventListener("click", () => {
        if (campoPesquisa) campoPesquisa.value = "";
        carregarEscolas();
    });

    campoPesquisa?.addEventListener("input", filtrarTabela);

    fecharEditar?.addEventListener("click", () => {
        modalEditar.close();
    });

    fecharExcluir?.addEventListener("click", () => {
        modalExcluir.close();
    });

    btnExcluirEscola?.addEventListener("click", () => realizarExclusao("escola"));
    btnExcluirEndereco?.addEventListener("click", () => realizarExclusao("endereco"));
    btnExcluirDiretor?.addEventListener("click", () => realizarExclusao("diretor"));
    btnExcluirEmail?.addEventListener("click", () => realizarExclusao("email"));

    btnVoltarLogin?.addEventListener("click", () => {
        window.location.href = "../login.html";
    });

    esconderCards();
    carregarEscolas();
    atualizarSelectEscolas();
});