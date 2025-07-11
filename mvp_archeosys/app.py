from typing import Annotated
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine, select,MetaData, Table, select
from fastapi import FastAPI, HTTPException, status, Depends, Security, Form, Response, Cookie, Request, Body
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone, date
from fastapi.security import OAuth2PasswordBearer,HTTPBasic, HTTPBasicCredentials
from mvp_archeosys.schemas import *
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

engine = None
Base = None
SessionLocal = None
session = None
metadata = None

app = FastAPI()

app.mount("/app", StaticFiles(directory="Frontend", html=True), name="frontend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
def prepare_base():
    global engine, Base, SessionLocal, session, metadata
    DATABASE_URL = "postgresql://archeo_user:secretpassword@host.docker.internal:5400/archeodb"
    engine = create_engine(DATABASE_URL)
    Base = automap_base()
    Base.prepare(autoload_with=engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session(engine)

    metadata = MetaData()
    metadata.reflect(bind=engine)


prepare_base()



#configurção token jwt
SECRET_KEY = "tbkMfMPLvnJUKPAXwsTWs9Q8H180vbquMUoVbXCA6cA="
ALGORITHM = "HS256"


def get_usuario_logado(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido"
        )
    
    if access_token.startswith("Bearer "):
        access_token = access_token[len("Bearer "):]
    
    access_token = access_token.strip()
    
    try:
        payload = jwt.decode(
            access_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        usuario_id = payload.get("sub")
        tipo = payload.get("tipo")
        if not usuario_id or not tipo:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        return {"id": usuario_id, "tipo": tipo}
    except JWTError as e:
        print("JWT decoding error:", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado"
        )

def somente_secretaria(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "SecretariaEducacao":
        raise HTTPException(status_code=403, detail="Apenas a Secretaria de educação pode realizar esta ação.")
    return usuario

def somente_coordenador(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "Coordenador":
        raise HTTPException(status_code=403, detail="Apenas coordenadores podem realizar esta ação.")
    return usuario

def somente_aluno(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "Aluno":
        raise HTTPException(status_code=403, detail="Apenas Aluno podem realizar esta ação.")
    return usuario


def somente_diretor(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "Diretor":
        raise HTTPException(status_code=403, detail="Apenas diretores podem realizar esta ação.")
    return usuario

def somente_professor(usuario=Depends(get_usuario_logado)):
    if usuario["tipo"] != "Professor":
        raise HTTPException(status_code=403, detail="Apenas professores podem realizar esta ação.")
    return usuario

@app.on_event("startup")
def on_startup():
    prepare_base()

@app.post("/token/", status_code=status.HTTP_200_OK)
def login(response: Response,username: EmailStr = Form(...), password: str = Form(...)):#login petrick
    with Session(engine) as s:
        usuario_BD = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == username)
        ).first()

        if usuario_BD is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        elif usuario_BD.senha != password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha incorreta")

        nome_usuario = usuario_BD.nome_usuarios
        nome_escola = ""

        if usuario_BD.tipo == "Coordenador":
            escola_obj = s.scalars(
                select(Base.classes.escolas)
                .join(Base.classes.coordenadores)
                .where(Base.classes.coordenadores.id_usuarios == usuario_BD.id_usuarios)
            ).first()
        elif usuario_BD.tipo == "Diretor":
            escola_obj = s.scalars(
                select(Base.classes.escolas)
                .join(Base.classes.diretores)
                .where(Base.classes.diretores.id_usuarios == usuario_BD.id_usuarios)
            ).first()
        elif usuario_BD.tipo == "Professor":
            escola_obj = s.scalars(
                select(Base.classes.escolas)
                .join(Base.classes.professores)
                .where(Base.classes.professores.id_usuarios == usuario_BD.id_usuarios)
            ).first()
        elif usuario_BD.tipo == "Aluno":
            escola_obj = s.scalars(
                select(Base.classes.escolas)
                .join(Base.classes.alunos)
                .where(Base.classes.alunos.id_usuarios == usuario_BD.id_usuarios)
            ).first()
        else:
            escola_obj = None

        nome_escola= ""
        id_escola = ""

        if escola_obj:
            nome_escola = escola_obj.nome
            id_escola = escola_obj.id_escolas

        dados_token = {
            "email": str(username),
            "tipo": str(usuario_BD.tipo),
            "sub": str(usuario_BD.id_usuarios),
            "nome": nome_usuario,
            "escola": nome_escola,
            "id_escola": id_escola,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        }

        

        token_jwt = jwt.encode(dados_token, SECRET_KEY, algorithm=ALGORITHM)

        response.set_cookie(
            key="access_token",
            value=token_jwt,
            httponly=True,
            samesite="lax",  
            secure=False,    # True em produção com HTTPS
            max_age=3600,
            path="/"
        )

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
        print("RECEBIDO:", professor)
        result = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.email == professor.email)
        ).first()
        if result is None:
            novo_usuario = Base.classes.usuarios(nome_usuarios = professor.nome, email = professor.email, senha = professor.senha, tipo = 'Professor')
            s.add(novo_usuario)
            s.flush()
            escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.id_escolas == professor.id_escola)).first()
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
            try:
                novo_usuario = Base.classes.usuarios(nome_usuarios = aluno.nome, email = aluno.email, senha = aluno.senha, tipo = 'Aluno')
                s.add(novo_usuario)
                s.flush()
                escola = s.scalars(select(Base.classes.escolas).where(Base.classes.escolas.id_escolas == aluno.id_escola)).first()
                novo_aluno = Base.classes.alunos(id_usuarios = novo_usuario.id_usuarios, id_escolas = escola.id_escolas)
                s.add(novo_aluno)
                s.commit()
            except Exception as e:
                s.rollback()  # Caso haja erro, faz rollback da transação
                print(f"Erro ao cadastrar aluno: {e}")  # Log de erro no servidor
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Erro ao cadastrar aluno. Tente novamente mais tarde."
                )
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)

