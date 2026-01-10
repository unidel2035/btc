FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Загрузка spaCy модели с повторными попытками и тайм-аутом
RUN python -m spacy download en_core_web_sm || \
    (sleep 5 && python -m spacy download en_core_web_sm) || \
    echo "Warning: spaCy model download failed, will be downloaded at runtime"

# Копирование кода приложения
COPY . .

# Порт для FastAPI
EXPOSE 8000

# Запуск сервиса
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
