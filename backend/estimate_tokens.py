"""
토큰 사용량 예측을 위한 유틸리티 함수
"""
import tiktoken
from typing import Dict, List, Optional


def get_encoding_for_model(model_type: str) -> tiktoken.Encoding:
    """
    모델 타입에 맞는 tiktoken 인코딩 반환
    
    Args:
        model_type: 'openai', 'anthropic', 'google'
    
    Returns:
        tiktoken.Encoding 객체
    """
    # OpenAI와 Anthropic은 cl100k_base 인코딩 사용 (GPT-3.5, GPT-4, GPT-4o, GPT-5.1, GPT-5.2, Claude)
    # Google은 별도 인코딩이지만, 대략적인 추정을 위해 cl100k_base 사용
    try:
        return tiktoken.get_encoding("cl100k_base")
    except Exception:
        # fallback
        return tiktoken.get_encoding("gpt2")


def count_tokens(text: str, model_type: str = 'openai') -> int:
    """
    텍스트의 토큰 수 계산
    
    Args:
        text: 토큰 수를 계산할 텍스트
        model_type: 모델 타입
    
    Returns:
        토큰 수
    """
    encoding = get_encoding_for_model(model_type)
    return len(encoding.encode(text))


def build_system_prompt(topic: str, persona: str, bot_number: int, other_bot_number: int) -> str:
    """
    시스템 프롬프트 생성 (실제 generate_llm_response.py와 동일)
    
    Args:
        topic: 주제
        persona: 페르소나
        bot_number: 챗봇 번호 (1 or 2)
        other_bot_number: 상대방 챗봇 번호
    
    Returns:
        시스템 프롬프트 문자열
    """
    return f"""당신은 챗봇 {bot_number}입니다. {persona}의 역할을 맡고 있습니다.

현재 상황:
- 주제: {topic}
- 당신은 챗봇 {bot_number} ({persona})
- 상대방은 챗봇 {other_bot_number}
- 두 챗봇이 {topic}에 대해 대화를 나누고 있습니다.

당신의 역할 (매우 중요):
- 이것은 단순한 독백이 아닌 **실제 대화**입니다.
- 상대방(챗봇 {other_bot_number})의 발언에 **반드시 직접적으로 반응**해야 합니다.
- 상대방의 말에 대해 질문하거나, 공감하거나, 동의하거나, 반대 의견을 제시하거나, 상대방의 말을 인용해야 합니다.
- 절대로 주제에 대해 독립적으로 말만 하면 안 됩니다. 상대방과의 상호작용이 필수입니다.
- "그렇긴 하지만", "맞는 말이에요", "그런데", "그렇다면" 같은 연결어를 사용하여 상대방의 말과 연결하세요.
- {persona}의 관점을 유지하면서도 상대방과 소통해야 합니다.

대화 예시 (올바른 방식):
- "그 말에 동의해요. 하지만 한 가지 더 생각해볼 점은..."
- "흥미로운 관점이네요. 그렇다면 ...에 대해서는 어떻게 생각하세요?"
- "그 부분은 다르게 볼 수도 있을 것 같아요. 예를 들어..."

대화 예시 (잘못된 방식 - 하지 마세요):
- 주제에 대해 독립적으로 의견만 말하기
- 상대방의 발언을 무시하고 자신의 생각만 말하기

절대적으로 지켜야 할 규칙:
1. 반드시 한국어로만 응답하세요. 영어, 일본어, 중국어 등 다른 언어는 절대 사용하지 마세요.
2. 반드시 완전한 문장으로 끝나야 합니다. 마침표(.), 느낌표(!), 물음표(?) 중 하나로 끝나야 합니다.
3. 절대로 문장 중간에 끊기면 안 됩니다. 토큰 제한이 있어도 반드시 완전한 문장을 만들어야 합니다.
4. 한 번에 1-2문장으로만 응답하세요. 더 길게 쓰지 마세요.
5. **상대방의 발언에 직접적으로 반응하고, 질문하거나 공감하거나 동의하거나 반대하세요.**
6. {persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다.
- **상대방과의 실제 대화라는 것을 명확히 인지하고, 상대방의 발언에 반드시 반응하세요.**"""