@app.post("/turma/", status_code=status.HTTP_201_CREATED)
def cadastrar_turma(turma: TurmaCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        result = s.scalars(
            select(Base.classes.turmas).where(Base.classes.turmas.nome_turma == turma.nome_turma)
        ).first()
        
        if result is None:
            escola = s.get(Base.classes.escolas, turma.id_escola)
            if escola is None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Escola não existe")
            
            nova_turma = Base.classes.turmas(
                nome_turma=turma.nome_turma,
                horario=turma.horario,
                serie=turma.serie,
                turno=turma.turno,
                id_escolas=turma.id_escola
            )
            s.add(nova_turma)
            s.commit()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Turma já existe")

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

@app.post("/disciplina/", status_code=status.HTTP_201_CREATED)
def cadastrar_disciplina(disciplina: DisciplinaCreate, usuario = Depends(somente_coordenador)):
    with Session(engine) as s:
        existente = s.scalar(select(1).select_from(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == disciplina.nome))
        if existente:
            raise HTTPException(status_code=409, detail="Disciplina já existe")

        turma_BD = s.scalars(
            select(Base.classes.turmas).where(Base.classes.turmas.nome_turma == disciplina.turma)
        ).first()
        if not turma_BD:
            raise HTTPException(status_code=404, detail="Turma não encontrada")

        prof_BD = s.scalars(
            select(Base.classes.professores)
            .where(Base.classes.professores.id_professores == disciplina.id_professor)
        ).first()
        if not prof_BD:
            raise HTTPException(status_code=404, detail="Professor não encontrado")

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
            "professor": prof_BD.id_professores
        }


