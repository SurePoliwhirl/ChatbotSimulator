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
    # OpenAI와 Anthropic은 cl100k_base 인코딩 사용 (GPT-3.5, GPT-4, Claude)
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


def build_system_prompt(topic: str, persona: str) -> str:
    """
    시스템 프롬프트 생성
    
    Args:
        topic: 주제
        persona: 페르소나
    
    Returns:
        시스템 프롬프트 문자열
    """
    return f"""당신은 {persona} 역할을 맡고 있습니다. 
다른 사람과 자연스러운 대화를 나누고 있습니다. 
주제: {topic}

절대적으로 지켜야 할 규칙:
1. 반드시 한국어로만 응답하세요. 영어, 일본어, 중국어 등 다른 언어는 절대 사용하지 마세요.
2. 반드시 완전한 문장으로 끝나야 합니다. 마침표(.), 느낌표(!), 물음표(?) 중 하나로 끝나야 합니다.
3. 절대로 문장 중간에 끊기면 안 됩니다. 토큰 제한이 있어도 반드시 완전한 문장을 만들어야 합니다.
4. 한 번에 1-2문장으로만 응답하세요. 더 길게 쓰지 마세요.
5. 실제 사람들이 대화하듯이 자연스럽게 말하세요.
6. {persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다."""


def build_user_message(topic: str, persona: str, is_first: bool) -> str:
    """
    사용자 메시지 생성
    
    Args:
        topic: 주제
        persona: 페르소나
        is_first: 첫 메시지인지 여부
    
    Returns:
        사용자 메시지 문자열
    """
    if is_first:
        return f"{topic}에 대해 {persona}로서 간단히 의견을 말해주세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
    else:
        return "대화를 자연스럽게 이어가세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."


def estimate_message_tokens(
    model_type: str,
    topic: str,
    persona: str,
    previous_messages_count: int,
    max_history_messages: int = 4,
    is_first_message: bool = False,
    estimated_response_length: int = 80  # 예상 응답 길이 (토큰)
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
    
    Returns:
        {'prompt_tokens': int, 'completion_tokens': int, 'total_tokens': int}
    """
    encoding = get_encoding_for_model(model_type)
    
    # 시스템 프롬프트 토큰 수
    system_prompt = build_system_prompt(topic, persona)
    system_tokens = len(encoding.encode(system_prompt))
    
    # 사용자 메시지 토큰 수
    user_message = build_user_message(topic, persona, is_first_message)
    user_tokens = len(encoding.encode(user_message))
    
    # 대화 히스토리 토큰 수 (평균 메시지 길이 추정)
    # 실제 대화에서는 메시지가 점점 길어질 수 있지만, 평균적으로 80 토큰 정도로 추정
    avg_message_tokens = 80
    history_messages_count = min(previous_messages_count, max_history_messages)
    
    # 히스토리 메시지는 user/assistant 역할로 각각 포함
    # 각 메시지마다 role 토큰 + content 토큰 + formatting 토큰 (약 4 토큰)
    history_tokens = history_messages_count * (avg_message_tokens + 4)
    
    # 모델별 입력 토큰 계산
    if model_type == 'openai':
        # OpenAI: system + messages (각 메시지마다 role + content)
        prompt_tokens = system_tokens + user_tokens + history_tokens + 4  # formatting overhead
    elif model_type == 'anthropic':
        # Anthropic: system + messages
        prompt_tokens = system_tokens + user_tokens + history_tokens + 4
    else:  # google
        # Google: context + prompt (단일 텍스트로 합쳐짐)
        context = system_prompt
        # 히스토리 메시지 포맷팅
        for _ in range(history_messages_count):
            context += f"\n챗봇 1: [메시지]\n챗봇 2: [메시지]\n"
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
    max_history_messages: int = 4,
    estimated_response_length: int = 80
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
        max_history_messages: 최대 히스토리 메시지 수
        estimated_response_length: 예상 응답 길이 (토큰)
    
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
            is_first = (msg_idx == 0)
            previous_count = msg_idx
            
            model_type = model_type1 if bot_number == 1 else model_type2
            persona = persona1 if bot_number == 1 else persona2
            
            tokens = estimate_message_tokens(
                model_type=model_type,
                topic=topic,
                persona=persona,
                previous_messages_count=previous_count,
                max_history_messages=max_history_messages,
                is_first_message=is_first,
                estimated_response_length=estimated_response_length
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

