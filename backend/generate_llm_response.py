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
    gpt-4o 모델 사용
    
    Args:
        api_key: OpenAI API 키
        topic: 대화 주제
        persona1: 챗봇 1의 페르소나
        persona2: 챗봇 2의 페르소나
    
    Returns:
        생성된 프롬프트 문자열 (실패 시 None)
    """
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        prompt_generation_message = f"""너의 역할은 "멀티턴 대화용 역할 프롬프트 생성기"이다.

아래 입력을 기반으로 역할 프롬프트를 생성하라.


주제: {topic}
페르소나1: {persona1}
페르소나2: {persona2}

목표:
- 위 주제 상황에서 페르소나1과 페르소나2가 멀티턴 대화를 자연스럽게 이어갈 수 있도록 각자가 사용할 "역할 프롬프트"를 생성한다.

중요한 전제:
- 반드시 "챗봇1용 역할 프롬프트"와 "챗봇2용 역할 프롬프트"를 분리해서 작성하라.

출력해야 할 것:
1) (챗봇1에 대한) 역할 프롬프트
2) (챗봇2에 대한) 역할 프롬프트

각 역할 프롬프트는 반드시 아래 구조를 따른다:

(챗봇N에 대한)
당신은 ○○입니다.

역할 규칙:
- …
- …
- …

역할 규칙 작성 지침 (반드시 반영할 것):

[1] 페르소나 고정
- 각 역할은 자신의 페르소나에 맞는 말과 행동만 해야 한다.
- 두 역할이 서로 바뀐 것처럼 보이지 않도록 강하게 구분하라.

[2] 정보 흐름 비대칭
- 누가 질문하는 입장인지
- 누가 정보를 제공·설명하는 입장인지
를 명확히 나눠라.

[3] 정보 부족 상황 대응
- 정보 제공자 역할에는:
  - 현실적으로 그럴듯한 가상 수치, 조건, 사례를 들어 설명해도 된다고 명시하라.
- 정보 수용자 역할에는:
  - 헷갈림, 불안, 의심, 비교, 재질문을 표현해도 된다고 명시하라.

[4] 멀티턴 대화 유지
- 같은 말이나 같은 질문을 반복하지 않도록 유도하라.

출력 규칙 (매우 중요):
- 반드시 한국어로만 작성하라.
- 설명, 해설, 이유를 쓰지 마라.
- 번호 매기기, JSON, 코드 블록을 사용하지 마라.
- 오직 역할 프롬프트 결과만 출력하라.

출력 형식은 반드시 아래와 같아야 한다:

(챗봇1에 대한)
당신은 …

역할 규칙:
- …
- …
- …

(챗봇2에 대한)
당신은 …