@app.post("/presenca/", status_code=status.HTTP_201_CREATED)  # Somente professor pode cadastrar
def cadastrar_presenca(presenca: PresencaCreate, usuario=Depends(somente_professor)):
    with Session(engine) as s:
        usuario_aluno = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.nome_usuarios == presenca.aluno)
        ).first()
        if usuario_aluno is None:
            raise HTTPException(status_code=404, detail="Usuário aluno não encontrado")

        disciplina = s.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == presenca.disciplina)
        ).first()
        if disciplina is None:
            raise HTTPException(status_code=409, detail="Disciplina não existe")

        aluno = s.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == usuario_aluno.id_usuarios)
        ).first()
        if aluno is None:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")
        
        presenca_existente = s.scalars(
            select(Base.classes.presencas).where(
                (Base.classes.presencas.id_alunos == aluno.id_alunos) &
                (Base.classes.presencas.data == date.today()) &
                (Base.classes.presencas.id_disciplinas == disciplina.id_disciplinas)
            )
        ).first()
        if presenca_existente is not None:
            raise HTTPException(status_code=409, detail="Presença já cadastrada")
        
        nova_presenca = Base.classes.presencas(
            id_alunos=aluno.id_alunos,
            id_disciplinas=disciplina.id_disciplinas,
            data=date.today(),
            presente=presenca.presente,
            justificativa=presenca.justificativa
        )
        s.add(nova_presenca)
        s.commit()
        
        return {"message": "Presença cadastrada com sucesso"}

@app.post("/notas/", status_code=status.HTTP_201_CREATED)  # Somente professor pode cadastrar
def cadastrar_notas(notas: NotasCreate, usuario=Depends(somente_professor)):
    with Session(engine) as s:
        usuario_aluno = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.nome_usuarios == notas.aluno)
        ).first()
        if usuario_aluno is None:
            raise HTTPException(status_code=404, detail="Usuário aluno não encontrado")
        aluno = s.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == usuario_aluno.id_usuarios)
        ).first()
        if aluno is None:
            raise HTTPException(status_code=409, detail="aluno inválido")

        disciplina = s.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == notas.disciplina)
        ).first()

        if 1 < notas.bimestre <= 4:
            raise HTTPException(status_code=409, detail="bimestre menor que 1, ou maior que 4, inválido")

        if 0 < notas.nota > 10:
            raise HTTPException(status_code=409, detail="nota menor que 0, ou maior que 10, inválido")
        
        nova_nota = Base.classes.notas(id_usuarios = usuario_aluno.id_usuarios, id_alunos = aluno.id_alunos, id_disciplinas = disciplina.id_disciplinas, bimestre = notas.bimestre, nota = notas.nota)

        s.add(nova_nota)
        s.commit()


import logging
logger = logging.getLogger(__name__)

@app.post("/relatorioaula/", status_code=status.HTTP_201_CREATED)  # Somente professor pode cadastrar
def cadastrar_relatorio_aula(relatorioaula: RelatorioAula, usuario=Depends(somente_professor)):
    logger.info(f"Recebido: {relatorioaula}")
    with Session(engine) as s:
#        usuario_professor = s.scalars(
#            select(Base.classes.usuarios).where(Base.classes.usuarios.nome_usuarios == relatorioaula.professor)
#        ).first()
#        professor = s.scalars(
#            select(Base.classes.professores).where(Base.classes.professores.id_usuarios == usuario_professor.id_usuarios)
#        ).first()

        professor = s.scalars(
            select(Base.classes.professores).where(Base.classes.professores.id_usuarios == usuario["id"])
        ).first()

        disciplina = s.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == relatorioaula.disciplina)
        ).first()
        
        novo_relatorioaula = Base.classes.relatorios_aula(
            id_professores = professor.id_professores, id_disciplinas = disciplina.id_disciplinas, data = date.today(), conteudo = relatorioaula.conteudo, metodologia = relatorioaula.metodologia, recursos = relatorioaula.recursos
            )
        s.add(novo_relatorioaula)
        s.commit()


