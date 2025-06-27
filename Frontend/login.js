document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const mensagemErro = document.getElementById("mensagemErro");

  try {
    const response = await fetch("http://localhost:8000/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "include",
    body: new URLSearchParams({ username: email, password: senha })
    });

    if (!response.ok) {
      mensagemErro.textContent = "Email ou senha inválidos.";
      return;
    }

    const data = await response.json();
    console.log("Received login data:", data);

    const token = data.access_token;
    console.log("teste 2:", data);
    const payload = JSON.parse(atob(token.split('.')[1]));

    const tipo = payload.tipo?.trim();

    

    console.log("log do tipo:",tipo);
    switch (tipo) {
      case "Professor":
        window.location.href = "/app/Tela_Professor/professor.html";
      break;

    }

    switch (tipo) {
      case "Aluno":
        window.location.href = "/app/Tela_Aluno/aluno.html";
        break;
      case "Professor":
        window.location.href = "/app/Tela_Professor/professor.html";
        break;
      case "Coordenador":
        window.location.href = "/app/Tela_Coordenador/coordenador.html";
        break;
      case "Diretor":
        window.location.href = "/app/Tela_Diretor/diretor.html";
        break;
      case "SecretariaEducacao":
        window.location.href = "/app/Tela__SecretariaEd/SecretariaED.html";
        break;
      default:
        console.log(tipo)
        mensagemErro.textContent = "Tipo de usuário não reconhecido.";
        break;
    }
  } catch (error) {
    console.error(error);
    mensagemErro.textContent = "Erro ao conectar com o servidor.";
  }
});
