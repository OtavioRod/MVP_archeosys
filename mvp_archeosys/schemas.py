from pydantic import BaseModel, EmailStr
from fastapi import Form

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
    escola: str

class AlunoCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    escola: str

class TurmaCreate(BaseModel):
    nome_turma: str
    horario: str
    serie: str
    turno: str
    escola: str

class AlunoTurmaCreate(BaseModel):
    aluno: str
    turma: str

class DisciplinaCreate(BaseModel):
    nome: str
    turma: str
    professor: str

class PresencaCreate(BaseModel):
    aluno: str
    disciplina: str
    presente: bool
    justificativa: str

class SecretariaCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str








