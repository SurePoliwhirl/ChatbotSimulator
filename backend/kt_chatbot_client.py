"""
KT 챗봇 API 클라이언트 (백엔드용)

KT 챗봇(https://ibot.kt.com)에 메시지를 보내고 응답을 받는 클라이언트입니다.
"""

import requests
import json
from datetime import datetime
from typing import Optional, Dict, Any
import random
import string


class KTChatbotClient:
    """KT 챗봇 API 클라이언트"""
    
    BASE_URL = "https://ibot.kt.com"
    TALK_ENDPOINT = f"{BASE_URL}/client/v1/talk"
    
    def __init__(self, channel_token: str = "777e7a05a5654253976483a94d20454c"):
        """
        Args:
            channel_token: 채널 토큰 (기본값은 제공된 값 사용)
        """
        self.channel_token = channel_token
        self.session_key: Optional[str] = None
        self.session = requests.Session()
        
        # 기본 헤더 설정
        self.headers = {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "ko-KR,ko;q=0.9",
            "connection": "keep-alive",
            "content-type": "application/json",
            "host": "ibot.kt.com",
            "origin": "https://ibot.kt.com",
            "referer": "https://ibot.kt.com/client/pc-web/chat.html",
            "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            "x-requested-with": "XMLHttpRequest"
        }
    
    def _get_current_time(self) -> str:
        """현재 시간을 '오전/오후 HH:MM' 형식으로 반환"""
        now = datetime.now()
        hour = now.hour
        minute = now.minute
        
        if hour < 12:
            period = "오전"
            display_hour = hour if hour != 0 else 12
        else:
            period = "오후"
            display_hour = hour - 12 if hour != 12 else 12
        
        return f"{period} {display_hour}:{minute:02d}"
    
    def _generate_id(self) -> str:
        """고유 ID 생성 (간단한 랜덤 문자열)"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=16))
    
    def send_message(
        self,
        query: str,
        session_key: Optional[str] = None,
        voice: bool = False,
        message_type: str = "TALK",
        display_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        챗봇에 메시지를 보냅니다.
        
        Args:
            query: 보낼 메시지 내용
            session_key: 세션 키 (없으면 자동으로 생성된 세션 키 사용)
            voice: 음성 메시지 여부
            message_type: 메시지 타입 (기본값: "TALK")
            display_text: 표시할 텍스트 (없으면 query와 동일)
        
        Returns:
            dict: 챗봇 응답 데이터
        """
        # 세션 키 설정
        if session_key:
            self.session_key = session_key
        elif not self.session_key:
            # 세션 키가 없으면 임시로 생성 (실제로는 첫 요청에서 받아야 함)
            self.session_key = f"gw32_{self._generate_id().lower()}"
        
        # Payload 구성
        payload = {
            "sessionKey": self.session_key,
            "channelToken": self.channel_token,
            "query": query,
            "voice": voice,
            "type": message_type,
            "id": self._generate_id(),
            "currentTime": self._get_current_time(),
            "className": "name",
            "personalData": False,
            "displayText": display_text if display_text else query
        }
        
        try:
            response = self.session.post(
                self.TALK_ENDPOINT,
                headers=self.headers,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            
            # 응답에서 세션 키 업데이트
            if data.get("code") == "0000" and "data" in data:
                if "sessionKey" in data["data"]:
                    self.session_key = data["data"]["sessionKey"]
            
            return data
            
        except requests.exceptions.RequestException as e:
            return {
                "code": "ERROR",
                "message": f"요청 실패: {str(e)}",
                "data": None
            }
        except json.JSONDecodeError as e:
            return {
                "code": "ERROR",
                "message": f"JSON 파싱 실패: {str(e)}",
                "data": None
            }
    
    def extract_message_text(self, response: Dict[str, Any]) -> str:
        """
        응답에서 메시지 텍스트를 추출합니다.
        
        Args:
            response: 챗봇 응답 데이터
        
        Returns:
            str: 메시지 텍스트 (여러 메시지가 있으면 첫 번째 메시지)
        """
        if response.get("code") == "0000" and "data" in response:
            messages = response["data"].get("messages", [])
            if messages:
                message_text = messages[0].get("message") or ""
                return message_text
        return ""
    
    def extract_buttons(self, response: Dict[str, Any]) -> list:
        """
        응답에서 버튼 목록을 추출합니다.
        
        Args:
            response: 챗봇 응답 데이터
        
        Returns:
            list: 버튼 목록
        """
        buttons = []
        if response.get("code") == "0000" and "data" in response:
            messages = response["data"].get("messages", [])
            for message in messages:
                if "buttons" in message:
                    buttons.extend(message["buttons"])
        return buttons
    
    def extract_chip_list(self, response: Dict[str, Any]) -> list:
        """
        응답에서 칩(추천 질문) 목록을 추출합니다.
        
        Args:
            response: 챗봇 응답 데이터
        
        Returns:
            list: 칩 목록
        """
        if response.get("code") == "0000" and "data" in response:
            return response["data"].get("chipList", [])
        return []

