#!/bin/bash
# Создание таблиц в Integram для BTC Trading Bot

API_URL="https://интеграм.рф/bts"
LOGIN="d"
PASSWORD="d"

echo "🔐 Authenticating..."
# Авторизация
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/auth?JSON_KV" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "login=${LOGIN}&pwd=${PASSWORD}")

echo "Auth response: $AUTH_RESPONSE"

TOKEN=$(echo $AUTH_RESPONSE | grep -oP '"token":"?\K[^",}]+')
XSRF=$(echo $AUTH_RESPONSE | grep -oP '"_xsrf":"?\K[^",}]+')

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed!"
  exit 1
fi

echo "✅ Authenticated: token=${TOKEN:0:10}..."

# Создание справочников (lookup tables)
echo ""
echo "📊 Creating lookup tables..."

# 1. PositionSide
echo "Creating PositionSide..."
curl -s -X POST "${API_URL}/_d_save?JSON_KV" \
  -H "X-Authorization: ${TOKEN}" \
  -H "Cookie: _xsrf=${XSRF}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "value=PositionSide&baseTypeId=3&unique=1"

# 2. PositionStatus
echo "Creating PositionStatus..."
curl -s -X POST "${API_URL}/_d_save?JSON_KV" \
  -H "X-Authorization: ${TOKEN}" \
  -H "Cookie: _xsrf=${XSRF}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "value=PositionStatus&baseTypeId=3&unique=1"

# 3. SignalAction  
echo "Creating SignalAction..."
curl -s -X POST "${API_URL}/_d_save?JSON_KV" \
  -H "X-Authorization: ${TOKEN}" \
  -H "Cookie: _xsrf=${XSRF}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "value=SignalAction&baseTypeId=3&unique=1"

# 4. Sentiment
echo "Creating Sentiment..."
curl -s -X POST "${API_URL}/_d_save?JSON_KV" \
  -H "X-Authorization: ${TOKEN}" \
  -H "Cookie: _xsrf=${XSRF}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "value=Sentiment&baseTypeId=3&unique=1"

echo ""
echo "✅ Lookup tables created!"
echo ""
echo "📋 Check your tables at: https://интеграм.рф/bts/dict"
