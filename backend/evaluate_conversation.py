import os
import json
import requests
import logging
from datetime import datetime
from dotenv import load_dotenv
from config import LLMResponse

# Load environment variables from .env file
load_dotenv()

# Configure separate loggers for each provider
def get_logger(provider):
    """Get logger for specific provider"""
    logger = logging.getLogger(f'evaluation_{provider}')
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates
    logger.handlers = []
    
    # Create file handler
    log_filename = f'evaluation_logs_{provider}.log'
    handler = logging.FileHandler(log_filename, encoding='utf-8')
    handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    
    return logger

def evaluate_conversation_log(topic, persona1, persona2, dialogue_log, provider='openai'):
    """
    Evaluates a conversation log using LLM API (OpenAI or Anthropic) with a specific prompt.
    Returns a dict with 'reason' (str) and 'score' (dict of int).
    
    Args:
        topic: Conversation topic
        persona1: First persona
        persona2: Second persona
        dialogue_log: List of dialogue messages
        provider: 'openai' or 'anthropic' (default: 'openai')
    """
    provider = provider.lower()
    
    if provider == 'openai':
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            error_msg = 'Server configuration error: OPENAI_API_KEY not found.'
            logging.error(error_msg)
            return {'success': False, 'error': error_msg}
    elif provider == 'anthropic':
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            error_msg = 'Server configuration error: ANTHROPIC_API_KEY not found.'
            logging.error(error_msg)
            return {'success': False, 'error': error_msg}
    else:
        error_msg = f'Unsupported provider: {provider}. Supported providers: openai, anthropic'
        logging.error(error_msg)
        return {'success': False, 'error': error_msg}

    # Format dialogue log into a single string
    # Assuming dialogue_log is a list of objects like { 'speaker': 'Bot 1', 'text': '...' }
    dialogue_text = ""
    for msg in dialogue_log:
        dialogue_text += f"{msg.get('speaker', 'Unknown')}: {msg.get('text', '')}\n"

    # Construct the user provided prompt
    prompt = f"""### 챗봇 간 대화(Self-Play) 품질 검증 프롬프트

당신은 두 AI 챗봇 간의 대화 데이터를 검증하고 품질을 측정하는 **대화형 AI 전문 분석가(Dialogue Analyst)**입니다. 아래의 지침, 평가 척도, 기준을 숙지하여 주어진 대화 로그를 객관적으로 평가하십시오.

### 1. 프로젝트 개요

- **검증 목적:** 특정한 주제에 대해 서로 다른 페르소나(Persona)를 가진 두 챗봇(Agent A, Agent B)이 나눈 대화의 자연스러움과 논리적 완결성을 검증합니다.
- **데이터 특성:** UI 요소 없이 텍스트로만 이루어진 연속된 대화(Multi-turn Dialogue)입니다.

### 2. 역할

- 제공된 `대화 내용`이 `주제`에 부합하는지, 그리고 각 챗봇이 부여받은 `페르소나`를 끝까지 유지하며 자연스럽게 대화를 이어가는지를 평가합니다.
- 3가지 핵심 평가 척도(맥락, 페르소나, 논리)를 종합하여 1~5점 척도로 정량화하고, 그 근거를 작성합니다.
- **(핵심 목표) 두 챗봇이 서로의 페르소나를 혼동하거나, 상대방의 설정을 자신의 것으로 착각하는 '페르소나 스위칭(Persona Switching)' 현상을 찾아내는 것이 가장 중요합니다.**

### 3. 입력 데이터

- **대화 주제:** {topic}
- **페르소나 A (발화자 A):** {persona1}
- **페르소나 B (발화자 B):** {persona2}
- **대화 내용:**
(참고: 대화 로그의 발화자 이름이 명시되지 않은 경우, 첫 번째 발화자를 A, 두 번째 발화자를 B로 간주하여 분석하십시오.)
{dialogue_text}

### 4. 핵심 평가 척도 (Evaluation Metrics)

평가 시 아래 세 가지 척도를 기준으로 분석해야 합니다.

1. **맥락 유지 및 흐름 (Context Flow):** 이전 발화의 내용을 정확히 기억하고 이어받고 있는가? 대화가 끊기거나 급작스럽게 화제가 전환되지 않는가?
2. **페르소나 일관성 (Persona Consistency):** 
   - 각 챗봇이 부여된 역할(성격, 말투, 지식 수준)을 대화 시작부터 끝까지 일관되게 유지하는가?
   - **(Critical Check)**: 상대방의 페르소나를 자신의 것으로 착각하거나, 역할이 뒤바뀌는 모습이 보이지 않는가?
3. **주제 집중도 (Topic Adherence):** 대화가 주어진 주제에서 벗어나지 않고, 밀도 있게 논의가 진행되는가?

### 5. 평가 원칙

- **전체론적 평가 (Holistic View):** 특정 발화 하나가 아닌, 대화 전체의 흐름(History)을 보고 판단합니다.
- **엄격한 페르소나 검증 (Zero Tolerance for Swapping):** 
   - 챗봇이 자신의 역할을 망각하거나 상대방의 설정을 훔쳐서 말하는 경우(Persona Leakage/Swapping)는 대화 품질의 치명적인 결함입니다.
   - **이러한 혼동이 단 한 번이라도 발견되면, '페르소나 일관성' 점수는 무조건 1점을 부여해야 합니다.**
   - 감점 시, "어떤 발화에서 페르소나 혼동이 일어났는지" 이유에 명시하십시오.
- **환각(Hallucination) 감지:** 대화 맥락과 상관없는 거짓 정보를 생성하거나, 앞뒤 말이 모순되는 경우 최하점을 부여합니다.

### 6. 금지사항

- 문법적 오류나 오타 등 사소한 텍스트 품질보다는 **'대화의 논리와 캐릭터성'**에 집중하십시오.
- 주어진 출력 형식 외에 사견이나 추가 정보를 포함하지 마십시오.

### 7. 출력 준수사항 (Strict Rules)

- **점수 표기:** 반드시 1~5 범위의 정수만 사용합니다.
- **설명 작성 시 절대 금지:**
    - "X점", "점수", "평점", "만점", "감점" 등 점수를 직접 언급하는 단어 사용 금지.
    - "높은 점수", "낮은 평가", "5점짜리 대화" 등 숫자나 점수를 암시하는 표현 사용 금지.
- **설명 작성 가이드:** 위에서 정의한 3가지 핵심 평가 척도(맥락, 페르소나, 주제) 중 잘된 점과 부족한 점을 명확히 지적하는 **객관적 분석문**으로만 작성하십시오.

### 8. 평가 점수 기준 (Scoring Rubric)

아래 기준에 따라 종합 점수를 부여하십시오.

- **5점 (Perfect):** 두 페르소나가 완벽하게 구현되었으며, 주제에 대해 깊이 있고 자연스러운 티키타카(Turn-taking)가 이루어진 경우.
- **4점 (Good):** 대화 흐름과 주제 의식은 명확하나, 페르소나의 매력이 다소 약하거나 아주 경미한 맥락 불일치가 1회 정도 있는 경우.
- **3점 (Acceptable):** 대화는 진행되으나, 페르소나가 희미하거나 기계적인 답변이 섞여 몰입감을 해치는 경우.
- **2점 (Poor):** 대화 도중 문맥을 잃고 동문서답(Incoherent)하거나, 페르소나가 붕괴되어 상대방과 구분되지 않는 경우.
- **1점 (Bad):** **(즉시 낙제)** 서로의 페르소나가 뒤바뀌거나(Swapping), 자신의 역할을 잊어버린 경우. 또는 주제와 무관한 이야기를 하는 경우.

### 9. 출력 예시

반드시 아래 형식을 그대로 따르십시오. **중요: JSON 형식만 출력하고, 설명이나 추가 텍스트는 포함하지 마십시오.**

```json
{{
    "reason": "페르소나 A는 ... 했으나, B의 발화 '...'에서 A의 설정을 언급하며 역할 혼동이 발생했습니다. 따라서 페르소나 일관성에 심각한 문제가 있습니다.",
    "score": {{
        "맥락 유지": 0,
        "페르소나 일관성": 0,
        "주제 적합성": 0
    }}
}}
```

**출력 규칙:**
- 반드시 유효한 JSON 형식으로만 출력하세요
- 마크다운 코드 블록(```) 없이 순수 JSON만 출력하세요
- JSON 외의 설명, 주석, 추가 텍스트는 절대 포함하지 마세요
- reason은 문자열(string)이어야 합니다
- score의 각 값은 1~5 범위의 정수(integer)여야 합니다
"""

    try:
        if provider == 'openai':
            return _evaluate_with_openai(api_key, prompt)
        elif provider == 'anthropic':
            return _evaluate_with_anthropic(api_key, prompt)
        else:
            return {'success': False, 'error': f'Unsupported provider: {provider}'}
    except Exception as e:
        # Use appropriate logger based on provider
        logger = get_logger(provider)
        logger.error(f"[{datetime.now()}] Network/Server Error: {str(e)}")
        return {'success': False, 'error': str(e)}


