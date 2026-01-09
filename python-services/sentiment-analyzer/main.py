"""
Sentiment Analysis микросервис на FastAPI
"""
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from sentiment_analyzer import SentimentAnalyzer

# Создание приложения FastAPI
app = FastAPI(
    title="Sentiment Analysis API",
    description="NLP микросервис для анализа настроений криптовалютных новостей",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация анализатора
analyzer = SentimentAnalyzer()


class AnalyzeRequest(BaseModel):
    """Запрос на анализ"""
    text: str = Field(..., description="Текст для анализа")
    type: Optional[str] = Field("news", description="Тип контента: news, social, other")


class EntityInfo(BaseModel):
    """Информация о сущности"""
    text: str
    type: str
    start: int
    end: int


class AnalyzeResponse(BaseModel):
    """Ответ с результатами анализа"""
    sentiment: float = Field(..., description="Оценка настроения от -1 (negative) до 1 (positive)")
    confidence: float = Field(..., description="Уверенность модели (0-1)")
    label: str = Field(..., description="Метка класса: positive, negative, neutral")
    entities: List[EntityInfo] = Field(default_factory=list, description="Извлеченные сущности")
    impact: str = Field(..., description="Уровень важности: high, medium, low")
    keywords: List[str] = Field(default_factory=list, description="Ключевые слова")
    processing_time: float = Field(..., description="Время обработки в мс")


@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    print("🚀 Starting Sentiment Analysis API...")
    print("📊 Loading models...")
    # Модели загружаются в конструкторе SentimentAnalyzer
    print("✅ Models loaded successfully")


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": "Sentiment Analysis API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "model": analyzer.model_name,
        "spacy_model": analyzer.nlp.meta["name"]
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest):
    """
    Анализ текста на настроения

    Args:
        request: Запрос с текстом для анализа

    Returns:
        AnalyzeResponse: Результаты анализа
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        start_time = time.time()

        # Анализ текста
        result = analyzer.analyze(request.text, content_type=request.type)

        processing_time = (time.time() - start_time) * 1000  # В миллисекундах

        return AnalyzeResponse(
            sentiment=result["sentiment"],
            confidence=result["confidence"],
            label=result["label"],
            entities=[EntityInfo(**entity) for entity in result["entities"]],
            impact=result["impact"],
            keywords=result["keywords"],
            processing_time=processing_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/batch", response_model=List[AnalyzeResponse])
async def batch_analyze(requests: List[AnalyzeRequest]):
    """
    Батч-анализ нескольких текстов

    Args:
        requests: Список запросов

    Returns:
        List[AnalyzeResponse]: Список результатов
    """
    if not requests:
        raise HTTPException(status_code=400, detail="Request list cannot be empty")

    if len(requests) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 texts per batch")

    results = []
    for req in requests:
        try:
            start_time = time.time()
            result = analyzer.analyze(req.text, content_type=req.type or "news")
            processing_time = (time.time() - start_time) * 1000

            results.append(AnalyzeResponse(
                sentiment=result["sentiment"],
                confidence=result["confidence"],
                label=result["label"],
                entities=[EntityInfo(**entity) for entity in result["entities"]],
                impact=result["impact"],
                keywords=result["keywords"],
                processing_time=processing_time
            ))
        except Exception as e:
            # При ошибке возвращаем нейтральный результат
            results.append(AnalyzeResponse(
                sentiment=0.0,
                confidence=0.0,
                label="neutral",
                entities=[],
                impact="low",
                keywords=[],
                processing_time=0.0
            ))

    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
