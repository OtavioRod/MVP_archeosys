from pydantic import BaseModel, EmailStr
from fastapi import Form
from typing import Optional

class LoginUsuario:
    def __init__(self, email: EmailStr = Form(...), senha: str = Form(...)):
        self.email = email
        self.senha = senha

class EscolaCreate(BaseModel):
    nome: str
    endereco: str

class DiretorCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    escola: str

class CoordenadorCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    escola: str

class CoordenadorDelete(BaseModel):
    email: EmailStr

class CoordenadorUpdate(BaseModel):
    email_atual: EmailStr
    novo_nome: str
    novo_email: EmailStr
    novo_senha: str

class ProfessorCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    id_escola: int

class AlunoCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    id_escola: int

class TurmaCreate(BaseModel):
    nome_turma: str
    horario: str
    serie: str
    turno: str
    id_escola: int
    #escola: str

class AlunoTurmaCreate(BaseModel):
    aluno: str
    turma: str

class DisciplinaCreate(BaseModel):
    nome: str
    turma: str
    id_professor: int

class PresencaCreate(BaseModel):
    aluno: str
    disciplina: str
    presente: bool
    justificativa: Optional[str] = None

class SecretariaCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str

class NotasCreate(BaseModel):
    aluno: str
    disciplina: str
    bimestre: int
    nota: float

class RelatorioAula(BaseModel):
    professor: str
    disciplina: str
    conteudo: Optional[str] = ""
    metodologia: Optional[str] = ""
    recursos: Optional[str] = ""


class NotasDelete(BaseModel):
    aluno: str

class AtualizarSecretariaEscola(BaseModel):
    id_escola: int
    novo_nome: str
    novo_endereco: str

class DeletarEscola(BaseModel):
    id_escola: int

class AtualizarDiretor(BaseModel):
    id_diretor: int
    novo_nome: str
    novo_email: EmailStr

class AtualizarTurma(BaseModel):
    id_turma: int
    novo_nome_turma: str
    novo_horario: str
    nova_serie: str
    novo_turno: str

class AtualizarProfessor(BaseModel):
    id_professor: int
    email_atual: EmailStr
    novo_nome: str
    novo_email: EmailStr

class DeletarProfessor(BaseModel):
    id_professor: int

class AtualizarAluno(BaseModel):
    id_aluno: int
    email_atual: EmailStr
    novo_nome: str
    novo_email: EmailStr

class DeletarAluno(BaseModel):
    id_aluno: int

class AtualizarDisciplina(BaseModel):
    id_disciplina: int
    novo_nome: str

class DeletarDisciplina(BaseModel):
    id_disciplina: int

class DeletarTurma(BaseModel):
    id_turma: int

#for (const presenca of presencas) {
#      await fetch("http://localhost:8000/presenca/", {
#        method: "PUT",
#        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
#        body: JSON.stringify(presenca),
#      });
#    }
class CriarPresenca(BaseModel):
    aluno: str
    disciplina: str
    presente: bool
    justificativa: Optional[str] = None

class AtualizarPresenca(BaseModel):
    id_presenca: int
    presente: bool
    justificativa: Optional[str] = None

class DeletarPresenca(BaseModel):
    id_presenca: int

class AtualizarNota(BaseModel):
    id_nota: int
    nova_nota: float

class DeletarNota(BaseModel):
    id_nota: int

class AtualizarJustificativa(BaseModel):
    id_presenca: int
    nova_justificativa: str

class DeletarJustificativa(BaseModel):
    id_presenca: int

class AtualizarRelatorioAula(BaseModel):
    id_relatorio: int
    novo_conteudo: Optional[str] = ""
    nova_metodologia: Optional[str] = ""
    novos_recursos: Optional[str] = ""

class DeletarRelatorioAula(BaseModel):
    id_relatorio: int

