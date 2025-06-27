--Abstraindo a explicação do professor

-- Minha tabela de usuarios (Meus atores principais no sistema)
--Aqui armazena os dados basicos de todos os usuarios do nosso sistema
CREATE TABLE usuarios(
 id_usuarios SERIAL PRIMARY KEY,
 nome_usuarios VARCHAR(100) NOT NULL,
 email VARCHAR(100) CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') UNIQUE, --email usado para login
 senha VARCHAR(100) NOT NULL,
 tipo VARCHAR(20) CHECK (tipo IN ('SecretariaEducacao', 'Diretor', 'Coordenador', 'Professor', 'Aluno')) NOT NULL
);
INSERT INTO usuarios(nome_usuarios, email, senha, tipo)
VALUES ('Nome Secretaria','secretaria@example.com','string','SecretariaEducacao');



-- Tabela de escolas
CREATE TABLE escolas(
id_escolas SERIAL PRIMARY KEY,
nome VARCHAR(100) NOT NULL,
endereco VARCHAR(100)
);

-- Tabela diretores(vinculados as escolas)
CREATE TABLE diretores(
id_diretores SERIAL PRIMARY KEY,
id_usuarios INT REFERENCES usuarios(id_usuarios),
id_escolas INT REFERENCES escolas(id_escolas)
);

-- Tabela coordenadores(vinculados as escolas)
CREATE TABLE coordenadores(
id_coordenadores SERIAL PRIMARY KEY, 
id_usuarios INT REFERENCES usuarios (id_usuarios),
id_escolas INT REFERENCES escolas (id_escolas)
);

-- Tabela professores (Vinculados as escolas)
CREATE TABLE professores(
id_professores Serial PRIMARY KEY,
id_usuarios INT REFERENCES usuarios(id_usuarios),
id_escolas INT REFERENCES escolas(id_escolas)
);

-- Tabela alunos (vinculados as escolas)
CREATE TABLE alunos(
id_alunos SERIAL PRIMARY KEY,
id_usuarios INT REFERENCES usuarios (id_usuarios),
id_escolas INT REFERENCES escolas(id_escolas)
);

-- Tabela de turmas (nome da escola, Turno: Manhã, Tarde ou Noite)
-- Cada turma pertence a uma escola e tem turno e serie definidos
CREATE TABLE turmas (
id_turmas SERIAL PRIMARY KEY,
nome_turma VARCHAR(50),
horario VARCHAR(20),
serie VARCHAR(30),
turno VARCHAR(20) CHECK (turno IN ('Manhã', 'Tarde', 'Noite')),
id_escolas INT REFERENCES escolas(id_escolas)
);

-- Disciplinas por turma
CREATE TABLE disciplinas (
id_disciplinas SERIAL PRIMARY KEY,
nome_disciplina VARCHAR(100),
id_turmas INT REFERENCES turmas(id_turmas),
id_professores INT REFERENCES professores(id_professores)
);

-- Alunos vinculados às turmas 
-- Relaciona alunos as turmas  (muitos para muitos)- Termo já usado pelo professor em sala.
CREATE TABLE turma_alunos (
id_turma_alunos SERIAL PRIMARY KEY,
id_turmas INT REFERENCES turmas(id_turmas),
id_alunos INT REFERENCES alunos(id_alunos)
);

-- Frequência registrada manualmente (simulada)- (Data da aula, TRUE=Presente, FALSE=Ausente)
CREATE TABLE presencas (
id_presencas SERIAL PRIMARY KEY,
id_alunos INT REFERENCES alunos(id_alunos),
id_disciplinas INT REFERENCES disciplinas(id_disciplinas),
data DATE NOT NULL,
presente BOOLEAN NOT NULL,
justificativa VARCHAR(200) 
);

-- Notas lançadas por disciplina e bimestre (notas entre 0.00 a 10.00, e bimestre 1,2,3,4)
CREATE TABLE notas (
id_notas SERIAL PRIMARY KEY,
id_usuarios INT REFERENCES usuarios(id_usuarios),
id_alunos INT REFERENCES alunos(id_alunos),
id_disciplinas INT REFERENCES disciplinas(id_disciplinas),
bimestre INT NOT NULL CHECK (bimestre BETWEEN 1 AND 4),
nota DECIMAL(5,2) CHECK (nota BETWEEN 0 AND 10) NOT NULL 
);

