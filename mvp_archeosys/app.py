from typing import Annotated
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine, select,MetaData, Table
from fastapi import FastAPI, HTTPException, status, Depends, Security, Form
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone, date
from fastapi.security import OAuth2PasswordBearer
from mvp_archeosys.schemas import *

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

DATABASE_URL = 'postgresql://postgres:admin@localhost:5432/MVP' #endereco do servidor postgres

engine = create_engine(DATABASE_URL)
Base = automap_base()
Base.prepare(autoload_with=engine)
session = Session(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)#gerar gets
metadata = MetaData()
metadata.reflect(bind=engine)


for class_name in Base.classes.keys():
    orm_class = getattr(Base.classes, class_name)
    #print(f"Table: {class_name}")
    # Opcional mostrar todas as tabelas
    first_row = session.query(orm_class).first()
    if first_row:
        pass
        #print(dict(first_row.__dict__))
    #print('-' * 40)


#configurção token jwt
SECRET_KEY = "tbkMfMPLvnJUKPAXwsTWs9Q8H180vbquMUoVbXCA6cA="
ALGORITHM = "HS256"

def get_usuario_logado(token: Annotated[str, Depends(oauth2_scheme)]):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("sub")
        tipo = payload.get("tipo")
        if not usuario_id or not tipo:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {"id": usuario_id, "tipo": tipo}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

def somente_secretaria(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "SecretariaEducacao":
        raise HTTPException(status_code=403, detail="Apenas a Secretaria de educação pode realizar esta ação.")
    return usuario

def somente_coordenador(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "Coordenador":
        raise HTTPException(status_code=403, detail="Apenas coordanadores podem realizar esta ação.")
    return usuario

def somente_diretor(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "Diretor":
        raise HTTPException(status_code=403, detail="Apenas diretores podem realizar esta ação.")
    return usuario

def somente_professor(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "Professor":
        raise HTTPException(status_code=403, detail="Apenas diretores podem realizar esta ação.")
    return usuario

@app.post("/token/", status_code=status.HTTP_200_OK)
def login(username: EmailStr = Form(...), password: str = Form(...)):
    with Session(engine) as s:
        usuario_BD = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == username)
        ).first()
        if usuario_BD is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        elif not password == usuario_BD.senha:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        
        dados_token = {"email" : str(username), "tipo" : str(usuario_BD.tipo), "sub" : str(usuario_BD.id_usuarios), "exp": datetime.now(timezone.utc) + timedelta(hours=1)}

        expiracao = datetime.now(timezone.utc) + timedelta(hours=1)

        token_jwt = jwt.encode(dados_token, SECRET_KEY, algorithm=ALGORITHM)

        return {"access_token": token_jwt, "token_type": "bearer"}


@app.post("/escolas/", status_code=status.HTTP_201_CREATED) #quem pode cadastrar é a secretaria
def cadastrar_escolas(escola: EscolaCreate, usuario = Depends(somente_secretaria)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.escolas).where(Base.classes.escolas.nome == escola.nome)
        ).first()
        if result is None:
            nova_escola = Base.classes.escolas(nome = escola.nome,endereco = escola.endereco)
            s.add(nova_escola)
            s.commit()
            print('escola cadastrada')
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)


@app.post("/diretores/", status_code=status.HTTP_201_CREATED)
def cadastrar_diretores(diretor: DiretorCreate, usuario = Depends(somente_secretaria)): #quem pode cadastrar é a secretaria
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == diretor.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = diretor.nome, email = diretor.email, senha = diretor.senha, tipo = 'Diretor')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == diretor.escola)).first()
            if escola is not None:
                novo_diretor = Base.classes.diretores(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
                s.add(novo_diretor)
                s.commit()
            else:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT)
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)


@app.post("/coordenadores/", status_code=status.HTTP_201_CREATED) #quem pode cadastrar é o diretor
def cadastrar_coordenadores(coordenador: CoordenadorCreate, usuario = Depends(somente_diretor)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == coordenador.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = coordenador.nome, email = coordenador.email, senha = coordenador.senha, tipo = 'Coordenador')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == coordenador.escola)).first()
            if escola is not None:
                novo_coordenador = Base.classes.coordenadores(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
                s.add(novo_coordenador)
                s.commit()
            else:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT)
            
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)


@app.post("/professores/", status_code=status.HTTP_201_CREATED)
def cadastrar_professores(professor: ProfessorCreate, usuario = Depends(somente_coordenador)): #quem pode cadastrar é o coordenador
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == professor.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = professor.nome, email = professor.email, senha = professor.senha, tipo = 'Professor')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == professor.escola)).first()
            novo_professor = Base.classes.professores(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_professor)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)


