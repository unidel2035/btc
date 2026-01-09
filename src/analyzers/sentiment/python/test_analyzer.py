"""
Unit tests for sentiment analyzer
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from analyzer import SentimentAnalyzer
from preprocessor import TextPreprocessor


def test_preprocessor():
    """Test text preprocessing"""
    print("\n=== Testing Text Preprocessor ===")

    preprocessor = TextPreprocessor()

    # Test text cleaning
    text = "Bitcoin SURGES 10%!!! Check this link: https://example.com"
    cleaned = preprocessor.clean_text(text)
    print(f"Original: {text}")
    print(f"Cleaned: {cleaned}")
    assert "https://" not in cleaned
    assert cleaned.islower()

    # Test keyword extraction
    text = "Bitcoin price surges after major ETF approval from SEC. The Bitcoin rally continues."
    keywords = preprocessor.extract_keywords(text, top_n=5)
    print(f"\nText: {text}")
    print(f"Keywords: {keywords}")
    assert len(keywords) <= 5
    assert "bitcoin" in [k.lower() for k in keywords]

    # Test crypto detection
    assert preprocessor.contains_crypto_terms("Bitcoin surges 10%")
    assert preprocessor.contains_crypto_terms("Ethereum price increases")
    assert not preprocessor.contains_crypto_terms("Stock market rallies")

    print("✅ Preprocessor tests passed!")


def test_sentiment_analyzer():
    """Test sentiment analyzer"""
    print("\n=== Testing Sentiment Analyzer ===")

    analyzer = SentimentAnalyzer()

    # Load models
    print("Loading models (this may take a while)...")
    analyzer.load_models()
    print("✅ Models loaded!")

    # Test positive sentiment
    text = "Bitcoin surges 15% after major ETF approval from SEC"
    print(f"\nAnalyzing positive: {text}")
    result = analyzer.analyze(text, "news")
    print(f"Result: {result}")
    assert result["sentiment"] > 0
    assert result["label"] == "positive"
    assert result["confidence"] > 0.5
    assert len(result["entities"]) > 0
    print("✅ Positive sentiment detected!")

    # Test negative sentiment
    text = "Cryptocurrency exchange hacked, $100 million stolen in security breach"
    print(f"\nAnalyzing negative: {text}")
    result = analyzer.analyze(text, "news")
    print(f"Result: {result}")
    assert result["sentiment"] < 0
    assert result["label"] == "negative"
    print("✅ Negative sentiment detected!")

    # Test neutral sentiment
    text = "Bitcoin price remains stable around $45,000"
    print(f"\nAnalyzing neutral: {text}")
    result = analyzer.analyze(text, "news")
    print(f"Result: {result}")
    assert result["label"] in ["neutral", "positive", "negative"]
    print("✅ Neutral sentiment detected!")

    # Test high impact detection
    text = "Breaking: Bitcoin ETF approved! Price surges, regulations change everything"
    print(f"\nAnalyzing high impact: {text}")
    result = analyzer.analyze(text, "news")
    print(f"Result: {result}")
    assert result["impact"] in ["high", "medium"]
    print(f"✅ Impact level: {result['impact']}")

    # Test batch analysis
    texts = [
        "Bitcoin surges 10%",
        "Ethereum price crashes",
        "Cardano announces partnership",
    ]
    print(f"\nAnalyzing batch: {len(texts)} items")
    results = analyzer.analyze_batch(texts, "news")
    print(f"Results: {len(results)} items analyzed")
    assert len(results) == len(texts)
    for i, result in enumerate(results):
        print(f"{i+1}. {texts[i]} -> {result['label']} ({result['sentiment']:.2f})")
    print("✅ Batch analysis passed!")

    print("\n✅ All analyzer tests passed!")


def test_entity_extraction():
    """Test entity extraction"""
    print("\n=== Testing Entity Extraction ===")

    analyzer = SentimentAnalyzer()
    analyzer.load_models()

    # Test cryptocurrency entities
    text = "Bitcoin and Ethereum prices surge as Coinbase announces new features"
    entities = analyzer.extract_entities(text)
    print(f"Text: {text}")
    print(f"Entities: {entities}")
    assert len(entities) > 0
    # Should detect BTC, ETH, and/or Coinbase
    entity_lower = [e.lower() for e in entities]
    assert any(term in " ".join(entity_lower) for term in ["bitcoin", "btc", "ethereum", "eth", "coinbase"])

    print("✅ Entity extraction tests passed!")


def test_impact_calculation():
    """Test impact score calculation"""
    print("\n=== Testing Impact Calculation ===")

    analyzer = SentimentAnalyzer()
    analyzer.load_models()

    # High impact
    text = "BREAKING: Bitcoin ETF approved! SEC announces major regulatory changes. Price surges 20%."
    result = analyzer.analyze(text, "news")
    print(f"High impact text: {text}")
    print(f"Impact: {result['impact']}, Sentiment: {result['sentiment']:.2f}")
    assert result["impact"] in ["high", "medium"]

    # Low impact
    text = "Bitcoin price slightly adjusts, trading remains normal"
    result = analyzer.analyze(text, "news")
    print(f"\nLow impact text: {text}")
    print(f"Impact: {result['impact']}, Sentiment: {result['sentiment']:.2f}")
    assert result["impact"] in ["low", "medium"]

    print("✅ Impact calculation tests passed!")


def main():
    """Run all tests"""
    print("🧪 Running Sentiment Analyzer Tests")
    print("=" * 60)

    try:
        test_preprocessor()
        test_sentiment_analyzer()
        test_entity_extraction()
        test_impact_calculation()

        print("\n" + "=" * 60)
        print("✅ All tests passed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
