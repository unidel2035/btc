"""
Pydantic models for API request/response
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Request model for sentiment analysis"""
    text: str = Field(..., description="Text to analyze", min_length=1, max_length=10000)
    type: Literal["news", "social", "article"] = Field(
        default="news",
        description="Type of content being analyzed"
    )


class AnalyzeResponse(BaseModel):
    """Response model for sentiment analysis"""
    sentiment: float = Field(
        ...,
        description="Sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)",
        ge=-1.0,
        le=1.0
    )
    confidence: float = Field(
        ...,
        description="Confidence score (0 to 1)",
        ge=0.0,
        le=1.0
    )
    entities: List[str] = Field(
        default_factory=list,
        description="Extracted entities (cryptocurrencies, companies, people)"
    )
    impact: Literal["low", "medium", "high"] = Field(
        ...,
        description="Impact level of the news"
    )
    keywords: List[str] = Field(
        default_factory=list,
        description="Key words and phrases extracted from text"
    )
    label: Literal["positive", "negative", "neutral"] = Field(
        ...,
        description="Sentiment label"
    )


class BatchAnalyzeRequest(BaseModel):
    """Request model for batch sentiment analysis"""
    texts: List[str] = Field(
        ...,
        description="List of texts to analyze",
        min_items=1,
        max_items=100
    )
    type: Literal["news", "social", "article"] = Field(
        default="news",
        description="Type of content being analyzed"
    )


class BatchAnalyzeResponse(BaseModel):
    """Response model for batch sentiment analysis"""
    results: List[AnalyzeResponse] = Field(
        ...,
        description="List of analysis results"
    )
    processed: int = Field(
        ...,
        description="Number of texts processed"
    )


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    models_loaded: bool = Field(..., description="Whether ML models are loaded")
    version: str = Field(..., description="API version")
