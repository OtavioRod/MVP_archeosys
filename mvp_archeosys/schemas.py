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


