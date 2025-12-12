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
        other_bot_number = 3 - config.bot_number
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
- "그렇긴 하지만", "맞는 말이에요", "그런데", "그렇다면" 같은 연결어를 사용하여 상대방의 말과 연결하세요.
- {config.persona}의 관점을 유지하면서도 상대방과 소통해야 합니다.

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
6. {config.persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다.
- **상대방과의 실제 대화라는 것을 명확히 인지하고, 상대방의 발언에 반드시 반응하세요.**"""
        
        messages.append({
            'role': 'system',
            'content': system_prompt
        })
        
        # 이전 대화 히스토리 추가 (상대방과의 대화임을 명확히 표시)
        for msg in config.previous_messages[-config.max_history_messages:]:
            role = 'user' if msg['bot'] == (3 - config.bot_number) else 'assistant'
            # 상대방의 발언임을 명확히 표시
            if msg['bot'] == (3 - config.bot_number):
                content = f"[챗봇 {msg['bot']}의 발언] {msg['text']}"
            else:
                content = f"[당신(챗봇 {config.bot_number})의 이전 발언] {msg['text']}"
            messages.append({
                'role': role,
                'content': content
            })
        
        # 현재 챗봇의 응답 요청
        if not config.previous_messages:
            user_message = f"주제 '{config.topic}'에 대해 {config.persona}로서 첫 번째 발언을 시작하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        else:
            last_message = config.previous_messages[-1]
            other_bot = last_message['bot']
            user_message = f"""상대방(챗봇 {other_bot})이 방금 '{last_message['text']}'라고 말했습니다.

이제 당신이 응답해야 합니다. 다음 중 하나 이상을 반드시 포함하세요:
- 상대방의 말에 질문하기 (예: "그렇다면 ...에 대해서는 어떻게 생각하세요?")
- 상대방의 말에 공감하기 (예: "맞는 말이에요", "그렇네요")
- 상대방의 말에 동의하기 (예: "동의합니다", "그 말이 맞아요")
- 상대방의 말에 반대 의견 제시하기 (예: "그렇긴 하지만", "다른 관점에서 보면")
- 상대방의 말을 인용하며 반응하기 (예: "말씀하신 ...에 대해 생각해보면")

절대로 주제에 대해 독립적으로 말만 하지 마세요. 상대방의 발언 '{last_message['text']}'에 반드시 직접적으로 반응하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."""
        
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
        
        # 이전 대화 히스토리 추가 (상대방과의 대화임을 명확히 표시)
        for msg in config.previous_messages[-config.max_history_messages:]:
            role = 'user' if msg['bot'] == (3 - config.bot_number) else 'assistant'
            # 상대방의 발언임을 명확히 표시
            if msg['bot'] == (3 - config.bot_number):
                content = f"[챗봇 {msg['bot']}의 발언] {msg['text']}"
            else:
                content = f"[당신(챗봇 {config.bot_number})의 이전 발언] {msg['text']}"
            messages.append({
                'role': role,
                'content': content
            })
        
        # 시스템 프롬프트
        other_bot_number = 3 - config.bot_number
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
- "그렇긴 하지만", "맞는 말이에요", "그런데", "그렇다면" 같은 연결어를 사용하여 상대방의 말과 연결하세요.
- {config.persona}의 관점을 유지하면서도 상대방과 소통해야 합니다.

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
6. {config.persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다.
- **상대방과의 실제 대화라는 것을 명확히 인지하고, 상대방의 발언에 반드시 반응하세요.**"""
        
        # 현재 챗봇의 응답 요청
        if not config.previous_messages:
            user_message = f"주제 '{config.topic}'에 대해 {config.persona}로서 첫 번째 발언을 시작하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        else:
            last_message = config.previous_messages[-1]
            other_bot = last_message['bot']
            user_message = f"""상대방(챗봇 {other_bot})이 방금 '{last_message['text']}'라고 말했습니다.

이제 당신이 응답해야 합니다. 다음 중 하나 이상을 반드시 포함하세요:
- 상대방의 말에 질문하기 (예: "그렇다면 ...에 대해서는 어떻게 생각하세요?")
- 상대방의 말에 공감하기 (예: "맞는 말이에요", "그렇네요")
- 상대방의 말에 동의하기 (예: "동의합니다", "그 말이 맞아요")
- 상대방의 말에 반대 의견 제시하기 (예: "그렇긴 하지만", "다른 관점에서 보면")
- 상대방의 말을 인용하며 반응하기 (예: "말씀하신 ...에 대해 생각해보면")

절대로 주제에 대해 독립적으로 말만 하지 마세요. 상대방의 발언 '{last_message['text']}'에 반드시 직접적으로 반응하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."""
        
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
            
            # 토큰 사용량 추출 (Anthropic은 input_tokens, output_tokens 사용)
            usage = result.get('usage', {})
            prompt_tokens = usage.get('input_tokens')
            completion_tokens = usage.get('output_tokens')
            total_tokens = (prompt_tokens or 0) + (completion_tokens or 0) if (prompt_tokens or completion_tokens) else None
            
            return LLMResponse(
                success=True, 
                text=content,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens
            )
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
        other_bot_number = 3 - config.bot_number
        context = f"""당신은 챗봇 {config.bot_number}입니다. {config.persona}의 역할을 맡고 있습니다.

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
- "그렇긴 하지만", "맞는 말이에요", "그런데", "그렇다면" 같은 연결어를 사용하여 상대방의 말과 연결하세요.
- {config.persona}의 관점을 유지하면서도 상대방과 소통해야 합니다.

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
6. {config.persona}의 관점을 간단히 표현하세요.
7. 긴 설명이나 나열은 절대 하지 마세요.

중요: 
- 응답은 반드시 한국어로만 작성해야 합니다.
- 응답은 반드시 마침표, 느낌표, 또는 물음표로 끝나야 합니다. 불완전한 문장은 절대 허용되지 않습니다.
- **상대방과의 실제 대화라는 것을 명확히 인지하고, 상대방의 발언에 반드시 반응하세요.**

대화 히스토리:
"""
        
        for msg in config.previous_messages[-config.max_history_messages:]:
            bot_name = f"챗봇 {msg['bot']}"
            context += f"{bot_name}: {msg['text']}\n"
        
        if not config.previous_messages:
            prompt = f"주제 '{config.topic}'에 대해 {config.persona}로서 첫 번째 발언을 시작하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."
        else:
            last_message = config.previous_messages[-1]
            other_bot = last_message['bot']
            prompt = f"""상대방(챗봇 {other_bot})이 방금 '{last_message['text']}'라고 말했습니다.

이제 당신이 응답해야 합니다. 다음 중 하나 이상을 반드시 포함하세요:
- 상대방의 말에 질문하기 (예: "그렇다면 ...에 대해서는 어떻게 생각하세요?")
- 상대방의 말에 공감하기 (예: "맞는 말이에요", "그렇네요")
- 상대방의 말에 동의하기 (예: "동의합니다", "그 말이 맞아요")
- 상대방의 말에 반대 의견 제시하기 (예: "그렇긴 하지만", "다른 관점에서 보면")
- 상대방의 말을 인용하며 반응하기 (예: "말씀하신 ...에 대해 생각해보면")

절대로 주제에 대해 독립적으로 말만 하지 마세요. 상대방의 발언 '{last_message['text']}'에 반드시 직접적으로 반응하세요. 반드시 한국어로만 1-2문장으로 완전한 문장으로 답하세요. 마침표로 끝나야 합니다."""
        
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
            
            # 토큰 사용량 추출 (Google은 usageMetadata 사용)
            usage_metadata = result.get('usageMetadata', {})
            prompt_tokens = usage_metadata.get('promptTokenCount')
            completion_tokens = usage_metadata.get('candidatesTokenCount')
            total_tokens = usage_metadata.get('totalTokenCount')
            
            return LLMResponse(
                success=True, 
                text=content,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens
            )
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

