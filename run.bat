REM .venv\Scripts\activate.bat
REM poetry install
REM poetry run fastapi dev mvp_archeosys/app.py

call .venv\Scripts\activate.bat

REM Install dependencies using Poetry
poetry install

REM Run FastAPI app using Poetry
poetry run fastapi dev mvp_archeosys/app.py