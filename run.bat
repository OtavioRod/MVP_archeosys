python -m venv .venv
call .venv\Scripts\activate.bat

REM Instala Poetry dentro do venv
python -m pip install --upgrade pip
python -m pip install poetry

start http://localhost:8000/app/login.html

REM Agora você pode usar
python -m poetry install
python -m poetry run fastapi dev mvp_archeosys/app.py

pause