역할 규칙:
- …
- …
- …"""
        
        data = {
            'model': 'gpt-4o',
            'messages': [
                {
                    'role': 'system',
                    'content': '대화 시뮬레이션용 시스템 프롬프트 작성 전문가. 역할 혼동 방지, 자연스러운 대화 흐름, 페르소나 특성 반영이 필수.'
                },
                {
                    'role': 'user',
                    'content': prompt_generation_message
                }
            ],
            'temperature': 0.5,
            'max_tokens': 400
        }
        
        print(f"프롬프트 생성 시도 - 모델: gpt-4o")
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # 응답 구조 확인
            if 'choices' not in result or len(result['choices']) == 0:
                print(f"응답에 choices가 없거나 비어있음: {result}")
                return None
            
            choice = result['choices'][0]
            if 'message' not in choice or 'content' not in choice['message']:
                print(f"응답 구조가 예상과 다름: {choice}")
                return None
            
            original_content = choice['message']['content']
            
            if not original_content or not original_content.strip():
                print(f"원본 content가 비어있음")
                return None
            
            generated_prompt = original_content.strip()
            
            # 단순히 앞뒤 따옴표만 제거 (프롬프트는 clean_response_text 사용 안 함)
            if generated_prompt:
                if (generated_prompt.startswith('"') and generated_prompt.endswith('"')) or \
                   (generated_prompt.startswith("'") and generated_prompt.endswith("'")):
                    generated_prompt = generated_prompt[1:-1].strip()
                elif generated_prompt.startswith('"'):
                    generated_prompt = generated_prompt[1:].strip()
                elif generated_prompt.endswith('"'):
                    generated_prompt = generated_prompt[:-1].strip()
            
            if generated_prompt:
                print(f"프롬프트 생성 성공 - 길이: {len(generated_prompt)}")
                print(f"프롬프트 생성 성공 : {generated_prompt}")
                return generated_prompt
            else:
                print(f"정리 후 프롬프트가 비어있음")
                return None
        else:
            # 에러 발생
            try:
                error_data = response.json()
                print(f"프롬프트 생성 실패 - 상태 코드: {response.status_code}, 에러: {error_data.get('error', {}).get('message', 'Unknown error')}")
            except:
                print(f"프롬프트 생성 실패 - 상태 코드: {response.status_code}, 응답: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"프롬프트 생성 타임아웃")
        return None
    except Exception as e:
        print(f"프롬프트 생성 오류: {str(e)}")
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
        
        # 시스템 프롬프트 (커스텀 프롬프트가 있으면 사용, 없으면 기본 프롬프트)
        other_bot_number = 3 - config.bot_number
        
        # 페르소나에서 역할 특성 추론
        # 상대방 페르소나가 있으면 두 페르소나를 비교하여 역할 판별
        # 커스텀 프롬프트가 있으면 프롬프트가 역할을 구분하므로, fallback으로만 사용
        persona_description = config.persona.lower()
        other_persona_description = other_persona.lower() if other_persona else ""
        
        # 기본적으로 정보 요청자로 가정 (더 안전한 기본값)
        is_info_provider = False
        
        # 커스텀 프롬프트가 없을 때만 역할 판별 (fallback)
        if not custom_system_prompt:
            # 상대방 페르소나가 있으면 비교 판별
            if other_persona:
                # 두 페르소나를 비교하여 역할 판별
                # 한쪽에 "직원", "상담사" 등이 있고 다른 쪽에 "고객", "학생" 등이 있으면 명확
                info_provider_keywords = ["직원", "상담사", "전문가", "교사", "강사", "상담원"]
                info_seeker_keywords = ["고객", "학생", "사용자", "회원", "이용자"]
                
                has_provider_in_persona = any(kw in persona_description for kw in info_provider_keywords)
                has_seeker_in_persona = any(kw in persona_description for kw in info_seeker_keywords)
                has_provider_in_other = any(kw in other_persona_description for kw in info_provider_keywords)
                has_seeker_in_other = any(kw in other_persona_description for kw in info_seeker_keywords)
                
                # 현재 페르소나에 정보 제공자 키워드가 있고, 정보 요청자 키워드가 없으면 info_provider
                # 또는 상대방이 명확히 정보 요청자이고 현재 페르소나에 정보 제공자 키워드가 있으면 info_provider
                if (has_provider_in_persona and not has_seeker_in_persona) or \
                   (has_seeker_in_other and has_provider_in_persona):
                    is_info_provider = True
            else:
                # 상대방 페르소나가 없으면 현재 페르소나만으로 판별 (fallback)
                info_provider_keywords = ["직원", "상담사", "전문가", "교사", "강사", "상담원"]
                info_seeker_keywords = ["고객", "학생", "사용자", "회원", "이용자"]
                
                has_provider_keyword = any(keyword in persona_description for keyword in info_provider_keywords)
                has_seeker_keyword = any(keyword in persona_description for keyword in info_seeker_keywords)
                
                # 정보 제공자 키워드가 있고, 정보 요청자 키워드가 없을 때만 info_provider
                is_info_provider = has_provider_keyword and not has_seeker_keyword
        
        if custom_system_prompt:
            # 커스텀 프롬프트에서 {persona} 변수를 실제 페르소나로 치환
            system_prompt = custom_system_prompt.replace('{persona}', config.persona)
        else:
            # 기본 프롬프트 (fallback)
            
            # 역할별 기본 지시사항 (도메인 독립적)
            if is_info_provider:
                role_instruction = """당신은 정보나 서비스를 제공하는 역할입니다. 다음을 반드시 지키세요:
- 구체적이고 실질적인 정보를 제공하세요 (막연한 표현 대신 구체적인 내용, 예시, 옵션을 제시)
- 상대방의 질문이나 요청에 직접적으로 답하세요
- 정책, 규칙, 가이드라인을 중시한다면 그에 따른 정확한 정보를 말하세요"""
            else:
                role_instruction = """당신은 정보를 요청하거나 의견을 표현하는 역할입니다. 다음을 반드시 지키세요:
- 자신의 상황, 감정, 요구사항, 의견을 구체적으로 표현하세요
- 상대방에게 정보를 요청하거나 질문하세요
- 상대방의 역할을 대신하여 설명하거나 조언하지 마세요
- 자신의 역할에 맞는 반응만 하세요"""
            
            system_prompt = f"""당신은 {config.persona}의 관점을 가진 실제 사람입니다. 상대방과 자연스러운 대화를 나누고 있습니다.