@app.post("/alunos/", status_code=status.HTTP_201_CREATED) #quem pode cadastrar é o coordenador
def cadastrar_alunos(aluno: AlunoCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == aluno.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = aluno.nome, email = aluno.email, senha = aluno.senha, tipo = 'Aluno')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == aluno.escola)).first()
            novo_aluno = Base.classes.alunos(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_aluno)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)


@app.post("/turma/", status_code=status.HTTP_201_CREATED) #cadastrar turma pelo coordenador
def cadastrar_turma(turma: TurmaCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.turmas).where(Base.classes.turmas.nome_turma == turma.nome_turma)
        ).first()
        if result is None:
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == turma.escola)).first()
            if escola is None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail = "escola não existe")
            else:
                nova_turma = Base.classes.turmas(nome_turma = turma.nome_turma , horario = turma.horario, serie = turma.serie, turno = turma.turno, id_escolas = escola.id_escolas)
                s.add(nova_turma)
                s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)

@app.post("/aluno_turma/", status_code=status.HTTP_201_CREATED)
def cadastrar_aluno_turma(alunoTurma: AlunoTurmaCreate,usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        turma_BD = s.scalars(
            select(Base.classes.turmas).where(Base.classes.turmas.nome_turma == alunoTurma.turma)
        ).first()
        if not turma_BD:
            raise HTTPException(status_code=404, detail="Turma não encontrada")

        usuario_BD = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.nome_usuarios == alunoTurma.aluno).where(Base.classes.usuarios.tipo == "Aluno")
        ).first()
        if not usuario_BD:
            raise HTTPException(status_code=404, detail="Usuário aluno não encontrado")

        aluno_entry = s.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == usuario_BD.id_usuarios)
        ).first()
        if not aluno_entry:
            raise HTTPException(status_code=404, detail="Aluno (tabela alunos) não encontrado")

        existe = s.scalars(
            select(Base.classes.turma_alunos).where((Base.classes.turma_alunos.id_turmas == turma_BD.id_turmas) & (Base.classes.turma_alunos.id_alunos == aluno_entry.id_alunos))
        ).first()
        if existe:
            raise HTTPException(status_code=409, detail="Aluno já está na turma")

        aluno_turma = Base.classes.turma_alunos(
            id_turmas=turma_BD.id_turmas,
            id_alunos=aluno_entry.id_alunos
        )
        s.add(aluno_turma)
        s.commit()
        s.refresh(aluno_turma)

        return {"mensagem": "Aluno adicionado à turma com sucesso"}


from fastapi import HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

@app.post("/disciplina/", status_code=status.HTTP_201_CREATED)
def cadastrar_disciplina(disciplina: DisciplinaCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        # 1) Checa duplicata pelo nome
        existente = s.scalar(select(1).select_from(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == disciplina.nome))
        if existente:
            raise HTTPException(status_code=409, detail="Disciplina já existe")

        # 2) Busca a turma pelo nome
        turma_BD = s.scalars(
            select(Base.classes.turmas).where(Base.classes.turmas.nome_turma == disciplina.turma)
        ).first()
        if not turma_BD:
            raise HTTPException(status_code=404, detail="Turma não encontrada")

        # 3) Busca o usuário do tipo Professor pelo nome
        usuario_prof = s.scalars(
            select(Base.classes.usuarios)
            .where(Base.classes.usuarios.nome_usuarios == disciplina.professor)
            .where(Base.classes.usuarios.tipo == "Professor")
        ).first()
        if not usuario_prof:
            raise HTTPException(status_code=404, detail="Usuário professor não encontrado")

        # 4) Busca o registro em 'professores' para obter id_professores
        prof_BD = s.scalars(
            select(Base.classes.professores)
            .where(Base.classes.professores.id_usuarios == usuario_prof.id_usuarios)
        ).first()
        if not prof_BD:
            raise HTTPException(status_code=404, detail="Professor (tabela professores) não encontrado")

        # 5) Cria e persiste a nova disciplina
        nova = Base.classes.disciplinas(
            nome_disciplina = disciplina.nome,
            id_turmas       = turma_BD.id_turmas,
            id_professores  = prof_BD.id_professores
        )
        s.add(nova)
        s.commit()
        s.refresh(nova)

        return {
            "id": nova.id_disciplinas,
            "nome": nova.nome_disciplina,
            "turma": turma_BD.nome_turma,
            "professor": usuario_prof.nome_usuarios
        }

@app.post("/presenca/", status_code=status.HTTP_201_CREATED)  # Somente professor pode cadastrar
def cadastrar_presenca(presenca: PresencaCreate, usuario=Depends(somente_professor)):
    with Session(engine) as session:
        # Buscar o usuário aluno pelo nome informado em presenca.aluno
        usuario_aluno = session.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.nome_usuarios == presenca.aluno)
        ).first()
        if usuario_aluno is None:
            raise HTTPException(status_code=404, detail="Usuário aluno não encontrado")

        # Buscar a disciplina pelo nome informado em presenca.disciplina
        disciplina = session.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == presenca.disciplina)
        ).first()
        if disciplina is None:
            raise HTTPException(status_code=409, detail="Disciplina não existe")

        # Buscar o aluno correspondente na tabela alunos usando o id_usuarios
        aluno = session.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == usuario_aluno.id_usuarios)
        ).first()
        if aluno is None:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")
        
        # Verificar se a presença já foi cadastrada para o aluno, disciplina e data atual
        presenca_existente = session.scalars(
            select(Base.classes.presencas).where(
                (Base.classes.presencas.id_alunos == aluno.id_alunos) &
                (Base.classes.presencas.data == date.today()) &
                (Base.classes.presencas.id_disciplinas == disciplina.id_disciplinas)
            )
        ).first()
        if presenca_existente is not None:
            raise HTTPException(status_code=409, detail="Presença já cadastrada")
        
        # Criar a nova presença
        nova_presenca = Base.classes.presencas(
            id_alunos=aluno.id_alunos,
            id_disciplinas=disciplina.id_disciplinas,
            data=date.today(),
            presente=presenca.presente,
            justificativa=presenca.justificativa
        )
        session.add(nova_presenca)
        session.commit()
        
        return {"message": "Presença cadastrada com sucesso"}

