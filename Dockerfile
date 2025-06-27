FROM python:3.12-slim

ENV POETRY_VERSION=2.1.3 \
    PYTHONUNBUFFERED=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

RUN apt-get update && apt-get install -y curl build-essential libpq-dev

RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s ~/.local/bin/poetry /usr/local/bin/poetry

# Set working directory
WORKDIR /app

ENV PYTHONPATH=/app

# Copy only necessary files for installing dependencies
COPY pyproject.toml poetry.lock* /app/
RUN poetry install --no-root

# ✅ Now copy EVERYTHING into /app
COPY . /app

# Optional: Copy wait-for-it again in case it's overwritten
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

EXPOSE 8000

CMD ["uvicorn", "mvp_archeosys.app:app", "--host", "0.0.0.0", "--port", "8000"]




#FROM python:3.12-slim
#
#ENV POETRY_VERSION=2.1.3 \
#    PYTHONUNBUFFERED=1 \
#    POETRY_NO_INTERACTION=1 \
#    POETRY_VIRTUALENVS_CREATE=false
#
#RUN apt-get update && apt-get install -y curl build-essential libpq-dev
#
#RUN curl -sSL https://install.python-poetry.org | python3 - && \
#    ln -s ~/.local/bin/poetry /usr/local/bin/poetry
#
#WORKDIR /app
#
#COPY pyproject.toml poetry.lock* /app/
#RUN poetry install --no-root
#
#
#COPY . /app
#
#
#COPY wait-for-it.sh /wait-for-it.sh
#RUN chmod +x /wait-for-it.sh
#
#EXPOSE 8000
#
#CMD ["uvicorn", "mvp_archeosys.app:app", "--host", "0.0.0.0", "--port", "8000"]






#FROM python:3.12-slim
#
#ENV POETRY_VERSION=2.1.3 \
#    PYTHONUNBUFFERED=1 \
#    POETRY_NO_INTERACTION=1 \
#    POETRY_VIRTUALENVS_CREATE=false
#
#RUN apt-get update && apt-get install -y curl build-essential libpq-dev
#
#RUN curl -sSL https://install.python-poetry.org | python3 - && \
#    ln -s ~/.local/bin/poetry /usr/local/bin/poetry
#
#WORKDIR /app
#
#COPY Frontend ./Frontend
#
## Copy the wait-for-it script into the image
#COPY wait-for-it.sh /wait-for-it.sh
#
## Make it executable inside the container
#RUN chmod +x /wait-for-it.sh
#
#COPY pyproject.toml poetry.lock* /app/
#RUN poetry install --no-root
#
#COPY . /app
#
#EXPOSE 8000
#
#CMD ["uvicorn", "mvp_archeosys.app:app", "--host", "0.0.0.0", "--port", "8000"]