def build_user_message(topic: str, persona: str, is_first: bool, last_message_text: str = "", other_bot: int = 0) -> str:
    """
    사용자 메시지 생성 (실제 generate_llm_response.py와 동일)
    
    Args:
        topic: 주제
        persona: 페르소나
        is_first: 첫 메시지인지 여부
        last_message_text: 마지막 메시지 텍스트 (첫 메시지가 아닐 경우)
        other_bot: 상대방 챗봇 번호 (첫 메시지가 아닐 경우)
    
    Returns:
        사용자 메시지 문자열
    """
    if is_first:
        return f"주제 '{topic}'에 대해 {persona}로서 첫 번째 발언을 시작하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
    else:
        return f"""상대방(챗봇 {other_bot})이 방금 '{last_message_text}'라고 말했습니다.

이제 당신이 응답해야 합니다. 다음 중 하나 이상을 반드시 포함하세요:
- 상대방의 말에 질문하기 (예: "그렇다면 ...에 대해서는 어떻게 생각하세요?")
- 상대방의 말에 공감하기 (예: "맞는 말이에요", "그렇네요")
- 상대방의 말에 동의하기 (예: "동의합니다", "그 말이 맞아요")
- 상대방의 말에 반대 의견 제시하기 (예: "그렇긴 하지만", "다른 관점에서 보면")
- 상대방의 말을 인용하며 반응하기 (예: "말씀하신 ...에 대해 생각해보면")

절대로 주제에 대해 독립적으로 말만 하지 마세요. 상대방의 발언 '{last_message_text}'에 반드시 직접적으로 반응하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."""


def estimate_message_tokens(
    model_type: str,
    topic: str,
    persona: str,
    previous_messages_count: int,
    max_history_messages: int = 4,
    is_first_message: bool = False,
    estimated_response_length: int = 80,  # 예상 응답 길이 (토큰)
    bot_number: int = 1,
    other_bot_number: int = 2,
    last_message_text: str = ""  # 마지막 메시지 텍스트 (히스토리 추정용)
) -> Dict[str, int]:
    """
    단일 메시지의 예상 토큰 수 계산
    
    Args:
        model_type: 모델 타입 ('openai', 'anthropic', 'google')
        topic: 주제
        persona: 페르소나
        previous_messages_count: 이전 메시지 수
        max_history_messages: 최대 히스토리 메시지 수
        is_first_message: 첫 메시지인지 여부
        estimated_response_length: 예상 응답 길이 (토큰)
        bot_number: 챗봇 번호 (1 or 2)
        other_bot_number: 상대방 챗봇 번호
        last_message_text: 마지막 메시지 텍스트 (히스토리 추정용)
    
    Returns:
        {'prompt_tokens': int, 'completion_tokens': int, 'total_tokens': int}
    """
    encoding = get_encoding_for_model(model_type)
    
    # 시스템 프롬프트 토큰 수 (실제 사용되는 긴 프롬프트)
    system_prompt = build_system_prompt(topic, persona, bot_number, other_bot_number)
    system_tokens = len(encoding.encode(system_prompt))
    
    # 사용자 메시지 토큰 수 (실제 사용되는 긴 메시지)
    user_message = build_user_message(topic, persona, is_first_message, last_message_text, other_bot_number)
    user_tokens = len(encoding.encode(user_message))
    
    # 대화 히스토리 토큰 수 (평균 메시지 길이 추정)
    # 실제 응답이 max_tokens까지 나올 수 있으므로, 히스토리 메시지도 같은 길이로 추정
    avg_message_tokens = estimated_response_length
    history_messages_count = min(previous_messages_count, max_history_messages)
    
    # 히스토리 메시지 포맷팅 (실제 사용되는 형식)
    # OpenAI/Anthropic: [챗봇 X의 발언] 또는 [당신(챗봇 X)의 이전 발언] 형식
    # Google: 챗봇 X: [메시지] 형식
    if model_type == 'openai' or model_type == 'anthropic':
        # 각 히스토리 메시지마다 role + content 포맷팅
        # 예: "[챗봇 1의 발언] {메시지}" 또는 "[당신(챗봇 2)의 이전 발언] {메시지}"
        # 평균적으로 "[챗봇 X의 발언] " 또는 "[당신(챗봇 X)의 이전 발언] " 형식이 약 20 토큰 추가
        history_prefix_tokens = 20  # "[챗봇 X의 발언] " 또는 "[당신(챗봇 X)의 이전 발언] " 형식
        history_tokens = history_messages_count * (avg_message_tokens + history_prefix_tokens + 4)  # +4는 role 포맷팅
    else:  # google
        # Google: "챗봇 X: {메시지}\n" 형식
        history_prefix_tokens = 10  # "챗봇 X: " 형식
        history_tokens = history_messages_count * (avg_message_tokens + history_prefix_tokens)
    
    # 모델별 입력 토큰 계산
    if model_type == 'openai':
        # OpenAI: system + messages (각 메시지마다 role + content)
        prompt_tokens = system_tokens + user_tokens + history_tokens + 4  # formatting overhead
    elif model_type == 'anthropic':
        # Anthropic: system + messages
        prompt_tokens = system_tokens + user_tokens + history_tokens + 4
    else:  # google
        # Google: context + prompt (단일 텍스트로 합쳐짐)
        context = system_prompt + "\n\n대화 히스토리:\n"
        # 히스토리 메시지 포맷팅
        for _ in range(history_messages_count):
            context += f"챗봇 1: [메시지]\n챗봇 2: [메시지]\n"
        context += user_message
        prompt_tokens = len(encoding.encode(context))
    
    # 출력 토큰 (예상 응답 길이)
    completion_tokens = estimated_response_length
    
    return {
        'prompt_tokens': prompt_tokens,
        'completion_tokens': completion_tokens,
        'total_tokens': prompt_tokens + completion_tokens
    }


