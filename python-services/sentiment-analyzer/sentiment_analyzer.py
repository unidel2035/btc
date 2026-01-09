"""
Sentiment Analyzer - основная логика анализа
"""
import re
from typing import Dict, List, Any
import spacy
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification


class SentimentAnalyzer:
    """
    Анализатор настроений для криптовалютных текстов
    """

    def __init__(self, model_name: str = "ProsusAI/finbert"):
        """
        Инициализация анализатора

        Args:
            model_name: Название модели для sentiment analysis
        """
        self.model_name = model_name

        # Загрузка модели FinBERT для финансовых текстов
        print(f"Loading sentiment model: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=self.model,
            tokenizer=self.tokenizer,
            top_k=None
        )

        # Загрузка spaCy модели для NER
        print("Loading spaCy model for NER")
        self.nlp = spacy.load("en_core_web_sm")

        # Словарь криптовалют для entity extraction
        self.crypto_keywords = {
            'bitcoin', 'btc', 'ethereum', 'eth', 'cryptocurrency', 'crypto',
            'binance', 'coinbase', 'blockchain', 'defi', 'nft', 'web3',
            'solana', 'sol', 'cardano', 'ada', 'ripple', 'xrp', 'dogecoin',
            'doge', 'polkadot', 'dot', 'avalanche', 'avax', 'polygon', 'matic',
            'litecoin', 'ltc', 'chainlink', 'link', 'uniswap', 'uni',
            'usdt', 'usdc', 'stablecoin', 'altcoin', 'token', 'coin'
        }

        # Ключевые слова для impact scoring
        self.high_impact_keywords = {
            'hack', 'breach', 'crash', 'surge', 'skyrocket', 'plunge',
            'collapse', 'approval', 'regulation', 'ban', 'adoption',
            'partnership', 'launch', 'etf', 'sec', 'breaking', 'alert'
        }

        self.medium_impact_keywords = {
            'rise', 'fall', 'gain', 'loss', 'growth', 'decline',
            'update', 'upgrade', 'development', 'announce', 'report'
        }

    def preprocess_text(self, text: str) -> str:
        """
        Предобработка текста

        Args:
            text: Исходный текст

        Returns:
            Обработанный текст
        """
        # Удаление лишних пробелов
        text = re.sub(r'\s+', ' ', text).strip()

        # Удаление HTML тегов
        text = re.sub(r'<[^>]+>', '', text)

        # Удаление URL
        text = re.sub(r'http\S+|www\.\S+', '', text)

        # Удаление email
        text = re.sub(r'\S+@\S+', '', text)

        return text

    def classify_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Классификация настроений

        Args:
            text: Текст для анализа

        Returns:
            Dict с sentiment, confidence, label
        """
        # Предобработка
        clean_text = self.preprocess_text(text)

        # Ограничение длины текста для модели (512 токенов)
        if len(clean_text) > 500:
            clean_text = clean_text[:500]

        # Анализ с помощью FinBERT
        results = self.sentiment_pipeline(clean_text)[0]

        # Преобразование результатов FinBERT
        sentiment_map = {
            'positive': 1.0,
            'negative': -1.0,
            'neutral': 0.0
        }

        # Находим результат с максимальной уверенностью
        max_result = max(results, key=lambda x: x['score'])
        label = max_result['label'].lower()
        confidence = max_result['score']

        # Нормализуем sentiment score
        sentiment = sentiment_map.get(label, 0.0)

        # Более тонкая настройка sentiment на основе уверенности
        if label != 'neutral':
            sentiment = sentiment * confidence

        return {
            'sentiment': sentiment,
            'confidence': confidence,
            'label': label
        }

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Извлечение сущностей (криптовалюты, компании, люди)

        Args:
            text: Текст для анализа

        Returns:
            Список сущностей
        """
        doc = self.nlp(text)
        entities = []

        # Извлечение сущностей с помощью spaCy
        for ent in doc.ents:
            entity_type = self._map_entity_type(ent.label_, ent.text.lower())
            entities.append({
                'text': ent.text,
                'type': entity_type,
                'start': ent.start_char,
                'end': ent.end_char
            })

        # Дополнительное извлечение криптовалютных терминов
        text_lower = text.lower()
        for crypto in self.crypto_keywords:
            # Ищем целые слова (word boundaries)
            pattern = r'\b' + re.escape(crypto) + r'\b'
            for match in re.finditer(pattern, text_lower, re.IGNORECASE):
                # Проверяем, не дублируется ли
                if not any(e['start'] == match.start() for e in entities):
                    entities.append({
                        'text': text[match.start():match.end()],
                        'type': 'cryptocurrency',
                        'start': match.start(),
                        'end': match.end()
                    })

        return entities

    def _map_entity_type(self, spacy_label: str, text: str) -> str:
        """
        Маппинг типов сущностей spaCy на наши типы

        Args:
            spacy_label: Метка spaCy
            text: Текст сущности

        Returns:
            Тип сущности
        """
        # Проверяем, является ли текст криптовалютой
        if text in self.crypto_keywords:
            return 'cryptocurrency'

        # Маппинг меток spaCy
        if spacy_label in ['PERSON']:
            return 'person'
        elif spacy_label in ['ORG']:
            # Проверяем, является ли биржей
            if any(exchange in text for exchange in ['binance', 'coinbase', 'kraken', 'bybit']):
                return 'exchange'
            return 'company'
        elif spacy_label in ['PRODUCT']:
            return 'cryptocurrency'

        return 'organization'

    def calculate_impact(self, text: str, sentiment: float, entities: List[Dict]) -> str:
        """
        Расчет важности новости (impact score)

        Args:
            text: Текст
            sentiment: Оценка настроений
            entities: Извлеченные сущности

        Returns:
            Уровень важности: high, medium, low
        """
        text_lower = text.lower()
        score = 0

        # High impact keywords
        for keyword in self.high_impact_keywords:
            if keyword in text_lower:
                score += 3

        # Medium impact keywords
        for keyword in self.medium_impact_keywords:
            if keyword in text_lower:
                score += 1

        # Сильные sentiment = более важная новость
        if abs(sentiment) > 0.7:
            score += 2
        elif abs(sentiment) > 0.4:
            score += 1

        # Наличие криптовалютных entities повышает важность
        crypto_entities = [e for e in entities if e['type'] == 'cryptocurrency']
        if len(crypto_entities) >= 3:
            score += 2
        elif len(crypto_entities) >= 1:
            score += 1

        # Определение уровня
        if score >= 5:
            return 'high'
        elif score >= 2:
            return 'medium'
        else:
            return 'low'

    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """
        Извлечение ключевых слов

        Args:
            text: Текст
            top_n: Количество ключевых слов

        Returns:
            Список ключевых слов
        """
        doc = self.nlp(text.lower())

        # Извлекаем существительные, прилагательные и глаголы
        keywords = []
        for token in doc:
            if (token.pos_ in ['NOUN', 'ADJ', 'VERB'] and
                not token.is_stop and
                not token.is_punct and
                len(token.text) > 2):
                keywords.append(token.text)

        # Удаляем дубликаты, сохраняя порядок
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)

        return unique_keywords[:top_n]

    def analyze(self, text: str, content_type: str = "news") -> Dict[str, Any]:
        """
        Полный анализ текста

        Args:
            text: Текст для анализа
            content_type: Тип контента (news, social, other)

        Returns:
            Полный результат анализа
        """
        # Классификация настроений
        sentiment_result = self.classify_sentiment(text)

        # Извлечение сущностей
        entities = self.extract_entities(text)

        # Расчет важности
        impact = self.calculate_impact(
            text,
            sentiment_result['sentiment'],
            entities
        )

        # Извлечение ключевых слов
        keywords = self.extract_keywords(text)

        return {
            'sentiment': sentiment_result['sentiment'],
            'confidence': sentiment_result['confidence'],
            'label': sentiment_result['label'],
            'entities': entities,
            'impact': impact,
            'keywords': keywords
        }
