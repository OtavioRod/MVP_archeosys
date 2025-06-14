from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, select
from fastapi import FastAPI, HTTPException, status, Depends
from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

DATABASE_URL = 'postgresql://postgres:admin@localhost:5432/MVP' #endereco do servidor postgres

engine = create_engine(DATABASE_URL)
Base = automap_base()
Base.prepare(autoload_with=engine)
session = Session(engine)

# Passo 5: Access all mapped classes
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

def get_usuario_logado(token: str = Depends(oauth2_scheme)):
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

class LoginUsuario(BaseModel):
    email: str
    senha: str

@app.post("/login/", status_code=status.HTTP_200_OK)
def login(usuario: LoginUsuario):
    with Session(engine) as s:
        usuario_BD = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == usuario.email)
        ).first()
        if usuario_BD is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        elif not usuario.senha == usuario_BD.senha:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        
        dados_token = {"email" : str(usuario.email), "tipo" : str(usuario_BD.tipo), "id" : str(usuario_BD.id_usuarios)}

        expiracao = datetime.now(timezone.utc) + timedelta(hours=1)

        token_jwt = jwt.encode(dados_token, SECRET_KEY, algorithm=ALGORITHM)

        print(token_jwt)

        return {"access_token": token_jwt, "token_type": "bearer", "exp": expiracao}
    

'''
def deletar_escola(id):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.escolas).where(Base.classes.escolas.id_escola == id)
        ).first()

        print(result.endereco)
        
        if result:
            s.delete(result)
            s.commit()
        else:
            print("Escola com id especificado não encontrada.")
'''
class EscolaCreate(BaseModel):
    nome: str
    endereco: str

@app.post("/escolas/", status_code=status.HTTP_201_CREATED) #quem pode cadastrar é a secretaria
def cadastrar_escolas(escola: EscolaCreate, Depends(somente_secretaria)):
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


class DiretorCreate(BaseModel):
    nome: str
    email: str
    senha: str
    escola: str

@app.post("/diretores/", status_code=status.HTTP_201_CREATED)
def cadastrar_diretores(diretor: DiretorCreate, Depends(somente_secretaria)): #quem pode cadastrar é a secretaria
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == diretor.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = diretor.nome, email = diretor.email, senha = diretor.senha, tipo = 'diretor')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == diretor.escola)).first()
            novo_diretor = Base.classes.diretores(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_diretor)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)

class CoordenadorCreate(BaseModel):
    nome: str
    email: str
    senha: str
    escola: str

@app.post("/coordenadores/", status_code=status.HTTP_201_CREATED) #quem pode cadastrar é o diretor
def cadastrar_coordenadores(coordenador: CoordenadorCreate, Depends(somente_diretor)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == coordenador.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = coordenador.nome, email = coordenador.email, senha = coordenador.senha, tipo = 'coordenador')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == coordenador.escola)).first()
            novo_coordenador = Base.classes.coordenadores(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_coordenador)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)

class ProfessorCreate(BaseModel):
    nome: str
    email: str
    senha: str
    escola: str

@app.post("/professores/", status_code=status.HTTP_201_CREATED)
def cadastrar_professores(professor: ProfessorCreate, Depends(somente_coordenador)): #quem pode cadastrar é o coordenador
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == professor.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = professor.nome, email = professor.email, senha = professor.senha, tipo = 'professor')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == professor.escola)).first()
            novo_professor = Base.classes.professores(id_usuario = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_professor)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)

class AlunoCreate(BaseModel):
    nome: str
    email: str
    senha: str
    escola: str

@app.post("/alunos/", status_code=status.HTTP_201_CREATED) #quem pode cadastrar é o coordenador
def cadastrar_alunos(aluno: AlunoCreate, Depends(somente_coordenador)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == aluno.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = aluno.nome, email = aluno.email, senha = aluno.senha, tipo = 'aluno')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.nome == aluno.escola)).first()
            novo_aluno = Base.classes.alunos(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
            s.add(novo_aluno)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)