@app.get("/alunorelatorio/")
def relatorio_de_aluno(usuario=Depends(somente_aluno)):
    with Session(engine) as s:
        view_relatorio_aluno = Table(
            "view_relatorio_aluno", metadata, autoload_with=engine
        )

        result = s.execute(
            select(view_relatorio_aluno).where(view_relatorio_aluno.c.id_alunos == 1
            )
        ).fetchall()

        return [dict(row._mapping) for row in result]

@app.get("/escoladiretor/", status_code=200)
def get_dados_diretor(usuario=Depends(somente_diretor)):
    with Session(engine) as s:
        diretor = s.scalars(
            select(Base.classes.diretores).where(Base.classes.diretores.id_usuarios == usuario["id"])
        ).first()
        if not diretor:
            raise HTTPException(404, "Diretor não encontrado")

        escola = s.scalars(
            select(Base.classes.escolas).where(Base.classes.escolas.id_escolas == diretor.id_escolas)
        ).first()
        if not escola:
            raise HTTPException(404, "Escola vinculada não encontrada")
        usuario_BD = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.id_usuarios == diretor.id_usuarios)
        ).first()

        return {
            "nome_diretor": usuario_BD.nome_usuarios,
            "escola": escola.nome
        }



@app.get("/disciplinas/professor/", status_code=status.HTTP_200_OK)
def listar_disciplinas_professor(usuario=Depends(somente_professor)):
    with Session(engine) as s:
        professor = s.scalars(
            select(Base.classes.professores).where(Base.classes.professores.id_usuarios == usuario["id"])
        ).first()
        if not professor:
            raise HTTPException(status_code=404, detail="Professor não encontrado")

        disciplinas = s.execute(
            select(Base.classes.disciplinas)
            .where(Base.classes.disciplinas.id_professores == professor.id_professores)
        ).scalars().all()

        resultado = []
        for d in disciplinas:
            turma = s.scalars(
                select(Base.classes.turmas).where(Base.classes.turmas.id_turmas == d.id_turmas)
            ).first()
            resultado.append({
                "id_disciplina": d.id_disciplinas,
                "nome_disciplina": d.nome_disciplina,
                "turma": turma.nome_turma if turma else "Turma não encontrada",
                "id_turma": turma.id_turmas if turma else None
            })

        return resultado
    

@app.get("/alunos/turma/{id_turma}", status_code=status.HTTP_200_OK)
def listar_alunos_da_turma(id_turma: int, usuario=Depends(somente_professor)):
    with Session(engine) as s:
        alunos_turma = s.execute(
            select(Base.classes.turma_alunos)
            .where(Base.classes.turma_alunos.id_turmas == id_turma)
        ).scalars().all()

        resultado = []
        for rel in alunos_turma:
            aluno = s.scalars(
                select(Base.classes.alunos).where(Base.classes.alunos.id_alunos == rel.id_alunos)
            ).first()

            usuario_aluno = s.scalars(
                select(Base.classes.usuarios).where(Base.classes.usuarios.id_usuarios == aluno.id_usuarios)
            ).first()

            resultado.append({
                "id_aluno": aluno.id_alunos,
                "nome_aluno": usuario_aluno.nome_usuarios,
                "email": usuario_aluno.email
            })

        return resultado



@app.get("/aluno/notas")
def notas_aluno(usuario=Depends(somente_aluno)):
    with Session(engine) as s:
        aluno = s.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == usuario["id"])
        ).first()

        notas = s.scalars(
            select(Base.classes.notas).where(Base.classes.notas.id_alunos == aluno.id_alunos)
        ).all()

        resultado = []
        for n in notas:
            disciplina = s.get(Base.classes.disciplinas, n.id_disciplinas)
            resultado.append({
                "disciplina": disciplina.nome_disciplina,
                "bimestre": n.bimestre,
                "nota": n.nota
            })

        return resultado
    
