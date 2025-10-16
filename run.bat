python -m venv .venv

call .venv\Scripts\activate.bat

REM Install dependencies using Poetry
poetry install

REM Run FastAPI app using Poetry
poetry run fastapi dev mvp_archeosys/app.py

pause
