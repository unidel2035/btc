"""
Sentiment analysis and NER implementation
"""
from typing import List, Dict, Tuple, Optional
import re
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import spacy
from spacy.tokens import Doc

from .preprocessor import TextPreprocessor
from .config import (
    SENTIMENT_MODEL, NER_MODEL, MAX_LENGTH, DEVICE,
    HIGH_IMPACT_KEYWORDS, CRYPTO_ENTITIES,
    WEIGHT_SENTIMENT, WEIGHT_ENTITIES, WEIGHT_KEYWORDS
)


class SentimentAnalyzer:
    """
    Sentiment analysis using FinBERT or similar financial models
    """

    def __init__(self):
        self.preprocessor = TextPreprocessor()
        self.device = DEVICE
        self.model = None
        self.tokenizer = None
        self.nlp = None
        self._models_loaded = False

    def load_models(self) -> None:
        """Load ML models"""
        if self._models_loaded:
            return

        print(f"Loading sentiment model: {SENTIMENT_MODEL}")
        self.tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL)
        self.model = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL)
        self.model.to(self.device)
        self.model.eval()

        print(f"Loading NER model: {NER_MODEL}")
        try:
            self.nlp = spacy.load(NER_MODEL)
        except OSError:
            print(f"spaCy model {NER_MODEL} not found. Downloading...")
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", NER_MODEL], check=True)
            self.nlp = spacy.load(NER_MODEL)

        self._models_loaded = True
        print("All models loaded successfully")

    def models_loaded(self) -> bool:
        """Check if models are loaded"""
        return self._models_loaded

    def classify_sentiment(self, text: str) -> Tuple[float, float, str]:
        """
        Classify sentiment of text

        Args:
            text: Input text

        Returns:
            Tuple of (sentiment_score, confidence, label)
            - sentiment_score: -1 (negative) to 1 (positive)
            - confidence: 0 to 1
            - label: 'positive', 'negative', or 'neutral'
        """
        if not self._models_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        # Preprocess text
        cleaned_text = self.preprocessor.normalize_for_model(text, MAX_LENGTH)

        # Tokenize
        inputs = self.tokenizer(
            cleaned_text,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH,
            padding=True
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Get predictions
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)

        # FinBERT outputs: [positive, negative, neutral]
        probs_list = probs[0].cpu().tolist()

        # Get label and confidence
        max_prob_idx = probs.argmax().item()
        confidence = float(probs[0][max_prob_idx])

        # Map to sentiment score (-1 to 1)
        # FinBERT: idx 0=positive, 1=negative, 2=neutral
        if max_prob_idx == 0:  # positive
            sentiment_score = probs_list[0] - probs_list[1]
            label = "positive"
        elif max_prob_idx == 1:  # negative
            sentiment_score = probs_list[0] - probs_list[1]
            label = "negative"
        else:  # neutral
            sentiment_score = probs_list[0] - probs_list[1]
            label = "neutral"

        # Normalize to -1 to 1 range
        sentiment_score = max(-1.0, min(1.0, sentiment_score))

        return sentiment_score, confidence, label

    def extract_entities(self, text: str) -> List[str]:
        """
        Extract named entities (cryptocurrencies, companies, people)

        Args:
            text: Input text

        Returns:
            List of unique entities
        """
        if not self._models_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        entities = []

        # Use spaCy NER
        doc = self.nlp(text)
        for ent in doc.ents:
            if ent.label_ in ["ORG", "PERSON", "PRODUCT", "GPE", "MONEY"]:
                entities.append(ent.text)

        # Extract known crypto entities using regex
        text_lower = text.lower()
        for crypto in CRYPTO_ENTITIES:
            pattern = r'\b' + re.escape(crypto) + r'\b'
            if re.search(pattern, text_lower):
                # Add capitalized version if not already present
                crypto_cap = crypto.upper() if len(crypto) <= 4 else crypto.capitalize()
                if crypto_cap not in entities:
                    entities.append(crypto_cap)

        # Remove duplicates while preserving order
        seen = set()
        unique_entities = []
        for entity in entities:
            entity_lower = entity.lower()
            if entity_lower not in seen:
                seen.add(entity_lower)
                unique_entities.append(entity)

        return unique_entities

    def calculate_impact(
        self,
        text: str,
        sentiment_score: float,
        entities: List[str],
        keywords: List[str]
    ) -> str:
        """
        Calculate impact level of news

        Args:
            text: Original text
            sentiment_score: Sentiment score from classification
            entities: Extracted entities
            keywords: Extracted keywords

        Returns:
            Impact level: 'low', 'medium', or 'high'
        """
        impact_score = 0.0

        # 1. Sentiment intensity (40%)
        sentiment_intensity = abs(sentiment_score)
        impact_score += sentiment_intensity * WEIGHT_SENTIMENT

        # 2. Entity count and importance (30%)
        entity_score = min(len(entities) / 5.0, 1.0)  # Normalize to max 5 entities
        impact_score += entity_score * WEIGHT_ENTITIES

        # 3. High-impact keywords (30%)
        text_lower = text.lower()
        keyword_matches = sum(
            1 for keyword in HIGH_IMPACT_KEYWORDS
            if keyword in text_lower
        )
        keyword_score = min(keyword_matches / 3.0, 1.0)  # Normalize to max 3 keywords
        impact_score += keyword_score * WEIGHT_KEYWORDS

        # Determine impact level
        if impact_score >= 0.7:
            return "high"
        elif impact_score >= 0.4:
            return "medium"
        else:
            return "low"

    def analyze(self, text: str, content_type: str = "news") -> Dict:
        """
        Perform complete sentiment analysis

        Args:
            text: Input text
            content_type: Type of content ('news', 'social', 'article')

        Returns:
            Dictionary with analysis results
        """
        if not self._models_loaded:
            raise RuntimeError("Models not loaded. Call load_models() first.")

        # 1. Sentiment classification
        sentiment_score, confidence, label = self.classify_sentiment(text)

        # 2. Extract entities
        entities = self.extract_entities(text)

        # 3. Extract keywords
        keywords = self.preprocessor.extract_keywords(text, top_n=10)

        # 4. Calculate impact
        impact = self.calculate_impact(text, sentiment_score, entities, keywords)

        return {
            "sentiment": round(sentiment_score, 4),
            "confidence": round(confidence, 4),
            "label": label,
            "entities": entities,
            "impact": impact,
            "keywords": keywords[:5]  # Return top 5 keywords
        }

    def analyze_batch(self, texts: List[str], content_type: str = "news") -> List[Dict]:
        """
        Analyze multiple texts

        Args:
            texts: List of texts to analyze
            content_type: Type of content

        Returns:
            List of analysis results
        """
        return [self.analyze(text, content_type) for text in texts]