{role_instruction}

절대 금지 사항:
- 상대방의 역할을 대신하는 발언을 하지 마세요
- 이전에 이미 말한 내용을 그대로 반복하지 마세요
- "알려드릴게요", "확인해보세요", "일반적으로", "보통", "필요에 따라" 같은 막연한 표현을 사용하지 마세요

대화 진전 규칙:
1. 구체성 필수:
   - 막연한 표현 대신 구체적인 정보, 예시, 숫자, 옵션, 상황을 제시하세요
   - 질문에 답할 때는 실제 내용을 포함하세요
   - 추상적인 설명보다는 구체적인 사례나 예시를 사용하세요
   
2. 페르소나 특성 반영:
   - {config.persona}에 명시된 모든 특성을 대화에 자연스럽게 반영하세요
   - 성격, 태도, 가치관, 행동 패턴이 대화 톤과 내용에 드러나도록 하세요

3. 이전 대화 활용 (매우 중요):
   - 상대방이 이미 말한 내용을 절대 다시 물어보지 마세요
   - 예: 상대방이 "데이터가 부족하다"고 말했다면, "어떤 부분이 부족한가요?"라고 다시 물어보지 마세요
   - 예: 상대방이 "약정 기간과 요금에 대해 모르겠다"고 말했다면, 그 정보를 제공하세요
   - 이전 정보를 바탕으로 더 구체적이고 진전된 내용을 추가하세요
   - 대화의 흐름을 이어가되, 같은 내용을 반복하지 마세요
   - 이전 대화에서 이미 답변한 내용을 다시 질문하지 마세요

4. 목적 지향:
   - 주제 '{config.topic}'에 대한 대화 목적을 염두에 두고 한 단계씩 목적에 가까워지도록 말하세요
   - 같은 내용을 반복하지 말고 새로운 정보, 관점, 또는 다음 단계를 제시하세요

