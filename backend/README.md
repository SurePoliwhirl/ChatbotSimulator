# API 키 검증 백엔드 서버

이 백엔드 서버는 React 프론트엔드에서 입력한 API 키의 유효성을 검증합니다.

## 설치 방법

1. Python 3.8 이상이 설치되어 있어야 합니다.

2. 가상 환경 생성 및 활성화 (선택사항):
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

3. 의존성 설치:
```bash
pip install -r requirements.txt
```

## 실행 방법

```bash
python app.py
```

서버가 `http://localhost:5000`에서 실행됩니다.

## API 엔드포인트

### POST /api/validate-key

API 키 유효성 검증

**Request Body:**
```json
{
  "api_key": "sk-...",
  "model_type": "openai"  // "openai", "anthropic", "google" 중 선택
}
```

**Response (성공):**
```json
{
  "valid": true,
  "message": "API 키가 유효합니다."
}
```

**Response (실패):**
```json
{
  "valid": false,
  "error": "API 키가 유효하지 않습니다."
}
```

### GET /health

서버 상태 확인

**Response:**
```json
{
  "status": "ok"
}
```

## 지원하는 API 제공자

- OpenAI (GPT-4, GPT-3.5 등)
- Anthropic (Claude)
- Google (Gemini)

## 주의사항

- API 키 검증 시 실제 API 호출이 발생할 수 있습니다 (최소 비용 발생 가능)
- Anthropic API의 경우 테스트 메시지 전송으로 인해 소량의 비용이 발생할 수 있습니다.

