"""
LLM API를 사용하여 실제 응답 생성
OpenAI, Anthropic, Google 등의 API를 호출합니다.
"""
import requests
import re
from typing import Dict, List, Optional
from config import LLMRequestConfig, LLMResponse

def clean_response_text(text: str) -> str:
    """
    응답 텍스트 정리: 따옴표 제거, 역할 표시 제거
    """
    if not text:
        return text
    
    text = text.strip()
    
    # 앞뒤 따옴표 제거 (단일/이중 따옴표 모두)
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    
    # 앞 따옴표만 있는 경우
    if text.startswith('"') or text.startswith("'"):
        text = text[1:].strip()
    
    # 뒤 따옴표만 있는 경우
    if text.endswith('"') or text.endswith("'"):
        text = text[:-1].strip()
    
    # 역할 표시 제거 (예: "통신사 고객:", "통신사 직원:", "고객:", "직원:" 등)
    # "역할명: " 또는 "역할명: \"" 패턴 제거
    text = re.sub(r'^[^:]+:\s*["\']?\s*', '', text)
    text = re.sub(r'^통신사\s+(고객|직원):\s*["\']?\s*', '', text)
    text = re.sub(r'^(고객|직원|상담사|전문가):\s*["\']?\s*', '', text)
    
    # 남은 따옴표 제거
    text = text.strip()
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1].strip()
    if text.startswith("'") and text.endswith("'"):
        text = text[1:-1].strip()
    
    return text

def generate_conversation_prompt(api_key: str, topic: str, persona1: str, persona2: str) -> str:
    """
    LLM을 사용하여 주제와 페르소나에 맞는 대화 프롬프트를 동적으로 생성
    API 키 형식에 따라 OpenAI 또는 Anthropic 사용
    
    Args:
        api_key: API 키 (OpenAI 또는 Anthropic)
        topic: 대화 주제
        persona1: 챗봇 1의 페르소나
        persona2: 챗봇 2의 페르소나
    
    Returns:
        생성된 프롬프트 문자열 (실패 시 None)
    """
    # API 키 형식에 따라 모델 타입 결정
    if api_key.startswith('sk-ant-') or api_key.startswith('sk-ant-api'):
        # Anthropic API 사용
        try:
            result = _try_generate_prompt_with_anthropic(api_key, topic, persona1, persona2)
            if result:
                print(f"프롬프트: {result}")
                return result
            else:
                print(f"Anthropic API로 프롬프트 생성 실패")
                return None
        except Exception as e:
            print(f"Anthropic API로 프롬프트 생성 중 오류: {str(e)}")
            return None
    else:
        # OpenAI API 사용 (기본값)
        model_name = 'gpt-4o'
        try:
            result = _try_generate_prompt_with_model(api_key, topic, persona1, persona2, model_name)
            if result:
                print(f"프롬프트: {result}")
                return result
            else:
                print(f"모델 {model_name}로 프롬프트 생성 실패")
                return None
        except Exception as e:
            print(f"모델 {model_name}로 프롬프트 생성 중 오류: {str(e)}")
            return None

