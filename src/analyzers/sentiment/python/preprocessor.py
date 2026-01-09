"""
Text preprocessing utilities
"""
import re
from typing import List, Set
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

# Download required NLTK data (will be cached)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)


class TextPreprocessor:
    """Text preprocessing for sentiment analysis"""

    def __init__(self):
        self.stop_words: Set[str] = set(stopwords.words('english'))
        # Keep some important words for financial context
        self.keep_words = {'up', 'down', 'above', 'below', 'against', 'not', 'no'}
        self.stop_words -= self.keep_words

    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text

        Args:
            text: Input text

        Returns:
            Cleaned text
        """
        # Convert to lowercase
        text = text.lower()

        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)

        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)

        # Remove leading/trailing whitespace
        text = text.strip()

        return text

    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """
        Extract keywords from text

        Args:
            text: Input text
            top_n: Number of top keywords to extract

        Returns:
            List of keywords
        """
        # Clean and tokenize
        cleaned_text = self.clean_text(text)
        tokens = word_tokenize(cleaned_text)

        # Filter tokens
        keywords = [
            token for token in tokens
            if token.isalnum() and len(token) > 2 and token not in self.stop_words
        ]

        # Count frequency
        from collections import Counter
        word_freq = Counter(keywords)

        # Return top keywords
        return [word for word, _ in word_freq.most_common(top_n)]

    def normalize_for_model(self, text: str, max_length: int = 512) -> str:
        """
        Normalize text for model input

        Args:
            text: Input text
            max_length: Maximum length for model

        Returns:
            Normalized text
        """
        # Clean text
        text = self.clean_text(text)

        # Truncate if too long (rough approximation, tokenizer will do final truncation)
        if len(text) > max_length * 4:  # Approximate 4 chars per token
            text = text[:max_length * 4]

        return text

    def contains_crypto_terms(self, text: str) -> bool:
        """
        Check if text contains cryptocurrency-related terms

        Args:
            text: Input text

        Returns:
            True if crypto terms found
        """
        crypto_terms = {
            'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
            'blockchain', 'defi', 'nft', 'token', 'coin', 'altcoin',
            'mining', 'wallet', 'exchange', 'trading'
        }

        text_lower = text.lower()
        return any(term in text_lower for term in crypto_terms)