@app.post("/notas/", status_code=status.HTTP_201_CREATED)  # Somente professor pode cadastrar
def cadastrar_notas(notas: NotasCreate, usuario=Depends(somente_professor)):
    with Session(engine) as s:
        usuario_aluno = session.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.nome_usuarios == notas.aluno)
        ).first()
        if usuario_aluno is None:
            raise HTTPException(status_code=404, detail="Usuário aluno não encontrado")
        aluno = session.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == usuario_aluno.id_usuarios)
        ).first()
        if aluno is None:
            raise HTTPException(status_code=409, detail="aluno inválido")

        disciplina = session.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == notas.disciplina)
        ).first()

        if 1 < notas.bimestre <= 4:
            raise HTTPException(status_code=409, detail="bimestre menor que 1, ou maior que 4, inválido")

        if 0 < notas.nota > 10:
            raise HTTPException(status_code=409, detail="nota menor que 0, ou maior que 10, inválido")
        
        nova_nota = Base.classes.notas(id_usuarios = usuario_aluno.id_usuarios, id_alunos = aluno.id_alunos, id_disciplinas = disciplina.id_disciplinas, bimestre = notas.bimestre, nota = notas.nota)

        s.add(nova_nota)
        s.commit()

class RelatorioAula(BaseModel):
    professor: str
    disciplina: str
    conteudo: str
    metodologia: str
    recursos: str



@app.post("/relatorioaula/", status_code=status.HTTP_201_CREATED)  # Somente professor pode cadastrar
def cadastrar_relatorio_aula(relatorioaula: RelatorioAula, usuario=Depends(somente_professor)):
    with Session(engine) as s:
        professor = session.scalars(
            select(Base.classes.professores).where(Base.classes.professores.id_professores == relatorioaula.professor)
        ).first()
        disciplina = session.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.id_disciplinas == relatorioaula.id_usuarios)
        ).first()
        id_professor = int(professor.id_professores)
        novo_relatorioaula = Base.classes.relatorios_aula(
            id_professores = id_professor, id_disciplinas = disciplina.id_disciplinas, data = date.today(), conteudo = relatorioaula.conteudo, metodologia = relatorioaula.metodologia, recursos = relatorioaula.recursos
            )
        s.add(novo_relatorioaula)
        s.commit()








'''
class SolicitacaoCorrecaoCreate(BaseModel):#corrigir modelo
    aluno
    tipo
    referencia #referencia ao ID da nota ou presenca
    mensagem
    #status, default 'Pendente'
'''


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


for table_name in metadata.tables:
    def get_table_data(table_name=table_name):
        table = Table(table_name, metadata, autoload_with=engine)
        with engine.connect() as conn:
            result = conn.execute(table.select())
            data = result.fetchall()
        return [dict(row._mapping) for row in data]

    endpoint = f"/{table_name}"
    app.get(endpoint)(get_table_data)