def _try_generate_prompt_with_anthropic(api_key: str, topic: str, persona1: str, persona2: str) -> Optional[str]:
    """
    Anthropic Claude 모델을 사용하여 주제와 페르소나에 맞는 대화 프롬프트 생성
    
    Args:
        api_key: Anthropic API 키
        topic: 대화 주제
        persona1: 챗봇 1의 페르소나
        persona2: 챗봇 2의 페르소나
    
    Returns:
        생성된 프롬프트 문자열 (실패 시 None)
    """
    try:
        headers = {
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }
        
        system_message = '당신은 대화 시뮬레이션을 위한 시스템 프롬프트를 생성하는 전문가입니다. 주어진 주제와 두 페르소나에 맞는 역할과 행동 지침을 담은 프롬프트를 생성하세요.'
        
        user_content = f"""다음 정보를 바탕으로 대화 시뮬레이션을 위한 시스템 프롬프트를 생성해주세요:

주제: {topic}
페르소나 1 (챗봇 1): {persona1}
페르소나 2 (챗봇 2): {persona2}

[중요] 프롬프트 작성 요구사항:
1. 각 페르소나의 역할과 책임을 명확히 설명하세요
   - 페르소나 1이 어떤 역할을 하는지 (예: 정보 제공자, 정보 요청자, 의견 제시자 등)
   - 페르소나 2가 어떤 역할을 하는지
   - 각 페르소나가 대화에서 어떤 행동을 해야 하는지

2. 각 페르소나의 특성과 성격을 반영하세요
   - 페르소나 설명에 명시된 특성들을 대화에 어떻게 반영할지
   - 말투, 태도, 관점 등

3. 주제에 대한 대화 목적과 방향을 제시하세요
   - 이 대화의 목적이 무엇인지
   - 대화가 어떻게 진행되어야 하는지

4. 절대 실제 대화 예시나 대화 내용을 포함하지 마세요
   - "고객: 안녕하세요..." 같은 실제 대화 예시는 포함하지 마세요
   - 역할 지침과 행동 규칙만 작성하세요

5. 한국어로 작성하세요

6. 프롬프트만 반환하세요 (추가 설명이나 메타 설명 없이)

생성된 프롬프트:"""
        
        data = {
            'model': 'claude-sonnet-4-5',  # evaluate_conversation.py와 동일한 모델 사용
            'max_tokens': 2000,
            'system': system_message,
            'messages': [
                {'role': 'user', 'content': user_content}
            ],
            'temperature': 0.7
        }
        
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content_blocks = result.get('content', [])
            
            if content_blocks and len(content_blocks) > 0:
                first_block = content_blocks[0]
                if isinstance(first_block, dict):
                    content = first_block.get('text', '').strip()
                else:
                    content = str(first_block).strip()
            else:
                content = ''
            
            print(f"\n{'='*80}")
            print(f"[프롬프트 생성 성공] Anthropic Claude")
            print(f"{'='*80}")
            print(f"생성된 프롬프트:\n{content}")
            print(f"{'='*80}\n")
            return content
        else:
            # 에러 발생
            error_msg = ""
            error_details = ""
            try:
                error_data = response.json()
                error_detail = error_data.get('error', {})
                if isinstance(error_detail, dict):
                    error_msg = error_detail.get('message', '알 수 없는 오류')
                    error_type = error_detail.get('type', '알 수 없음')
                    error_details = f"타입: {error_type}"
                else:
                    error_msg = str(error_detail)
            except Exception as parse_error:
                error_msg = f'응답 파싱 실패: {str(parse_error)}'
                error_details = f"상태 코드: {response.status_code}, 응답 본문: {response.text[:200]}"
            
            print(f"\n{'='*80}")
            print(f"[프롬프트 생성 실패] Anthropic Claude")
            print(f"{'='*80}")
            print(f"실패 이유: {error_msg}")
            if error_details:
                print(f"상세 정보: {error_details}")
            print(f"상태 코드: {response.status_code}")
            print(f"{'='*80}\n")
            return None
            
    except requests.exceptions.Timeout:
        print(f"\n{'='*80}")
        print(f"[프롬프트 생성 실패] Anthropic Claude")
        print(f"{'='*80}")
        print(f"실패 이유: 요청 시간 초과 (60초)")
        print(f"원인: API 서버가 응답하는데 너무 오래 걸렸거나 네트워크 문제가 발생했습니다.")
        print(f"{'='*80}\n")
        return None
    except Exception as e:
        print(f"\n{'='*80}")
        print(f"[프롬프트 생성 실패] Anthropic Claude")
        print(f"{'='*80}")
        print(f"실패 이유: 예외 발생")
        print(f"예외 타입: {type(e).__name__}")
        print(f"예외 메시지: {str(e)}")
        print(f"원인: API 호출 중 예상치 못한 오류가 발생했습니다.")
        print(f"{'='*80}\n")
        return None

