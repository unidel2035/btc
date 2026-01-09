"""
FastAPI application for sentiment analysis service
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .models import (
    AnalyzeRequest, AnalyzeResponse,
    BatchAnalyzeRequest, BatchAnalyzeResponse,
    HealthResponse
)
from .analyzer import SentimentAnalyzer
from .config import HOST, PORT, DEBUG, API_TITLE, API_VERSION, API_DESCRIPTION


# Global analyzer instance
analyzer = SentimentAnalyzer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup: Load ML models
    print("Starting sentiment analysis service...")
    analyzer.load_models()
    print("Service ready!")
    yield
    # Shutdown: Cleanup if needed
    print("Shutting down sentiment analysis service...")


# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check"""
    return {
        "status": "running",
        "models_loaded": analyzer.models_loaded(),
        "version": API_VERSION
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy" if analyzer.models_loaded() else "initializing",
        "models_loaded": analyzer.models_loaded(),
        "version": API_VERSION
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest):
    """
    Analyze sentiment of a single text

    Args:
        request: AnalyzeRequest with text and type

    Returns:
        AnalyzeResponse with sentiment analysis results

    Example:
        ```json
        {
          "text": "Bitcoin surges 10% after ETF approval",
          "type": "news"
        }
        ```

    Response:
        ```json
        {
          "sentiment": 0.85,
          "confidence": 0.92,
          "label": "positive",
          "entities": ["Bitcoin", "ETF"],
          "impact": "high",
          "keywords": ["surge", "approval"]
        }
        ```
    """
    try:
        if not analyzer.models_loaded():
            raise HTTPException(
                status_code=503,
                detail="Models are still loading. Please try again in a few moments."
            )

        result = analyzer.analyze(request.text, request.type)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/analyze/batch", response_model=BatchAnalyzeResponse)
async def analyze_batch(request: BatchAnalyzeRequest):
    """
    Analyze sentiment of multiple texts in batch

    Args:
        request: BatchAnalyzeRequest with list of texts and type

    Returns:
        BatchAnalyzeResponse with list of analysis results

    Example:
        ```json
        {
          "texts": [
            "Bitcoin surges 10% after ETF approval",
            "Ethereum price crashes on security concerns"
          ],
          "type": "news"
        }
        ```
    """
    try:
        if not analyzer.models_loaded():
            raise HTTPException(
                status_code=503,
                detail="Models are still loading. Please try again in a few moments."
            )

        results = analyzer.analyze_batch(request.texts, request.type)

        return {
            "results": results,
            "processed": len(results)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch analysis failed: {str(e)}"
        )


def main():
    """Run the FastAPI server"""
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info"
    )


if __name__ == "__main__":
    main()