응답 형식:
- 한국어로만 응답하세요
- 1~2개의 완전한 문장만 사용하세요
- 문장은 마침표(.), 느낌표(!), 물음표(?) 중 하나로 끝내세요
- 따옴표나 인용 부호는 사용하지 마세요
- "통신사 고객:", "통신사 직원:", "고객:", "직원:" 같은 역할 표시를 절대 포함하지 마세요
- 역할을 직접 말하지 말고, 자연스럽게 대화하세요"""


        # 현재 챗봇의 응답 요청
        if not config.previous_messages:
            # 첫 메시지: 역할에 맞는 시작
            if is_info_provider:
                user_message = f"""
            주제 '{config.topic}'에 대해 대화를 시작합니다.

            당신은 {config.persona}입니다. 당신은 정보나 서비스를 제공하는 역할입니다.
            상대방이 도움을 요청할 것으로 예상됩니다.
            자신의 역할(정보 제공자)에 맞게 자연스럽게 대화를 시작하세요.
            절대 상대방의 역할(정보 요청자)을 대신하여 질문하거나 설명하지 마세요.
            """
            else:
                user_message = f"""
            주제 '{config.topic}'에 대해 대화를 시작합니다.

            당신은 {config.persona}입니다. 당신은 정보를 요청하거나 의견을 표현하는 역할입니다.
            자신의 상황, 요구사항, 질문을 자연스럽게 표현하세요.
            절대 상대방의 역할(정보 제공자)을 대신하여 설명하거나 조언하지 마세요.
            절대 "궁금하신가요?", "어떤 정보가 필요하신가요?" 같은 정보 제공자 톤을 사용하지 마세요.
            """
        else:
            last_message = config.previous_messages[-1]
            other_bot = last_message['bot']
            
            # 이전 대화 맥락 요약 (최근 2-3개 메시지)
            recent_context = ""
            if len(config.previous_messages) > 1:
                context_messages = config.previous_messages[-3:] if len(config.previous_messages) >= 3 else config.previous_messages
                context_texts = [f"챗봇 {msg['bot']}: {msg['text']}" for msg in context_messages]
                recent_context = "\n\n[중요] 이전 대화 맥락 (반드시 참고하세요):\n" + "\n".join(context_texts) + "\n\n위 대화에서 이미 언급된 내용을 다시 물어보지 마세요. 이미 말한 정보를 활용하여 대화를 진행하세요.\n"
            
            # 역할별 구체적 지시사항 (도메인 독립적)
            if is_info_provider:
                specific_instruction = """
            [역할] 당신은 정보나 서비스를 제공하는 역할입니다.
            
            [반드시 지키세요]:
            - 상대방의 질문이나 요청에 구체적이고 실질적인 정보로 직접 답하세요
            - "알려드릴게요", "확인해보세요" 같은 막연한 표현 대신 실제 정보, 예시, 옵션을 제시하세요
            - 상대방이 이미 말한 내용을 다시 물어보지 마세요 (예: 상대방이 "데이터가 부족하다"고 말했다면, "어떤 부분이 부족한가요?"라고 다시 물어보지 마세요)
            - 상대방의 역할을 대신하여 질문하거나 설명하지 마세요
            - 같은 질문이나 비슷한 질문을 여러 번 하지 마세요"""
            else:
                specific_instruction = """
            [역할] 당신은 정보를 요청하거나 의견을 표현하는 역할입니다 (고객, 학생, 사용자 등).
            
            [반드시 지키세요]:
            - 자신의 상황, 감정, 요구사항, 의견을 구체적으로 표현하세요
            - 상대방에게 정보를 요청하거나 질문할 수 있지만, 상대방의 역할을 대신하여 설명하거나 조언하지 마세요
            - 절대 정보 제공자처럼 말하지 마세요
            - 절대 "궁금하신가요?", "어떤 정보가 필요하신가요?", "안내해드릴게요" 같은 정보 제공자 톤을 사용하지 마세요
            - 절대 상대방처럼 말하지 마세요 (예: "고객님" 같은 호칭 사용 금지)
            - 상대방이 이미 말한 내용을 다시 물어보지 마세요
            - 같은 질문이나 비슷한 질문을 여러 번 하지 마세요"""
            
            # 이미 언급된 내용 추출 (간단한 요약)
            mentioned_info = ""
            if len(config.previous_messages) > 0:
                all_previous_text = " ".join([msg['text'] for msg in config.previous_messages])
                # 간단한 키워드 추출 (더 정교한 방법은 나중에 개선 가능)
                mentioned_info = f"\n[참고] 이전 대화에서 이미 언급된 내용: {all_previous_text[:200]}...\n위 내용을 다시 물어보지 말고, 이를 바탕으로 대화를 진행하세요.\n"
            
            user_message = f"""
            상대방이 방금 한 말입니다:

            "{last_message['text']}"
            {recent_context}
            {mentioned_info}
            {specific_instruction}
            
            [중요 지시사항]:
            1. 상대방의 말에 직접적으로 반응하되, 이미 말한 내용을 다시 물어보지 마세요
            2. 이전 대화 맥락을 활용하여 새로운 정보나 다음 단계를 제시하세요
            3. 대화를 한 단계 더 구체적이고 진전된 방향으로 이끌어가세요
            4. {config.persona}의 특성을 대화에 자연스럽게 반영하세요
            5. 절대 역할 표시("통신사 고객:", "고객:", "직원:" 등)를 포함하지 마세요
            6. 따옴표나 인용 부호를 사용하지 마세요
            7. 역할을 직접 말하지 말고, 자연스럽게 대화하세요
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
        
        # 모델에 따라 적절한 파라미터 사용
        model_name = 'gpt-3.5-turbo'  # 비용 절감을 위해 3.5 사용
        is_new_model = 'gpt-5' in model_name or 'o1' in model_name.lower()
        
        data = {
            'model': model_name,
            'messages': messages,
            'temperature': config.temperature,
            'top_p': config.top_p,
            'stop': None  # stop sequence 제거
        }
        
        # 새로운 모델은 max_completion_tokens 사용
        if is_new_model:
            data['max_completion_tokens'] = config.max_tokens
        else:
            data['max_tokens'] = config.max_tokens
        
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
            
            return LLMResponse(
                success=True, 
                text=content,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens
            )
        else:
            error_msg = response.json().get('error', {}).get('message', '알 수 없는 오류')
            return LLMResponse(success=False, error=f'OpenAI API 오류: {error_msg}')
            
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
    
    if model_type == 'openai' or config.api_key.startswith('sk-'):
        return generate_openai_response(config, custom_system_prompt, other_persona)
    # elif model_type == 'anthropic' or 'anthropic' in config.api_key.lower():
    #     return generate_anthropic_response(config)
    # elif model_type == 'google' or 'google' in model_type.lower():
    #     return generate_google_response(config)
    else:
        # 기본적으로 OpenAI로 시도
        if config.api_key.startswith('sk-'):
            return generate_openai_response(config, custom_system_prompt, other_persona)
        else:
            return LLMResponse(success=False, error=f'지원하지 않는 모델 타입입니다: {model_type}')

