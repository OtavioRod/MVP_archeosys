from typing import Annotated
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, select
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
    if usuario["tipo"] != "secretaria":
        raise HTTPException(status_code=403, detail="Apenas a Secretaria de educação pode realizar esta ação.")
    return usuario

def somente_coordenador(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "coordenador":
        raise HTTPException(status_code=403, detail="Apenas coordanadores podem realizar esta ação.")
    return usuario

def somente_diretor(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "diretor":
        raise HTTPException(status_code=403, detail="Apenas diretores podem realizar esta ação.")
    return usuario

@app.post("/token/", status_code=status.HTTP_200_OK)
def login(username: EmailStr = Form(...), password: str = Form(...)): # antes de mudar estava assim: def login(usuario: LoginUsuario):
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
            novo_diretor = Base.classes.diretores(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_diretor)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)


@app.post("/coordenadores/", status_code=status.HTTP_201_CREATED) #quem pode cadastrar é secretaria
def cadastrar_coordenadores(coordenador: CoordenadorCreate, token: Annotated[str, Depends(oauth2_scheme)]):
    print(token)
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == coordenador.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = coordenador.nome, email = coordenador.email, senha = coordenador.senha, tipo = 'Coordenador')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == coordenador.escola)).first()
            novo_coordenador = Base.classes.coordenadores(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_coordenador)
            s.commit()
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
            novo_professor = Base.classes.professores(id_usuario = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
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
            select(Base.classes.turmas).where(Base.classes.turmas.nome == turma.nome)
        ).first()
        if result is None:
            escola = select(Base.classes.escolas).where(Base.classes.escolas.nome == turma.escola)
            nova_turma = Base.classes.turmas(nome = turma.nome, turno = turma.turno, id_escolas = escola.id_escolas)
            s.add(nova_turma)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)
        

@app.post("/aluno_turma/", status_code=status.HTTP_201_CREATED, )
def cadastrar_aluno_turma(turma: TurmaCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        if not turma_BD:
            raise HTTPException(status_code=404, detail="Turma não encontrada")
        if not aluno_BD:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")

        turma_BD = s.scalars(select(Base.classes.turmas).where(Base.classes.turmas.nome == turma.turma)).first()
        aluno_BD = s.scalars(select(Base.classes.usuarios).where(Base.classes.usuarios.nome == turma.aluno)).first()
        aluno_turma = Base.classes.turma_alunos(id_turmas = turma_BD.id_turmas,id_alunos = aluno_BD.id_alunos)
        s.add(aluno_turma)
        s.commit()


@app.post("/disciplina/", status_code=status.HTTP_201_CREATED) #cadastrar disciplina pelo coordenador
def cadastrar_disciplina(disciplina: DisciplinaCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.nome == disciplina.nome)
        ).first()
        if result is None:
            turma = select(Base.classes.turmas).where(Base.classes.turmas.nome == disciplina.turma)#terminar
            professor = select(Base.classes.professores).where(Base.classes.professores.nome == disciplina.professor)#terminar
            nova_disciplina = Base.classes.disciplinas(nome = disciplina.nome, id_turmas = turma.id_turmas,id_professores = professor.id_professores)
            s.add(nova_disciplina)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)






@app.post("/presenca/", status_code=status.HTTP_201_CREATED)#quem pode cadastrar é o professor
def cadastrar_presenca(presenca: PresencaCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        result = s.scalars(
            #aluno = select(Base.classes.usuarios).where(Base.classes.alunos)
            
            select(Base.classes.presencas).where(
                (Base.classes.presencas.id_aluno == aluno.id_usuarios) &
                (Base.classes.presencas.data == date.today()) &
                (Base.classes.presencas.id_disciplinas == presenca.nome)
                )
        ).first()


#cadastrar notas #professor
class NotasCreate(BaseModel):
    aluno: str
    disciplina: str
    bimestre: int
    nota: float


class SecretariaCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str

#cadastrar secretaria
@app.post("/secretaria/", status_code=status.HTTP_201_CREATED)
def cadastrar_presenca(secretaria: SecretariaCreate):
    with Session(engine) as s:
        result = s.scalars(
                select(Base.classes.usuarios).where(Base.classes.usuarios.email == secretaria.email)
            ).first()
        if result is None:
            nova_secretaria = Base.classes.usuarios(nome_usuarios = secretaria.nome, email = secretaria.email, senha = secretaria.senha, tipo = 'SecretariaEducacao')
            s.add(nova_secretaria)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)
        