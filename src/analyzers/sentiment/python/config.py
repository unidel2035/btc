"""
Configuration for sentiment analysis service
"""
import os
from typing import Optional

# Server configuration
HOST = os.getenv("SENTIMENT_HOST", "0.0.0.0")
PORT = int(os.getenv("SENTIMENT_PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Model configuration
SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "ProsusAI/finbert")
NER_MODEL = os.getenv("NER_MODEL", "en_core_web_sm")

# Performance configuration
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "512"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))
DEVICE = os.getenv("DEVICE", "cpu")  # cpu or cuda

# Impact score weights
WEIGHT_SENTIMENT = float(os.getenv("WEIGHT_SENTIMENT", "0.4"))
WEIGHT_ENTITIES = float(os.getenv("WEIGHT_ENTITIES", "0.3"))
WEIGHT_KEYWORDS = float(os.getenv("WEIGHT_KEYWORDS", "0.3"))

# Keywords for impact analysis
HIGH_IMPACT_KEYWORDS = [
    "crash", "surge", "pump", "dump", "hack", "regulation",
    "ban", "approved", "etf", "adoption", "partnership",
    "launch", "upgrade", "fork", "halving", "attack"
]

CRYPTO_ENTITIES = [
    "bitcoin", "btc", "ethereum", "eth", "binance", "coinbase",
    "tether", "usdt", "cardano", "ada", "solana", "sol",
    "ripple", "xrp", "dogecoin", "doge", "polkadot", "dot"
]

# API Configuration
API_TITLE = "Sentiment Analysis API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
NLP-based sentiment analysis service for cryptocurrency news and social media content.

Features:
- Sentiment classification (positive/negative/neutral)
- Named Entity Recognition (cryptocurrencies, companies, people)
- Impact score calculation
- Keyword extraction
"""
