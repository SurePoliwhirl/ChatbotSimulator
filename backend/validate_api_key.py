"""
API 키 유효성 검증 모듈
OpenAI, Anthropic, Google 등의 API 키를 검증합니다.
"""
import os
import requests
from typing import Dict, Optional

def validate_openai_key(api_key: str) -> Dict[str, any]:
    """
    OpenAI API 키 검증
    간단한 모델 목록 조회 API를 호출하여 검증
    """
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # OpenAI API의 모델 목록 조회 (비용이 들지 않는 API)
        response = requests.get(
            'https://api.openai.com/v1/models',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return {
                'valid': True,
                'message': 'OpenAI API 키가 유효합니다.'
            }
        elif response.status_code == 401:
            return {
                'valid': False,
                'error': 'API 키가 유효하지 않거나 권한이 없습니다.'
            }
        else:
            return {
                'valid': False,
                'error': f'API 요청 실패 (상태 코드: {response.status_code})'
            }
    except requests.exceptions.Timeout:
        return {
            'valid': False,
            'error': '요청 시간이 초과되었습니다. 네트워크를 확인해주세요.'
        }
    except requests.exceptions.RequestException as e:
        return {
            'valid': False,
            'error': f'네트워크 오류: {str(e)}'
        }
    except Exception as e:
        return {
            'valid': False,
            'error': f'검증 중 오류 발생: {str(e)}'
        }

def validate_anthropic_key(api_key: str) -> Dict[str, any]:
    """
    Anthropic (Claude) API 키 검증
    메시지 API를 사용하여 검증 (최소 비용)
    """
    try:
        headers = {
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }
        
        # 간단한 테스트 메시지 (최소 토큰 사용)
        data = {
            'model': 'claude-3-5-haiku-20241022',  # 가장 저렴한 최신 모델
            'max_tokens': 1,
            'messages': [
                {'role': 'user', 'content': 'test'}
            ]
        }
        
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers=headers,
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            return {
                'valid': True,
                'message': 'Anthropic API 키가 유효합니다.'
            }
        elif response.status_code == 401:
            return {
                'valid': False,
                'error': 'API 키가 유효하지 않거나 권한이 없습니다.'
            }
        else:
            # 에러 응답 파싱 시도
            try:
                error_data = response.json()
                if isinstance(error_data, dict):
                    error_detail = error_data.get('error', {})
                    if isinstance(error_detail, dict):
                        error_msg = error_detail.get('message', '알 수 없는 오류')
                    else:
                        error_msg = str(error_detail)
                else:
                    error_msg = '알 수 없는 오류'
            except:
                # JSON 파싱 실패 시 응답 텍스트 사용
                error_msg = response.text[:200] if response.text else f'HTTP {response.status_code} 오류'
            
            return {
                'valid': False,
                'error': f'API 요청 실패: {error_msg}'
            }
    except requests.exceptions.Timeout:
        return {
            'valid': False,
            'error': '요청 시간이 초과되었습니다. 네트워크를 확인해주세요.'
        }
    except requests.exceptions.RequestException as e:
        return {
            'valid': False,
            'error': f'네트워크 오류: {str(e)}'
        }
    except Exception as e:
        return {
            'valid': False,
            'error': f'검증 중 오류 발생: {str(e)}'
        }

def validate_google_key(api_key: str) -> Dict[str, any]:
    """
    Google (Gemini) API 키 검증
    """
    try:
        # Google Gemini API는 간단한 테스트 요청으로 검증
        # 실제 구현은 Google API 문서에 따라 수정 필요
        headers = {
            'Content-Type': 'application/json'
        }
        
        # Gemini API 엔드포인트 (예시)
        url = f'https://generativelanguage.googleapis.com/v1beta/models?key={api_key}'
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return {
                'valid': True,
                'message': 'Google API 키가 유효합니다.'
            }
        elif response.status_code == 400:
            return {
                'valid': False,
                'error': 'API 키가 유효하지 않습니다.'
            }
        else:
            return {
                'valid': False,
                'error': f'API 요청 실패 (상태 코드: {response.status_code})'
            }
    except requests.exceptions.Timeout:
        return {
            'valid': False,
            'error': '요청 시간이 초과되었습니다. 네트워크를 확인해주세요.'
        }
    except requests.exceptions.RequestException as e:
        return {
            'valid': False,
            'error': f'네트워크 오류: {str(e)}'
        }
    except Exception as e:
        return {
            'valid': False,
            'error': f'검증 중 오류 발생: {str(e)}'
        }

def validate_api_key(api_key: str, model_type: str = 'openai') -> Dict[str, any]:
    """
    API 키 검증 메인 함수
    
    Args:
        api_key: 검증할 API 키
        model_type: 모델 타입 ('openai', 'anthropic', 'google')
    
    Returns:
        Dict with 'valid' (bool) and 'error'/'message' (str)
    """
    if not api_key or not api_key.strip():
        return {
            'valid': False,
            'error': 'API 키가 비어있습니다.'
        }
    
    model_type = model_type.lower()
    
    # 명시적으로 지정된 모델 타입을 최우선으로 사용
    if model_type == 'anthropic':
        return validate_anthropic_key(api_key)
    elif model_type == 'google':
        return validate_google_key(api_key)
    elif model_type == 'openai':
        return validate_openai_key(api_key)
    else:
        # model_type이 명시되지 않았거나 알 수 없는 경우, API 키 형식으로 자동 감지
        if api_key.startswith('sk-ant-') or api_key.startswith('sk-ant-api'):
            return validate_anthropic_key(api_key)
        elif api_key.startswith('AIza'):
            return validate_google_key(api_key)
        elif api_key.startswith('sk-'):
            return validate_openai_key(api_key)
        else:
            return {
                'valid': False,
                'error': f'지원하지 않는 모델 타입입니다: {model_type}. API 키 형식을 확인해주세요.'
            }

