import os
import json
import requests
from config import LLMResponse

def evaluate_conversation_log(topic, persona1, persona2, dialogue_log):
    """
    Evaluates a conversation log using OpenAI API with a specific prompt.
    Returns a dict with 'reason' (str) and 'score' (dict of int).
    """
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return {'success': False, 'error': 'Server configuration error: OPENAI_API_KEY not found.'}

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

### 3. 입력 데이터

- **대화 주제:** {topic}
- **페르소나 A:** {persona1}
- **페르소나 B:** {persona2}
- **대화 내용:**
{dialogue_text}

### 4. 핵심 평가 척도 (Evaluation Metrics)

평가 시 아래 세 가지 척도를 기준으로 분석해야 합니다.

1. **맥락 유지 및 흐름 (Context Flow):** 이전 발화의 내용을 정확히 기억하고 이어받고 있는가? 대화가 끊기거나 급작스럽게 화제가 전환되지 않는가?
2. **페르소나 일관성 (Persona Consistency):** 각 챗봇이 부여된 역할(성격, 말투, 지식 수준)을 대화 시작부터 끝까지 일관되게 유지하는가? 상대방의 페르소나에 맞춰 적절히 반응하는가?
3. **주제 집중도 (Topic Adherence):** 대화가 주어진 주제에서 벗어나지 않고, 밀도 있게 논의가 진행되는가?

### 5. 평가 원칙

- **전체론적 평가 (Holistic View):** 특정 발화 하나가 아닌, 대화 전체의 흐름(History)을 보고 판단합니다.
- **엄격한 페르소나 검증:** 챗봇이 자신의 역할을 망각하고 'AI스러운' 기계적 답변을 하거나, 상대방의 말투를 무분별하게 따라 하는 경우(Echoing) 엄격히 감점합니다.
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
- **3점 (Acceptable):** 대화는 진행되으나, 페르소나가 희미하거나 기계적인 답변이 섞여 몰입감을 해치는 경우. 또는 주제 겉핥기식 대화.
- **2점 (Poor):** 대화 도중 문맥을 잃고 동문서답(Incoherent)하거나, 페르소나가 붕괴되어 상대방과 구분되지 않는 경우.
- **1점 (Bad):** 주제와 전혀 무관한 이야기를 하거나, 논리적 모순/심각한 할루시네이션으로 대화 성립이 불가능한 경우.

### 9. 출력 예시

반드시 아래 형식을 그대로 따르십시오.

```JSON
{{
    "reason": "...",
    "score": {{
        "맥락 유지": 0,
        "페르소나 일관성": 0,
        "주제 적합성": 0
    }}
}}
```
"""

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

    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Parse JSON content
            try:
                parsed_content = json.loads(content)
                return {'success': True, 'result': parsed_content}
            except json.JSONDecodeError:
                return {'success': False, 'error': 'Failed to parse JSON response from LLM', 'raw_content': content}
        else:
            return {'success': False, 'error': f"OpenAI API Error: {response.text}"}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}
