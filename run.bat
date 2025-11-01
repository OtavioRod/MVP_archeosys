python -m venv .venv

call .venv\Scripts\activate.bat

REM Install dependencies using Poetry
poetry install

<<<<<<< Updated upstream
REM Run FastAPI app using Poetry
poetry run fastapi dev mvp_archeosys/app.py
=======
start http://localhost:8000/app/login.html

python -m poetry install
python -m poetry run fastapi dev mvp_archeosys/app.py

pause
>>>>>>> Stashed changes
