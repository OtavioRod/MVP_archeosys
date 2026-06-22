py -3.13 -m pip install poetry

poetry env use 3.13
poetry install

poetry run fastapi dev mvp_archeosys/app.py
pause