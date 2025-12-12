# Chatbot Simulator Backend

챗봇 시뮬레이터를 위한 Flask 백엔드 서버입니다. LLM API 키 검증, 응답 생성, 토큰 사용량 예측 등의 기능을 제공합니다.

## 주요 기능

- 🔑 **API 키 검증**: OpenAI, Anthropic, Google API 키 유효성 검증
- 🤖 **LLM 응답 생성**: 다양한 LLM 모델을 사용한 대화 응답 생성
- 📊 **토큰 사용량 예측**: 시뮬레이션 실행 전 예상 토큰 사용량 계산
- 📈 **토큰 사용량 추적**: 실제 API 응답의 토큰 사용량 추적

## 프로젝트 구조

```
backend/
├── app.py                 # Flask 애플리케이션 메인 파일
├── validate_api_key.py    # API 키 검증 로직
├── generate_llm_response.py  # LLM 응답 생성 로직
├── estimate_tokens.py     # 토큰 사용량 예측 로직
├── config/
│   ├── __init__.py
│   └── llm_config.py     # LLM 설정 클래스
├── requirements.txt       # pip 의존성 목록
├── pyproject.toml        # uv 프로젝트 설정 (Python 3.12)
└── README.md
```

## 설치 방법

### 방법 1: uv 사용 (권장, Python 3.12 자동 설치)

uv는 Python 3.12를 자동으로 다운로드하고 사용합니다.

1. [uv](https://github.com/astral-sh/uv) 설치:
```bash
# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Mac/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. Python 3.12 설치 (uv가 자동으로 다운로드):
```bash
uv python install 3.12
```

3. 의존성 설치 및 가상 환경 생성:
```bash
uv sync
```

4. 서버 실행:
```bash
uv run python app.py
```

### 방법 2: pip 사용 (기존 방법)

1. Python 3.12가 설치되어 있어야 합니다.

2. 가상 환경 생성 및 활성화:
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

4. 서버 실행:
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

### POST /api/generate-response

LLM을 사용하여 응답 생성

**Request Body:**
```json
{
  "api_key": "sk-...",
  "model_type": "openai",
  "topic": "인공지능의 미래",
  "persona": "낙관론자",
  "previous_messages": [{"bot": 1, "text": "..."}],
  "bot_number": 1,
  "temperature": 1.2,
  "top_p": 0.9
}
```

**Response (성공):**
```json
{
  "success": true,
  "text": "생성된 응답 텍스트",
  "tokens": {
    "prompt_tokens": 150,
    "completion_tokens": 80,
    "total_tokens": 230
  }
}
```

**Response (실패):**
```json
{
  "success": false,
  "error": "API 키가 유효하지 않습니다."
}
```

### POST /api/estimate-tokens

시뮬레이션의 예상 토큰 사용량 계산

**Request Body:**
```json
{
  "model_type1": "openai",
  "model_type2": "openai",
  "topic": "인공지능의 미래",
  "persona1": "낙관론자",
  "persona2": "회의론자",
  "turns_per_bot": 3,
  "number_of_sets": 2
}
```

**Response (성공):**
```json
{
  "success": true,
  "estimate": {
    "total_tokens": 15000,
    "total_prompt_tokens": 8000,
    "total_completion_tokens": 7000,
    "per_set_tokens": 7500,
    "per_message_tokens": 1250
  }
}
```

**Response (실패):**
```json
{
  "success": false,
  "error": "주제와 페르소나가 필요합니다."
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

## 지원하는 LLM 제공자

- **OpenAI**: GPT-4, GPT-3.5 Turbo 등
- **Anthropic**: Claude 3 (Haiku, Sonnet, Opus)
- **Google**: Gemini Pro

## 주요 파라미터

### Temperature
- 범위: 0.0 ~ 2.0
- 응답의 창의성과 다양성을 제어
- 낮을수록 일관적, 높을수록 창의적

### Top-p (Nucleus Sampling)
- 범위: 0.0 ~ 1.0
- 토큰 선택 시 고려할 확률 범위
- Temperature와 함께 사용하여 더 나은 샘플링 제공

## 주의사항

⚠️ **비용 관련**
- API 키 검증 시 실제 API 호출이 발생할 수 있습니다 (최소 비용 발생 가능)
- Anthropic API의 경우 테스트 메시지 전송으로 인해 소량의 비용이 발생할 수 있습니다
- 토큰 예측 기능은 실제 API 호출 없이 계산되므로 비용이 발생하지 않습니다

⚠️ **보안**
- API 키는 환경 변수나 안전한 저장소에 보관하는 것을 권장합니다
- 프로덕션 환경에서는 API 키를 하드코딩하지 마세요

## 개발

### 디버그 모드 실행
```bash
# uv 사용
uv run python app.py

# pip 사용
python app.py
```

서버는 기본적으로 `http://localhost:5000`에서 실행되며, 디버그 모드가 활성화되어 있습니다.

### 의존성 업데이트
```bash
# uv 사용
uv sync

# pip 사용
pip install -r requirements.txt --upgrade
```

## 문제 해결

### 서버가 시작되지 않는 경우
1. Python 3.12가 설치되어 있는지 확인 (uv 사용 시 자동 설치됨)
2. 모든 의존성이 설치되었는지 확인 (`uv sync` 또는 `pip install -r requirements.txt`)
3. 포트 5000이 이미 사용 중인지 확인

### Python 버전 문제
- Python 3.14 이상에서는 일부 패키지(예: `tiktoken`)의 사전 빌드된 wheel이 없을 수 있습니다
- uv를 사용하면 Python 3.12를 자동으로 다운로드하고 사용하므로 이 문제를 피할 수 있습니다
- `uv python install 3.12`로 Python 3.12를 명시적으로 설치할 수 있습니다

### API 키 검증 실패
1. API 키가 올바른 형식인지 확인
2. API 키에 충분한 크레딧이 있는지 확인
3. 네트워크 연결 상태 확인

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