@app.get("/aluno/perfil")
def perfil_aluno(usuario=Depends(somente_aluno)):
    with Session(engine) as s:
        aluno = s.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == usuario["id"])
        ).first()

        if not aluno:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")

        escola = s.get(Base.classes.escolas, aluno.id_escolas)
        if not escola:
            raise HTTPException(status_code=404, detail="Escola não encontrada")

        turma_aluno = s.scalars(
            select(Base.classes.turma_alunos)
            .where(Base.classes.turma_alunos.id_alunos == aluno.id_alunos)
        ).first()

        if not turma_aluno:
            raise HTTPException(status_code=404, detail="Aluno não está vinculado a nenhuma turma")

        turma = s.get(Base.classes.turmas, turma_aluno.id_turmas)
        if not turma:
            raise HTTPException(status_code=404, detail="Turma não encontrada")

        usuario_BD = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.id_usuarios == aluno.id_usuarios)
        ).first()

        if not usuario_BD:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        email = usuario_BD.email

        return {
            "nome": usuario_BD.nome_usuarios,
            "turma": turma.nome_turma,
            "escola": escola.nome,
        }

@app.get("/professor/turmas_disciplinas")
def listar_turmas_disciplinas(usuario = Depends(somente_professor)):
    with Session(engine) as s:
        prof = s.scalars(
            select(Base.classes.professores)
            .where(Base.classes.professores.id_usuarios == int(usuario["id"]))
        ).first()

        if not prof:
            raise HTTPException(status_code=404, detail="Professor não encontrado")

        disciplinas = s.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.id_professores == prof.id_professores)
        ).all()

        lista_disciplinas = []
        lista_turmas = set()

        for d in disciplinas:
            lista_disciplinas.append(d.nome_disciplina)

            turma = s.scalars(
                select(Base.classes.turmas).where(Base.classes.turmas.id_turmas == d.id_turmas)
            ).first()
            if turma:
                lista_turmas.add(turma.nome_turma)

        return {
            "turmas": list(lista_turmas),
            "disciplinas": lista_disciplinas
        }
    

@app.get("/professor/alunos")
def listar_alunos(turma: str, disciplina: str, usuario=Depends(somente_professor)):
    with Session(engine) as s:
        prof = s.scalars(
            select(Base.classes.professores)
            .where(Base.classes.professores.id_usuarios == int(usuario["id"]))
        ).first()

        if not prof:
            raise HTTPException(status_code=404, detail="Professor não encontrado")

        disc = s.scalars(
            select(Base.classes.disciplinas)
            .where(Base.classes.disciplinas.nome_disciplina == disciplina)
            .where(Base.classes.disciplinas.id_professores == prof.id_professores)
        ).first()

        if not disc:
            raise HTTPException(status_code=403, detail="Disciplina não encontrada ou não pertence a este professor")

        turma_obj = s.scalars(
            select(Base.classes.turmas)
            .where(Base.classes.turmas.nome_turma == turma)
            .where(Base.classes.turmas.id_turmas == disc.id_turmas)  
        ).first()

        if not turma_obj:
            raise HTTPException(status_code=404, detail="Turma não encontrada para esta disciplina")

        turma_alunos = s.scalars(
            select(Base.classes.turma_alunos)
            .where(Base.classes.turma_alunos.id_turmas == turma_obj.id_turmas)
        ).all()

        alunos = []
        for ta in turma_alunos:
            aluno = s.scalars(
                select(Base.classes.alunos).where(Base.classes.alunos.id_alunos == ta.id_alunos)
            ).first()
            usuario_aluno = s.scalars(
                select(Base.classes.usuarios).where(Base.classes.usuarios.id_usuarios == aluno.id_usuarios)
            ).first()
            alunos.append({"nome": usuario_aluno.nome_usuarios})

        return alunos

@app.get("/aluno/disciplinas")
def listar_disciplinas_do_aluno(usuario = Depends(get_usuario_logado)):
    if usuario["tipo"] != "Aluno":
        raise HTTPException(status_code=403, detail="Apenas alunos podem acessar")

    with Session(engine) as s:
        aluno = s.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == int(usuario["id"]))
        ).first()
        if not aluno:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")

        turmas_ids = s.scalars(
            select(Base.classes.turma_alunos.id_turmas)
            .where(Base.classes.turma_alunos.id_alunos == aluno.id_alunos)
        ).all()

        disciplinas = s.scalars(
            select(Base.classes.disciplinas)
            .where(Base.classes.disciplinas.id_turmas.in_(turmas_ids))
        ).all()

        return [d.nome_disciplina for d in disciplinas]
    
