"""
LLM API를 사용하여 실제 응답 생성
OpenAI, Anthropic, Google 등의 API를 호출합니다.
"""
import requests
import re
from typing import Dict, List, Optional
from config import LLMRequestConfig, LLMResponse

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

def generate_openai_response(config: LLMRequestConfig) -> LLMResponse:
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
        
        # 시스템 프롬프트
        system_prompt = f"""당신은 {config.persona} 역할을 맡고 있습니다. 
다른 사람과 자연스러운 대화를 나누고 있습니다. 
주제: {config.topic}

절대적으로 지켜야 할 규칙:
1. 반드시 한국어로만 응답하세요. 영어, 일본어, 중국어 등 다른 언어는 절대 사용하지 마세요.
2. 반드시 완전한 문장으로 끝나야 합니다. 마침표(.), 느낌표(!), 물음표(?) 중 하나로 끝나야 합니다.
3. 절대로 문장 중간에 끊기면 안 됩니다. 토큰 제한이 있어도 반드시 완전한 문장을 만들어야 합니다.
4. 한 번에 1-2문장으로만 응답하세요. 더 길게 쓰지 마세요.
5. 실제 사람들이 대화하듯이 자연스럽게 말하세요.
6. {config.persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다."""
        
        messages.append({
            'role': 'system',
            'content': system_prompt
        })
        
        # 이전 대화 히스토리 추가
        for msg in config.previous_messages[-config.max_history_messages:]:
            role = 'user' if msg['bot'] == (3 - config.bot_number) else 'assistant'
            messages.append({
                'role': role,
                'content': msg['text']
            })
        
        # 현재 챗봇의 응답 요청
        if not config.previous_messages:
            user_message = f"{config.topic}에 대해 {config.persona}로서 간단히 의견을 말해주세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        else:
            user_message = "대화를 자연스럽게 이어가세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        
        messages.append({
            'role': 'user',
            'content': user_message
        })
        
        data = {
            'model': 'gpt-3.5-turbo',  # 비용 절감을 위해 3.5 사용
            'messages': messages,
            'max_tokens': config.max_tokens,
            'temperature': config.temperature,
            'top_p': config.top_p,
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
            # 완전한 문장으로 끝나도록 후처리
            content = ensure_complete_sentence(content)
            return LLMResponse(success=True, text=content)
        else:
            error_msg = response.json().get('error', {}).get('message', '알 수 없는 오류')
            return LLMResponse(success=False, error=f'OpenAI API 오류: {error_msg}')
            
    except requests.exceptions.Timeout:
        return LLMResponse(success=False, error='요청 시간이 초과되었습니다.')
    except Exception as e:
        return LLMResponse(success=False, error=f'오류 발생: {str(e)}')

def generate_anthropic_response(config: LLMRequestConfig) -> LLMResponse:
    """
    Anthropic (Claude) API를 사용하여 응답 생성
    """
    try:
        headers = {
            'x-api-key': config.api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }
        
        # 대화 히스토리 구성
        messages = []
        
        # 이전 대화 히스토리 추가
        for msg in config.previous_messages[-config.max_history_messages:]:
            role = 'user' if msg['bot'] == (3 - config.bot_number) else 'assistant'
            messages.append({
                'role': role,
                'content': msg['text']
            })
        
        # 시스템 프롬프트
        system_prompt = f"""당신은 {config.persona} 역할을 맡고 있습니다. 
다른 사람과 자연스러운 대화를 나누고 있습니다. 
주제: {config.topic}

절대적으로 지켜야 할 규칙:
1. 반드시 한국어로만 응답하세요. 영어, 일본어, 중국어 등 다른 언어는 절대 사용하지 마세요.
2. 반드시 완전한 문장으로 끝나야 합니다. 마침표(.), 느낌표(!), 물음표(?) 중 하나로 끝나야 합니다.
3. 절대로 문장 중간에 끊기면 안 됩니다. 토큰 제한이 있어도 반드시 완전한 문장을 만들어야 합니다.
4. 한 번에 1-2문장으로만 응답하세요. 더 길게 쓰지 마세요.
5. 실제 사람들이 대화하듯이 자연스럽게 말하세요.
6. {config.persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다."""
        
        # 현재 챗봇의 응답 요청
        if not config.previous_messages:
            user_message = f"{config.topic}에 대해 {config.persona}로서 간단히 의견을 말해주세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        else:
            user_message = "대화를 자연스럽게 이어가세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        
        messages.append({
            'role': 'user',
            'content': user_message
        })
        
        data = {
            'model': 'claude-3-haiku-20240307',  # 비용 절감을 위해 haiku 사용
            'max_tokens': config.max_tokens,
            'temperature': config.temperature,
            'top_p': config.top_p,
            'system': system_prompt,
            'messages': messages
        }
        
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['content'][0]['text'].strip()
            # 완전한 문장으로 끝나도록 후처리
            content = ensure_complete_sentence(content)
            return LLMResponse(success=True, text=content)
        else:
            error_msg = response.json().get('error', {}).get('message', '알 수 없는 오류')
            return LLMResponse(success=False, error=f'Anthropic API 오류: {error_msg}')
            
    except requests.exceptions.Timeout:
        return LLMResponse(success=False, error='요청 시간이 초과되었습니다.')
    except Exception as e:
        return LLMResponse(success=False, error=f'오류 발생: {str(e)}')

def generate_google_response(config: LLMRequestConfig) -> LLMResponse:
    """
    Google (Gemini) API를 사용하여 응답 생성
    """
    try:
        # 대화 히스토리 구성
        context = f"""당신은 {config.persona} 역할을 맡고 있습니다. 다른 사람과 자연스러운 대화를 나누고 있습니다.
주제: {config.topic}

절대적으로 지켜야 할 규칙:
1. 반드시 한국어로만 응답하세요. 영어, 일본어, 중국어 등 다른 언어는 절대 사용하지 마세요.
2. 반드시 완전한 문장으로 끝나야 합니다. 마침표(.), 느낌표(!), 물음표(?) 중 하나로 끝나야 합니다.
3. 절대로 문장 중간에 끊기면 안 됩니다. 토큰 제한이 있어도 반드시 완전한 문장을 만들어야 합니다.
4. 한 번에 1-2문장으로만 응답하세요. 더 길게 쓰지 마세요.
5. 실제 사람들이 대화하듯이 자연스럽게 말하세요.
6. {config.persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다.

대화 히스토리:
"""
        
        for msg in config.previous_messages[-config.max_history_messages:]:
            bot_name = f"챗봇 {msg['bot']}"
            context += f"{bot_name}: {msg['text']}\n"
        
        if not config.previous_messages:
            prompt = f"{config.topic}에 대해 {config.persona}로서 간단히 의견을 말해주세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        else:
            prompt = "대화를 자연스럽게 이어가세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={config.api_key}'
        
        data = {
            'contents': [{
                'parts': [{
                    'text': context + prompt
                }]
            }],
            'generationConfig': {
                'maxOutputTokens': config.max_tokens,
                'temperature': config.temperature,
                'topP': config.top_p
            }
        }
        
        response = requests.post(url, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            content = result['candidates'][0]['content']['parts'][0]['text'].strip()
            # 완전한 문장으로 끝나도록 후처리
            content = ensure_complete_sentence(content)
            return LLMResponse(success=True, text=content)
        else:
            error_msg = response.json().get('error', {}).get('message', '알 수 없는 오류')
            return LLMResponse(success=False, error=f'Google API 오류: {error_msg}')
            
    except requests.exceptions.Timeout:
        return LLMResponse(success=False, error='요청 시간이 초과되었습니다.')
    except Exception as e:
        return LLMResponse(success=False, error=f'오류 발생: {str(e)}')

def generate_llm_response(config: LLMRequestConfig) -> LLMResponse:
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
        return generate_openai_response(config)
    elif model_type == 'anthropic' or 'anthropic' in config.api_key.lower():
        return generate_anthropic_response(config)
    elif model_type == 'google' or 'google' in model_type.lower():
        return generate_google_response(config)
    else:
        # 기본적으로 OpenAI로 시도
        if config.api_key.startswith('sk-'):
            return generate_openai_response(config)
        else:
            return LLMResponse(success=False, error=f'지원하지 않는 모델 타입입니다: {model_type}')