-- Relatorios de aula do professor
-- Armazena o conteúdo lecionado, recursos usados, metodologia, etc.
CREATE TABLE relatorios_aula (
  id_relatorios_aula SERIAL PRIMARY KEY,
  id_professores INT REFERENCES professores(id_professores),
  id_disciplinas INT REFERENCES disciplinas(id_disciplinas),
  data DATE,
  conteudo VARCHAR(100),
  metodologia VARCHAR(100),
  recursos VARCHAR(100)
);


--Solicitacao de correcao
-- Permite ao aluno solicitar correção de notas ou presença.
CREATE TABLE solicitacoes_correcao (
  id_solicitacoes_correcao SERIAL PRIMARY KEY,
  id_alunos INT REFERENCES alunos(id_alunos),
  tipo VARCHAR(20) CHECK (tipo IN ('nota', 'presenca')),
  id_referencia INT NOT NULL, --referencia ao ID da nota ou presenca
  mensagem VARCHAR(100), -- (motivo da solicitacao)
  status VARCHAR(20) DEFAULT 'Pendente'
);

-- Criação do Log para alterações 
-- Para armazenar logs de ações manuais como notas e presenças.
CREATE TABLE log_alteracoes (
id SERIAL PRIMARY KEY,
tabela_afetada VARCHAR(50) NOT NULL, --obs: Nome da tabela Afetada
id_registro INT NOT NULL,-- obs: ID do registro alterado
id_usuarios INT NOT NULL REFERENCES usuarios(id_usuarios), --obs: Quem fez a alteracao
acao VARCHAR(10) NOT NULL, -- obs:(INSERT, UPDATE, DELETE)
data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- obs: data/hora da alteracao
observacao VARCHAR(200) -- obs: comentario ou descricao da alteracao
);

-- VIEW: Relatório de Aluno (Vai montar relatório individual do aluno)
-- É a consulta das notas e presença de alunos 
CREATE VIEW view_relatorio_aluno AS
SELECT 
    a.id_alunos,
    u.nome_usuarios AS nome_aluno,
    d.nome_disciplina AS disciplina,
    n.bimestre,
    n.nota,
    p.data AS data_frequencia,
    p.presente
FROM alunos a
JOIN usuarios u ON u.id_usuarios = a.id_usuarios
LEFT JOIN presencas p ON p.id_alunos = a.id_alunos 
LEFT JOIN notas n ON n.id_alunos = a.id_alunos
LEFT JOIN disciplinas d ON d.id_disciplinas = n.id_disciplinas;

-- VIEW: Relatório de Professor (Mostra quais disciplinas cada professor leciona e em qual turma)
-- É a consulta das disciplinas por professor e turma
CREATE VIEW view_relatorio_professor AS
SELECT 
    d.id_disciplinas,
    u.nome_usuarios AS professor,
    t.nome_turma AS turma,
    d.nome_disciplina AS disciplina
FROM disciplinas d
JOIN professores p ON d.id_professores = p.id_professores
JOIN usuarios u ON u.id_usuarios = p.id_usuarios
JOIN turmas t ON t.id_turmas = d.id_turmas;

-- FUNCTION:Para evitar duplicidade de presença
-- Evita que a mesma presença seja registrada duas vezes para o mesmo aluno na mesma data/disciplina
CREATE OR REPLACE FUNCTION verificar_presenca_unica()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM presencas
        WHERE id_alunos = NEW.id_alunos
        AND id_disciplinas = NEW.id_disciplinas
        AND data = NEW.data
    ) THEN
        RAISE EXCEPTION 'Presença já registrada para este aluno nesta data e disciplina';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: aplicar verificação de presença única
-- associa a funcao verificar_presenca_unica a tabela presencas
CREATE TRIGGER trg_presenca_unica
BEFORE INSERT ON presencas
FOR EACH ROW
EXECUTE FUNCTION verificar_presenca_unica();

-- FUNCTION: log para alterações em notas
-- Cria uma função para registrar no log sempre que uma nota for alterada
CREATE OR REPLACE FUNCTION log_update_nota()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO log_alteracoes (tabela_afetada, id_registro, id_usuarios, acao, observacao)
    VALUES ('notas', OLD.id_notas, NEW.id_usuarios, 'UPDATE', 'Nota alterada manualmente');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: aplica log ao atualizar nota
-- Vai ativar a funcao de log sempre que uma nota for atualizada na tabela notas
CREATE TRIGGER trg_log_nota
AFTER UPDATE ON notas
FOR EACH ROW
EXECUTE FUNCTION log_update_nota();











