"""
LLM 요청 설정을 관리하는 클래스
"""
from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class LLMRequestConfig:
    """
    LLM API 요청에 필요한 모든 설정을 담는 클래스
    """
    api_key: str
    model_type: str  # 'openai', 'anthropic', 'google'
    topic: str
    persona: str
    previous_messages: List[Dict[str, str]]  # [{'bot': 1, 'text': '...'}, ...]
    bot_number: int  # 1 or 2
    
    # 선택적 설정
    max_tokens: int = 100  # 짧고 간결한 대화를 위해 토큰 수 제한
    temperature: float = 0.9  # GPT-5.2 권장 범위 (0.7-1.0), 다양성과 일관성의 균형
    top_p: float = 0.95  # GPT-5.2 권장 값, Nucleus sampling (0.0-1.0 범위)
    max_history_messages: int = 4  # 대화 히스토리에 포함할 최대 메시지 수
    
    def __post_init__(self):
        """유효성 검사"""
        if not self.api_key:
            raise ValueError("API 키는 필수입니다.")
        if self.bot_number not in [1, 2]:
            raise ValueError("bot_number는 1 또는 2여야 합니다.")
        if self.model_type not in ['openai', 'anthropic', 'google']:
            raise ValueError("model_type은 'openai', 'anthropic', 'google' 중 하나여야 합니다.")


@dataclass
class LLMResponse:
    """
    LLM API 응답을 담는 클래스
    """
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None
    # 토큰 사용량 정보
    prompt_tokens: Optional[int] = None  # 입력(프롬프트) 토큰 수
    completion_tokens: Optional[int] = None  # 출력(생성) 토큰 수
    total_tokens: Optional[int] = None  # 총 토큰 수
    
    def __post_init__(self):
        """유효성 검사"""
        if self.success and not self.text:
            raise ValueError("성공한 응답에는 text가 필요합니다.")
        if not self.success and not self.error:
            raise ValueError("실패한 응답에는 error가 필요합니다.")

