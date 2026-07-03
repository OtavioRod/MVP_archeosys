const loginForm =
  document.getElementById("loginForm");

const emailInput =
  document.getElementById("email");

const senhaInput =
  document.getElementById("senha");

const mensagemErro =
  document.getElementById("mensagemErro");

const botaoLogin =
  document.querySelector(".login-button");

/*login*/

loginForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    limparErro();

    const email =
      emailInput.value.trim();

    const senha =
      senhaInput.value;

    if (!email || !senha) {
      return mostrarErro(
        "Preencha todos os campos."
      );
    }

    try {

      ativarLoading();

      const response = await fetch(
        "http://localhost:8000/token/",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          credentials: "include",
          body: new URLSearchParams({
            username: email,
            password: senha,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Email ou senha inválidos."
        );
      }

      const data =
        await response.json();

      const token =
        data.access_token;

      localStorage.setItem(
        "token",
        token
      );

      const payload =
        JSON.parse(
          atob(token.split(".")[1])
        );

      const tipo =
        payload.tipo?.trim();

      redirecionarUsuario(tipo);

    } catch (error) {

      console.error(error);

      mostrarErro(
        error.message ||
        "Erro ao conectar ao servidor."
      );

    } finally {

      desativarLoading();

    }
  }
);

/*redirecionamento*/

function redirecionarUsuario(tipo) {

  const rotas = {

    Aluno:
      "/app/Tela_Aluno/aluno.html",

    Professor:
      "/app/Tela_Professor/professor.html",

    Coordenador:
      "/app/Tela_Coordenador/coordenador.html",

    Diretor:
      "/app/Tela_Diretor/diretor.html",

    SecretariaEducacao:
      "/app/Tela__SecretariaEd/SecretariaED.html",
  };

  const destino =
    rotas[tipo];

  if (!destino) {

    mostrarErro(
      "Tipo de usuário não reconhecido."
    );

    return;
  }

  window.location.href =
    destino;
}

/*feedback*/

function mostrarErro(texto) {

  mensagemErro.textContent =
    texto;

  mensagemErro.style.display =
    "block";
}

function limparErro() {

  mensagemErro.textContent =
    "";

  mensagemErro.style.display =
    "none";
}

/*loading*/

function ativarLoading() {

  botaoLogin.disabled = true;

  botaoLogin.dataset.textoOriginal =
    botaoLogin.textContent;

  botaoLogin.textContent =
    "Entrando...";
}

function desativarLoading() {

  botaoLogin.disabled = false;

  botaoLogin.textContent =
    botaoLogin.dataset.textoOriginal ||
    "Entrar";
}

/*autocomplete*/

const domains = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com"
];

emailInput.addEventListener(
  "keydown",
  (e) => {

    const valor =
      emailInput.value;

    const indiceArroba =
      valor.indexOf("@");

    if (
      indiceArroba > -1 &&
      e.key === "Tab"
    ) {

      e.preventDefault();

      const dominioDigitado =
        valor
          .slice(indiceArroba + 1)
          .toLowerCase();

      const dominioEncontrado =
        domains.find((dominio) =>
          dominio.startsWith(
            dominioDigitado
          )
        );

      if (dominioEncontrado) {

        emailInput.value =
          valor.slice(
            0,
            indiceArroba + 1
          ) + dominioEncontrado;
      }
    }
  }
);

/*enter no campo senha*/

senhaInput.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {

      loginForm.requestSubmit();

    }
  }
);