def _try_generate_prompt_with_model(api_key: str, topic: str, persona1: str, persona2: str, model_name: str) -> Optional[str]:
    """
    GPT-4o 모델을 사용하여 주제와 페르소나에 맞는 대화 프롬프트 생성
    
    Args:
        api_key: OpenAI API 키
        topic: 대화 주제
        persona1: 챗봇 1의 페르소나
        persona2: 챗봇 2의 페르소나
        model_name: 사용할 모델 이름 (gpt-4o)
    
    Returns:
        생성된 프롬프트 문자열 (실패 시 None)
    """
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # GPT-4o에 대화 프롬프트 생성을 요청하는 메시지 구성
        messages = [
            {
                'role': 'system',
                'content': '당신은 대화 시뮬레이션을 위한 시스템 프롬프트를 생성하는 전문가입니다. 주어진 주제와 두 페르소나에 맞는 역할과 행동 지침을 담은 프롬프트를 생성하세요.'
            },
            {
                'role': 'user',
                'content': f"""다음 정보를 바탕으로 대화 시뮬레이션을 위한 시스템 프롬프트를 생성해주세요:

주제: {topic}
페르소나 1 (챗봇 1): {persona1}
페르소나 2 (챗봇 2): {persona2}

[중요] 프롬프트 작성 요구사항:
1. 각 페르소나의 역할과 책임을 명확히 설명하세요
   - 페르소나 1이 어떤 역할을 하는지 (예: 정보 제공자, 정보 요청자, 의견 제시자 등)
   - 페르소나 2가 어떤 역할을 하는지
   - 각 페르소나가 대화에서 어떤 행동을 해야 하는지

2. 각 페르소나의 특성과 성격을 반영하세요
   - 페르소나 설명에 명시된 특성들을 대화에 어떻게 반영할지
   - 말투, 태도, 관점 등

3. 주제에 대한 대화 목적과 방향을 제시하세요
   - 이 대화의 목적이 무엇인지
   - 대화가 어떻게 진행되어야 하는지

4. 절대 실제 대화 예시나 대화 내용을 포함하지 마세요
   - "고객: 안녕하세요..." 같은 실제 대화 예시는 포함하지 마세요
   - 역할 지침과 행동 규칙만 작성하세요

5. 한국어로 작성하세요

6. 프롬프트만 반환하세요 (추가 설명이나 메타 설명 없이)

생성된 프롬프트:"""
            }
        ]
        
        # GPT-4o API 호출
        data = {
            'model': model_name,
            'messages': messages,
            'max_tokens': 2000,
            'temperature': 0.7,
            'top_p': 1.0
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            print(f"\n{'='*80}")
            print(f"[프롬프트 생성 성공] 모델: {model_name}")
            print(f"{'='*80}")
            print(f"생성된 프롬프트:\n{content}")
            print(f"{'='*80}\n")
            return content
        else:
            # 에러 발생
            error_msg = ""
            error_details = ""
            try:
                error_data = response.json()
                error_message = error_data.get('error', {})
                error_msg = error_message.get('message', '알 수 없는 오류')
                error_type = error_message.get('type', '알 수 없음')
                error_code = error_message.get('code', '알 수 없음')
                error_details = f"타입: {error_type}, 코드: {error_code}"
            except Exception as parse_error:
                error_msg = f'응답 파싱 실패: {str(parse_error)}'
                error_details = f"상태 코드: {response.status_code}, 응답 본문: {response.text[:200]}"
            
            print(f"\n{'='*80}")
            print(f"[프롬프트 생성 실패] 모델: {model_name}")
            print(f"{'='*80}")
            print(f"실패 이유: {error_msg}")
            print(f"상세 정보: {error_details}")
            print(f"상태 코드: {response.status_code}")
            print(f"{'='*80}\n")
            return None
            
    except requests.exceptions.Timeout:
        print(f"\n{'='*80}")
        print(f"[프롬프트 생성 실패] 모델: {model_name}")
        print(f"{'='*80}")
        print(f"실패 이유: 요청 시간 초과 (60초)")
        print(f"원인: API 서버가 응답하는데 너무 오래 걸렸거나 네트워크 문제가 발생했습니다.")
        print(f"{'='*80}\n")
        return None
    except Exception as e:
        print(f"\n{'='*80}")
        print(f"[프롬프트 생성 실패] 모델: {model_name}")
        print(f"{'='*80}")
        print(f"실패 이유: 예외 발생")
        print(f"예외 타입: {type(e).__name__}")
        print(f"예외 메시지: {str(e)}")
        print(f"원인: API 호출 중 예상치 못한 오류가 발생했습니다.")
        print(f"{'='*80}\n")
        return None


def ensure_complete_sentence(text: str) -> str:
    """
    텍스트가 완전한 문장으로 끝나도록 보장
    중간에 끊긴 경우 적절히 처리
    """
    if not text:
        return text
    
    text = text.strip()
    
    # 한국어 문장 종결 어미
    korean_endings = ['다', '요', '죠', '네', '어', '아', '지', '게', '세', '까', '래', '대']
    korean_endings_with_punct = ['니다', '습니다', '습니다.', '니다.', '어요', '아요', '지요', '게요', '세요', '까요', '래요', '대요']
    
    # 이미 완전한 문장으로 끝나는 경우 확인
    if text.endswith(('.', '!', '?')):
        return text
    
    # 한국어 종결 어미로 끝나는 경우 마침표 추가
    if any(text.endswith(ending) for ending in korean_endings_with_punct):
        if not text.endswith('.'):
            text = text + '.'
        return text
    
    # 마지막 문자가 한국어 종결 어미인 경우
    if len(text) > 1 and text[-1] in korean_endings:
        text = text + '.'
        return text
    
    # 마지막 완전한 문장 찾기
    # 마지막 마침표, 느낌표, 물음표 위치 찾기
    last_period = text.rfind('.')
    last_exclamation = text.rfind('!')
    last_question = text.rfind('?')
    
    last_complete = max(last_period, last_exclamation, last_question)
    
    if last_complete >= 0:
        # 완전한 문장까지만 반환
        text = text[:last_complete + 1].strip()
    else:
        # 완전한 문장이 없으면 처리
        # 마지막 단어가 조사나 불완전한 어미로 끝나는 경우
        incomplete_endings = ['은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '로', '으로', '에서', '에게', '께서']
        
        if any(text.endswith(ending) for ending in incomplete_endings):
            # 불완전한 부분 제거하고 마지막 완전한 단어 찾기
            # 간단히 마침표 추가
            text = text + '.'
        elif len(text) > 5:  # 최소한의 길이가 있으면
            # 마지막에 마침표 추가
            text = text + '.'
    
    return text

def generate_openai_response(config: LLMRequestConfig, custom_system_prompt: Optional[str] = None, other_persona: Optional[str] = None) -> LLMResponse:
    """
    OpenAI API를 사용하여 응답 생성
    """
    try:
        headers = {
            'Authorization': f'Bearer {config.api_key}',
            'Content-Type': 'application/json'
        }
        
        # 대화 히스토리 구성
        messages = []
        
        # 커스텀 프롬프트가 없으면 기본 프롬프트 생성
        other_bot_number = 3 - config.bot_number
        if not custom_system_prompt:
            # 기본 프롬프트 생성
            system_prompt = f"""당신은 챗봇 {config.bot_number}입니다. {config.persona}의 역할을 맡고 있습니다.

현재 상황:
- 주제: {config.topic}
- 당신은 챗봇 {config.bot_number} ({config.persona})
- 상대방은 챗봇 {other_bot_number}
- 두 챗봇이 {config.topic}에 대해 대화를 나누고 있습니다.

당신의 역할 (매우 중요):
- 이것은 단순한 독백이 아닌 **실제 대화**입니다.
- 상대방(챗봇 {other_bot_number})의 발언에 **반드시 직접적으로 반응**해야 합니다.
- 상대방의 말에 대해 질문하거나, 공감하거나, 동의하거나, 반대 의견을 제시하거나, 상대방의 말을 인용해야 합니다.
- 절대로 주제에 대해 독립적으로 말만 하면 안 됩니다. 상대방과의 상호작용이 필수입니다.
- "{config.persona}"의 관점을 유지하면서도 상대방과 소통해야 합니다.

절대적으로 지켜야 할 규칙:
1. 반드시 한국어로만 응답하세요.
2. 반드시 완전한 문장으로 끝나야 합니다.
3. 한 번에 1-2문장으로만 응답하세요.
4. **상대방의 발언에 직접적으로 반응하세요.**"""
        else:
            # 커스텀 프롬프트에서 {persona} 변수를 실제 페르소나로 치환
            system_prompt = custom_system_prompt.replace('{persona}', config.persona)
        
        # 상대방 페르소나 정보 (other_persona가 있으면 사용)
        other_persona_text = f" ({other_persona})" if other_persona else ""
        
        # 역할 구분 정보 추가 (페르소나 정보 강조)
        system_prompt = f"""{system_prompt}

[매우 중요] 당신의 정체성과 역할:
- 당신은 챗봇 {config.bot_number}이며, 페르소나는 "{config.persona}"입니다
- 상대방은 챗봇 {other_bot_number}이며, 페르소나는 "{other_persona or '알 수 없음'}"입니다
- 당신은 절대 상대방의 페르소나나 역할로 말하지 마세요
- 당신은 오직 "{config.persona}"의 페르소나로만 대화해야 합니다
- 대화 히스토리에서 "당신(챗봇 {config.bot_number}, {config.persona})"이라고 표시된 것은 당신이 말한 내용입니다
- "상대방(챗봇 {other_bot_number}{other_persona_text})"이라고 표시된 것은 상대방이 말한 내용입니다
- 절대 자신과 상대방의 발언을 혼동하지 마세요
- 절대 상대방의 페르소나, 역할, 말투를 모방하거나 따라하지 마세요

[매우 중요] 응답 길이 제한:
- 짧고 간결하게, 일상 대화하듯이 자연스럽게 말하세요
- 긴 설명, 복잡한 문장 구조, 여러 문장으로 나누어 말하는 것을 절대 금지합니다
- 핵심만 간단히 전달하세요"""


        # 현재 챗봇의 응답 요청
        if not config.previous_messages:
            # 첫 메시지: 대화 시작
            user_message = f"""
            주제 '{config.topic}'에 대해 대화를 시작합니다.

            [매우 중요] 당신의 정체성:
            - 당신은 챗봇 {config.bot_number}이며, 페르소나는 "{config.persona}"입니다
            - 당신은 오직 이 페르소나의 역할과 특성으로만 대화해야 합니다
            - 시스템 프롬프트에 명시된 역할과 "{config.persona}"의 특성을 정확히 따르세요
            - 절대 다른 페르소나나 역할로 말하지 마세요

            [매우 중요] 응답 길이:
            - 긴 설명이나 여러 문장 사용 금지
            """
        else:
            last_message = config.previous_messages[-1]
            other_bot = last_message['bot']
            
            # 이전 대화 히스토리를 messages 배열에 role로 구분하여 추가
            # 최근 메시지들을 messages 배열에 추가 (assistant는 자신의 발언, user는 상대방의 발언)
            history_messages = config.previous_messages[-6:] if len(config.previous_messages) >= 6 else config.previous_messages
            
            for msg in history_messages:
                if msg['bot'] == config.bot_number:
                    # 자신의 발언은 assistant role로 추가 (페르소나 정보 포함)
                    messages.append({
                        'role': 'assistant',
                        'content': f"[당신(챗봇 {config.bot_number}, {config.persona})의 이전 발언] {msg['text']}"
                    })
                else:
                    # 상대방의 발언은 user role로 추가 (페르소나 정보 포함)
                    other_persona_info = other_persona if other_persona else "알 수 없음"
                    messages.append({
                        'role': 'user',
                        'content': f"[상대방(챗봇 {other_bot_number}, {other_persona_info})의 발언] {msg['text']}"
                    })
            
            # 이전 대화 맥락 요약 (최근 2-3개 메시지) - 참고용으로만 사용
            recent_context = ""
            if len(config.previous_messages) > 1:
                context_messages = config.previous_messages[-3:] if len(config.previous_messages) >= 3 else config.previous_messages
                context_texts = []
                for msg in context_messages:
                    if msg['bot'] == config.bot_number:
                        context_texts.append(f"당신(챗봇 {config.bot_number}, {config.persona}): {msg['text']}")
                    else:
                        other_persona_info = other_persona if other_persona else "알 수 없음"
                        context_texts.append(f"상대방(챗봇 {other_bot_number}, {other_persona_info}): {msg['text']}")
                recent_context = "\n\n[중요] 이전 대화 맥락 요약 (참고용):\n" + "\n".join(context_texts) + "\n\n위 대화에서 이미 언급된 내용을 다시 물어보지 마세요. 이미 말한 정보를 활용하여 대화를 진행하세요.\n"
            
            # 이미 언급된 내용 추출 (간단한 요약)
            mentioned_info = ""
            if len(config.previous_messages) > 0:
                all_previous_text = " ".join([msg['text'] for msg in config.previous_messages])
                # 간단한 키워드 추출 (더 정교한 방법은 나중에 개선 가능)
                mentioned_info = f"\n[참고] 이전 대화에서 이미 언급된 내용: {all_previous_text[:200]}...\n위 내용을 다시 물어보지 말고, 이를 바탕으로 대화를 진행하세요.\n"
            
            other_persona_info = other_persona if other_persona else "알 수 없음"
            user_message = f"""
            [매우 중요] 당신의 정체성 (절대 잊지 마세요):
            - 당신은 챗봇 {config.bot_number}이며, 페르소나는 "{config.persona}"입니다
            - 상대방은 챗봇 {other_bot_number}이며, 페르소나는 "{other_persona_info}"입니다
            - 당신은 오직 "{config.persona}"의 페르소나로만 대화해야 합니다
            - 절대 상대방의 페르소나("{other_persona_info}")나 역할로 말하지 마세요
            - 절대 상대방의 말투, 태도, 관점을 모방하거나 따라하지 마세요

            상대방(챗봇 {other_bot_number}, {other_persona_info})이 방금 한 말입니다:

            "{last_message['text']}"
            {recent_context}
            {mentioned_info}
            
            [중요 지시사항]:
            1. 위의 대화 히스토리를 참고하되, "당신(챗봇 {config.bot_number}, {config.persona})"이라고 표시된 것은 당신이 말한 것이고, "상대방(챗봇 {other_bot_number}, {other_persona_info})"이라고 표시된 것은 상대방이 말한 것입니다
            2. 절대 자신과 상대방의 발언을 혼동하지 마세요
            3. 당신은 "{config.persona}"의 페르소나를 유지해야 합니다 - 절대 상대방의 페르소나로 말하지 마세요
            4. 상대방의 말에 직접적으로 반응하되, 이미 말한 내용을 다시 물어보지 마세요
            5. 이전 대화 맥락을 활용하여 새로운 정보나 다음 단계를 제시하세요
            6. 대화를 한 단계 더 구체적이고 진전된 방향으로 이끌어가세요
            7. 시스템 프롬프트에 명시된 역할과 "{config.persona}"의 특성을 정확히 따르세요
            8. 절대 역할 표시("통신사 고객:", "고객:", "직원:" 등)를 포함하지 마세요
            9. 따옴표나 인용 부호를 사용하지 마세요
            10. 역할을 직접 말하지 말고, 자연스럽게 대화하세요
            
            [매우 중요] 응답 길이 제한 (절대 지키세요):
            - 짧고 간결하게, 일상 대화하듯이 자연스럽게 말하세요
            - 긴 설명, 복잡한 문장 구조, 여러 문장으로 나누어 말하는 것을 절대 금지합니다
            - 핵심만 간단히 전달하세요
            """

        # 시스템 프롬프트 추가
        messages.append({
            'role': 'system',
            'content': system_prompt
        })
        
        # 사용자 메시지 추가
        messages.append({
            'role': 'user',
            'content': user_message
        })
        
        # 멀티턴 대화는 GPT-4o만 사용
        model_name = 'gpt-4o'
        
        data = {
            'model': model_name,
            'messages': messages,
            'temperature': config.temperature,
            'top_p': config.top_p,
            'max_tokens': config.max_tokens,
            'stop': None  # stop sequence 제거
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            # 응답 정리: 따옴표 제거, 역할 표시 제거
            content = clean_response_text(content)
            # 완전한 문장으로 끝나도록 후처리
            content = ensure_complete_sentence(content)
            
            # 토큰 사용량 추출
            usage = result.get('usage', {})
            prompt_tokens = usage.get('prompt_tokens')
            completion_tokens = usage.get('completion_tokens')
            total_tokens = usage.get('total_tokens')
            
            print(f"응답 생성 성공 - 모델: {model_name}")
            return LLMResponse(
                success=True, 
                text=content,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens
            )
        else:
            # 에러 발생
            try:
                error_data = response.json()
                error_message = error_data.get('error', {})
                error_msg = error_message.get('message', '알 수 없는 오류')
                print(f"모델 {model_name}로 응답 생성 실패: {error_msg}")
            except:
                error_msg = f'상태 코드: {response.status_code}'
                print(f"모델 {model_name}로 응답 생성 실패: {error_msg}")
            return LLMResponse(success=False, error=f'OpenAI API 오류: {error_msg}')
            
    except requests.exceptions.Timeout:
        return LLMResponse(success=False, error='요청 시간이 초과되었습니다.')
    except Exception as e:
        return LLMResponse(success=False, error=f'오류 발생: {str(e)}')

def generate_anthropic_response(config: LLMRequestConfig, custom_system_prompt: Optional[str] = None, other_persona: Optional[str] = None) -> LLMResponse:
    """
    Anthropic API를 사용하여 응답 생성
    """
    try:
        headers = {
            'x-api-key': config.api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }
        
        # 기본 프롬프트 생성 (custom_system_prompt가 없으면)
        other_bot_number = 3 - config.bot_number
        if not custom_system_prompt:
            system_prompt = f"""당신은 챗봇 {config.bot_number}입니다. {config.persona}의 역할을 맡고 있습니다.

현재 상황:
- 주제: {config.topic}
- 당신은 챗봇 {config.bot_number} ({config.persona})
- 상대방은 챗봇 {other_bot_number}
- 두 챗봇이 {config.topic}에 대해 대화를 나누고 있습니다.

당신의 역할 (매우 중요):
- 이것은 단순한 독백이 아닌 **실제 대화**입니다.
- 상대방(챗봇 {other_bot_number})의 발언에 **반드시 직접적으로 반응**해야 합니다.
- 상대방의 말에 대해 질문하거나, 공감하거나, 동의하거나, 반대 의견을 제시하거나, 상대방의 말을 인용해야 합니다.
- 절대로 주제에 대해 독립적으로 말만 하면 안 됩니다. 상대방과의 상호작용이 필수입니다.
- "{config.persona}"의 관점을 유지하면서도 상대방과 소통해야 합니다.

절대적으로 지켜야 할 규칙:
1. 반드시 한국어로만 응답하세요.
2. 반드시 완전한 문장으로 끝나야 합니다.
3. 한 번에 1-2문장으로만 응답하세요.
4. **상대방의 발언에 직접적으로 반응하세요.**"""
        else:
            system_prompt = custom_system_prompt.replace('{persona}', config.persona)
        
        # 메시지 구성
        messages = []
        if not config.previous_messages:
            user_content = f"주제 '{config.topic}'에 대해 대화를 시작합니다. {config.persona}의 페르소나로 짧고 간결하게 첫 메시지를 작성하세요."
        else:
            # 대화 히스토리 구성
            conversation_text = ""
            for msg in config.previous_messages:
                speaker = f"챗봇 {msg['bot']}"
                if msg['bot'] == config.bot_number:
                    speaker += f" (당신, {config.persona})"
                else:
                    speaker += f" (상대방)"
                conversation_text += f"{speaker}: {msg['text']}\n"
            
            user_content = f"""다음은 지금까지의 대화입니다:

{conversation_text}

이제 당신(챗봇 {config.bot_number}, {config.persona})의 차례입니다. 상대방의 발언에 직접적으로 반응하면서 짧고 간결하게 응답하세요."""
        
        data = {
            'model': 'claude-3-5-haiku-20241022',
            'max_tokens': 150,
            'system': system_prompt,
            'messages': [
                {'role': 'user', 'content': user_content}
            ],
            'temperature': config.temperature,
            'top_p': config.top_p
        }
        
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content_blocks = result.get('content', [])
            
            if content_blocks and len(content_blocks) > 0:
                first_block = content_blocks[0]
                if isinstance(first_block, dict):
                    content = first_block.get('text', '')
                else:
                    content = str(first_block)
            else:
                content = ''
            
            # 응답 정리
            content = clean_response_text(content)
            content = ensure_complete_sentence(content)
            
            # 토큰 사용량
            usage = result.get('usage', {})
            prompt_tokens = usage.get('input_tokens', 0)
            completion_tokens = usage.get('output_tokens', 0)
            total_tokens = prompt_tokens + completion_tokens
            
            return LLMResponse(
                success=True,
                text=content,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens
            )
        else:
            try:
                error_data = response.json()
                error_detail = error_data.get('error', {})
                if isinstance(error_detail, dict):
                    error_msg = error_detail.get('message', '알 수 없는 오류')
                else:
                    error_msg = str(error_detail)
            except:
                error_msg = f'상태 코드: {response.status_code}'
            
            return LLMResponse(success=False, error=f'Anthropic API 오류: {error_msg}')
            
    except requests.exceptions.Timeout:
        return LLMResponse(success=False, error='요청 시간이 초과되었습니다.')
    except Exception as e:
        return LLMResponse(success=False, error=f'오류 발생: {str(e)}')

def generate_llm_response(config: LLMRequestConfig, custom_system_prompt: Optional[str] = None, other_persona: Optional[str] = None) -> LLMResponse:
    """
    LLM API를 사용하여 응답 생성하는 메인 함수
    
    Args:
        config: LLMRequestConfig 객체 (모든 설정 포함)
    
    Returns:
        LLMResponse 객체
    """
    if not config.api_key or not config.api_key.strip():
        return LLMResponse(success=False, error='API 키가 비어있습니다.')
    
    model_type = config.model_type.lower()
    
    # 명시적으로 지정된 모델 타입 우선 사용
    if model_type == 'anthropic' or config.api_key.startswith('sk-ant-') or config.api_key.startswith('sk-ant-api'):
        return generate_anthropic_response(config, custom_system_prompt, other_persona)
    elif model_type == 'openai' or (config.api_key.startswith('sk-') and not config.api_key.startswith('sk-ant')):
        return generate_openai_response(config, custom_system_prompt, other_persona)
    elif model_type == 'google' or config.api_key.startswith('AIza'):
        return LLMResponse(success=False, error='Google API는 아직 지원되지 않습니다.')
    else:
        # 기본적으로 API 키 형식으로 자동 감지
        if config.api_key.startswith('sk-ant-') or config.api_key.startswith('sk-ant-api'):
            return generate_anthropic_response(config, custom_system_prompt, other_persona)
        elif config.api_key.startswith('sk-'):
            return generate_openai_response(config, custom_system_prompt, other_persona)
        else:
            return LLMResponse(success=False, error=f'지원하지 않는 모델 타입입니다: {model_type}')