@app.get("/aluno/presencas")
def listar_presencas(disciplina: str, usuario = Depends(get_usuario_logado)):
    if usuario["tipo"] != "Aluno":
        raise HTTPException(status_code=403, detail="Apenas alunos podem acessar")

    with Session(engine) as s:
        aluno = s.scalars(
            select(Base.classes.alunos).where(Base.classes.alunos.id_usuarios == int(usuario["id"]))
        ).first()
        if not aluno:
            raise HTTPException(status_code=404, detail="Aluno não encontrado")

        disciplina_BD = s.scalars(
            select(Base.classes.disciplinas).where(Base.classes.disciplinas.nome_disciplina == disciplina)
        ).first()
        if not disciplina_BD:
            raise HTTPException(status_code=404, detail="Disciplina não encontrada")

        presencas = s.scalars(
            select(Base.classes.presencas)
            .where(Base.classes.presencas.id_alunos == aluno.id_alunos)
            .where(Base.classes.presencas.id_disciplinas == disciplina_BD.id_disciplinas)
        ).all()

        return [{
            "data": str(p.data),
            "presente": p.presente,
            "justificativa": p.justificativa
        } for p in presencas]
    
@app.get("/escolacoordenador/")
def get_dados_coordenador(usuario=Depends(somente_coordenador)):
    with Session(engine) as s:
        coordenador = s.scalars(
            select(Base.classes.coordenadores).where(Base.classes.coordenadores.id_usuarios == usuario["id"])
        ).first()
        if not coordenador:
            raise HTTPException(404, "Coordenador não encontrado")

        escola = s.scalars(
            select(Base.classes.escolas).where(Base.classes.escolas.id_escolas == coordenador.id_escolas)
        ).first()
        if not escola:
            raise HTTPException(404, "Escola vinculada não encontrada")

        usuario_BD = s.scalars(
            select(Base.classes.usuarios).where(Base.classes.usuarios.id_usuarios == coordenador.id_usuarios)
        ).first()

        return {
            "nome_coordenador": usuario_BD.nome_usuarios,
            "escola": escola.nome,
            "id_escola": escola.id_escolas
        }


@app.get("/professor/perfil")
def perfil_professor(usuario=Depends(somente_professor)):
    with Session(engine) as s:
        prof = s.scalars(
            select(Base.classes.professores)
            .where(Base.classes.professores.id_usuarios == int(usuario["id"]))
        ).first()
        if not prof:
            raise HTTPException(404, "Professor não encontrado")
        return {
            "id_professores": prof.id_professores,
            "nome": prof.nome_usuarios,
            "id_escola": prof.id_escolas
        }
    
@app.get("/coordenador/professores/", status_code=status.HTTP_200_OK)
def listar_professores_coordenador(usuario=Depends(somente_coordenador)):
    with Session(engine) as s:
        coord = s.scalars(
            select(Base.classes.coordenadores)
            .where(Base.classes.coordenadores.id_usuarios == int(usuario["id"]))
        ).first()
        if not coord:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coordenador não encontrado no banco"
            )

        professores = s.execute(
            select(
                Base.classes.professores.id_professores,
                Base.classes.usuarios.nome_usuarios,
                Base.classes.usuarios.email
            )
            .join(
                Base.classes.usuarios,
                Base.classes.usuarios.id_usuarios == Base.classes.professores.id_usuarios
            )
            .where(Base.classes.professores.id_escolas == coord.id_escolas)
        ).all()

        return [
            {
                "id_professor": row.id_professores,
                "nome": row.nome_usuarios,
                "email": row.email
            }
            for row in professores
        ]