def estimate_simulation_tokens(
    model_type1: str,
    model_type2: str,
    topic: str,
    persona1: str,
    persona2: str,
    turns_per_bot: int,
    number_of_sets: int,
    max_tokens1: int = 120,
    max_tokens2: int = 120,
    temperature1: float = 1.2,
    temperature2: float = 1.2,
    top_p1: float = 0.9,
    top_p2: float = 0.9,
    max_history_messages: int = 4
) -> Dict[str, any]:
    """
    전체 시뮬레이션의 예상 토큰 수 계산
    
    Args:
        model_type1: 챗봇 1의 모델 타입
        model_type2: 챗봇 2의 모델 타입
        topic: 주제
        persona1: 챗봇 1의 페르소나
        persona2: 챗봇 2의 페르소나
        turns_per_bot: 챗봇당 턴 수
        number_of_sets: 대화 세트 수
        max_tokens1: 챗봇 1의 최대 출력 토큰 수
        max_tokens2: 챗봇 2의 최대 출력 토큰 수
        temperature1: 챗봇 1의 temperature 설정
        temperature2: 챗봇 2의 temperature 설정
        top_p1: 챗봇 1의 top_p 설정
        top_p2: 챗봇 2의 top_p 설정
        max_history_messages: 최대 히스토리 메시지 수
    
    Returns:
        {
            'total_tokens': int,
            'total_prompt_tokens': int,
            'total_completion_tokens': int,
            'per_set_tokens': int,
            'per_message_tokens': Dict,
            'breakdown': List[Dict]
        }
    """
    total_messages_per_set = turns_per_bot * 2
    total_prompt_tokens = 0
    total_completion_tokens = 0
    breakdown = []
    
    for set_idx in range(number_of_sets):
        set_prompt_tokens = 0
        set_completion_tokens = 0
        
        for msg_idx in range(total_messages_per_set):
            bot_number = (msg_idx % 2) + 1
            other_bot_number = 3 - bot_number
            is_first = (msg_idx == 0)
            previous_count = msg_idx
            
            model_type = model_type1 if bot_number == 1 else model_type2
            persona = persona1 if bot_number == 1 else persona2
            max_tokens = max_tokens1 if bot_number == 1 else max_tokens2
            temperature = temperature1 if bot_number == 1 else temperature2
            top_p = top_p1 if bot_number == 1 else top_p2
            
            # temperature와 top_p는 응답 길이에 영향을 줄 수 있지만, 
            # 실제 토큰 수에는 max_tokens가 직접적인 제한이므로 max_tokens를 기준으로 사용
            # temperature가 높을수록 더 다양한 응답이 나올 수 있지만, max_tokens 제한 내에서
            estimated_response_length = max_tokens
            
            # 마지막 메시지 텍스트 추정 (히스토리 메시지 포맷팅용)
            # 실제로는 정확한 텍스트를 알 수 없으므로, 평균 응답 길이로 추정
            last_message_text = "[평균 길이의 메시지]" if not is_first else ""
            
            tokens = estimate_message_tokens(
                model_type=model_type,
                topic=topic,
                persona=persona,
                previous_messages_count=previous_count,
                max_history_messages=max_history_messages,
                is_first_message=is_first,
                estimated_response_length=estimated_response_length,
                bot_number=bot_number,
                other_bot_number=other_bot_number,
                last_message_text=last_message_text
            )
            
            set_prompt_tokens += tokens['prompt_tokens']
            set_completion_tokens += tokens['completion_tokens']
            
            if set_idx == 0:  # 첫 세트만 breakdown 저장
                breakdown.append({
                    'set': set_idx + 1,
                    'message': msg_idx + 1,
                    'bot': bot_number,
                    'model_type': model_type,
                    'prompt_tokens': tokens['prompt_tokens'],
                    'completion_tokens': tokens['completion_tokens'],
                    'total_tokens': tokens['total_tokens']
                })
        
        total_prompt_tokens += set_prompt_tokens
        total_completion_tokens += set_completion_tokens
    
    per_set_tokens = (total_prompt_tokens + total_completion_tokens) // number_of_sets if number_of_sets > 0 else 0
    per_message_avg = (total_prompt_tokens + total_completion_tokens) // (total_messages_per_set * number_of_sets) if (total_messages_per_set * number_of_sets) > 0 else 0
    
    return {
        'total_tokens': total_prompt_tokens + total_completion_tokens,
        'total_prompt_tokens': total_prompt_tokens,
        'total_completion_tokens': total_completion_tokens,
        'per_set_tokens': per_set_tokens,
        'per_message_tokens': per_message_avg,
        'breakdown': breakdown[:10]  # 처음 10개만 반환 (너무 많으면 UI에 부담)
    }