def _evaluate_with_openai(api_key, prompt):
    """Evaluate conversation using OpenAI API"""
    logger = get_logger('openai')
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    data = {
        'model': 'gpt-4o', # Using GPT-4o for better reasoning on evaluation
        'messages': [
            {
                'role': 'system',
                'content': '당신은 대화형 AI 전문 분석가입니다. 주어진 대화를 분석하고 JSON 형식으로 평가 결과를 출력하세요.'
            },
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'temperature': 0.2, # Low temperature for consistent evaluation
        'response_format': { "type": "json_object" } # Force JSON output
    }

    logger.info(f"[{datetime.now()}] OpenAI API Request - Model: {data['model']}, Prompt length: {len(prompt)}")
    
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers=headers,
        json=data,
        timeout=60
    )
    
    logger.info(f"[{datetime.now()}] OpenAI API Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Log the raw LLM response
        logger.info(f"[{datetime.now()}] Raw OpenAI Response:\n{content}\n{'='*50}")
        
        # Parse JSON content
        try:
            parsed_content = json.loads(content)
            logger.info(f"[{datetime.now()}] Evaluation completed successfully")
            return {'success': True, 'result': parsed_content}
        except json.JSONDecodeError as e:
            logger.error(f"[{datetime.now()}] JSON Parse Error: {str(e)}\nContent: {content}")
            return {'success': False, 'error': 'Failed to parse JSON response from LLM', 'raw_content': content}
    elif response.status_code == 401:
        # API key authentication error
        error_msg = '올바르지 않은 API 키입니다. OpenAI API 키를 확인해주세요.'
        logger.error(f"[{datetime.now()}] OpenAI API Authentication Error: {response.text}")
        return {'success': False, 'error': error_msg, 'auth_error': True}
    else:
        # Parse error response to get meaningful error message
        try:
            error_data = response.json()
            error_detail = error_data.get('error', {})
            if isinstance(error_detail, dict):
                error_type = error_detail.get('type', 'unknown_error')
                error_message = error_detail.get('message', '알 수 없는 오류')
                
                # Handle specific error types
                if error_type == 'invalid_request_error':
                    if 'model' in error_message.lower():
                        error_msg = f'모델을 찾을 수 없습니다: {error_message}. OpenAI API에서 사용 가능한 모델을 확인해주세요.'
                    else:
                        error_msg = f'잘못된 요청: {error_message}'
                elif error_type == 'rate_limit_error':
                    error_msg = f'API 요청 한도 초과: {error_message}. 잠시 후 다시 시도해주세요.'
                else:
                    error_msg = f'OpenAI API 오류 ({error_type}): {error_message}'
            else:
                error_msg = f'OpenAI API 오류: {str(error_detail)}'
        except:
            error_text = response.text
            error_msg = f'OpenAI API 오류: {error_text}'
        
        logger.error(f"[{datetime.now()}] OpenAI API Error: {response.text}")
        return {'success': False, 'error': error_msg}


def _evaluate_with_anthropic(api_key, prompt):
    """Evaluate conversation using Anthropic API"""
    logger = get_logger('anthropic')
    
    headers = {
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
    }

    # Anthropic uses a different message format
    system_message = '당신은 대화형 AI 전문 분석가입니다. 주어진 대화를 분석하고 반드시 유효한 JSON 형식으로만 평가 결과를 출력하세요. JSON 외의 설명, 주석, 마크다운 코드 블록은 포함하지 마세요.'
    
    data = {
        'model': 'claude-sonnet-4-5', # Using Claude Sonnet 4.5 as per official documentation
        'max_tokens': 4096,
        'system': system_message,
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'temperature': 0.2 # Low temperature for consistent evaluation
    }

    logger.info(f"[{datetime.now()}] Anthropic API Request - Model: {data['model']}, Prompt length: {len(prompt)}")
    
    response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers=headers,
        json=data,
        timeout=60
    )
    
    logger.info(f"[{datetime.now()}] Anthropic API Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        
        # Anthropic returns content as a list of content blocks
        content_blocks = result.get('content', [])
        
        if content_blocks and len(content_blocks) > 0:
            first_block = content_blocks[0]
            
            if isinstance(first_block, dict):
                content = first_block.get('text', '')
            else:
                content = str(first_block)
        else:
            content = ''
        
        # Log the raw LLM response
        logger.info(f"[{datetime.now()}] Raw Anthropic Response Content:\n{content}\n{'='*50}")
        
        # Parse JSON content
        try:
            # Try to find JSON in the content (might be wrapped in markdown code blocks)
            json_content = content.strip()
            
            # Remove markdown code blocks if present
            if json_content.startswith('```'):
                lines = json_content.split('\n')
                # Remove first line (```json or ```)
                if len(lines) > 1:
                    lines = lines[1:]
                # Remove last line (```)
                if len(lines) > 0 and lines[-1].strip() == '```':
                    lines = lines[:-1]
                json_content = '\n'.join(lines)
            
            parsed_content = json.loads(json_content)
            logger.info(f"[{datetime.now()}] Evaluation completed successfully")
            return {'success': True, 'result': parsed_content}
        except json.JSONDecodeError as e:
            logger.error(f"[{datetime.now()}] JSON Parse Error: {str(e)}\nError position: {e.pos if hasattr(e, 'pos') else 'N/A'}\nContent: {content}")
            return {'success': False, 'error': 'Failed to parse JSON response from LLM', 'raw_content': content}
    elif response.status_code == 401:
        # API key authentication error
        error_msg = '올바르지 않은 API 키입니다. Anthropic API 키를 확인해주세요.'
        logger.error(f"[{datetime.now()}] Anthropic API Authentication Error: {response.text}")
        return {'success': False, 'error': error_msg, 'auth_error': True}
    else:
        # Parse error response to get meaningful error message
        try:
            error_data = response.json()
            error_detail = error_data.get('error', {})
            if isinstance(error_detail, dict):
                error_type = error_detail.get('type', 'unknown_error')
                error_message = error_detail.get('message', '알 수 없는 오류')
                
                # Handle specific error types
                if error_type == 'not_found_error':
                    if 'model' in error_message.lower():
                        error_msg = f'모델을 찾을 수 없습니다: {error_message}. Anthropic API에서 사용 가능한 모델을 확인해주세요.'
                    else:
                        error_msg = f'리소스를 찾을 수 없습니다: {error_message}'
                elif error_type == 'invalid_request_error':
                    error_msg = f'잘못된 요청: {error_message}'
                elif error_type == 'rate_limit_error':
                    error_msg = f'API 요청 한도 초과: {error_message}. 잠시 후 다시 시도해주세요.'
                else:
                    error_msg = f'Anthropic API 오류 ({error_type}): {error_message}'
            else:
                error_msg = f'Anthropic API 오류: {str(error_detail)}'
        except:
            error_text = response.text
            error_msg = f'Anthropic API 오류: {error_text}'
        
        logger.error(f"[{datetime.now()}] Anthropic API Error: {response.text}")
        return {'success': False, 'error': error_msg}
