from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# .env 파일 로드
load_dotenv()
from validate_api_key import validate_api_key
from generate_llm_response import generate_llm_response, generate_conversation_prompt
from config import LLMRequestConfig, LLMResponse
from estimate_tokens import estimate_simulation_tokens
from evaluate_conversation import evaluate_conversation_log

app = Flask(__name__)
CORS(app)  # React 앱에서의 요청을 허용

@app.route('/api/validate-key', methods=['POST'])
def validate_key():
    """
    API 키 유효성 검증 엔드포인트
    Request body: { "api_key": "sk-...", "model_type": "openai" | "anthropic" | "google" }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'valid': False,
                'error': '요청 데이터가 없습니다.'
            }), 400
        
        api_key = data.get('api_key')
        model_type = data.get('model_type', 'openai')  # 기본값: openai
        
        if not api_key:
            return jsonify({
                'valid': False,
                'error': 'API 키가 제공되지 않았습니다.'
            }), 400
        
        # API 키 검증
        result = validate_api_key(api_key, model_type)
        
        if result['valid']:
            return jsonify({
                'valid': True,
                'message': 'API 키가 유효합니다.'
            }), 200
        else:
            return jsonify({
                'valid': False,
                'error': result.get('error', 'API 키 검증에 실패했습니다.')
            }), 200  # 200으로 반환하여 프론트엔드에서 처리 가능하도록
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': f'서버 오류: {str(e)}'
        }), 500

@app.route('/api/generate-prompt', methods=['POST'])
def generate_prompt():
    """
    주제와 페르소나에 맞는 대화 프롬프트를 동적으로 생성하는 엔드포인트
    Request body: {
        "api_key": "sk-...",
        "topic": "대화 주제",
        "persona1": "페르소나 1",
        "persona2": "페르소나 2"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '요청 데이터가 없습니다.'
            }), 400
        
        api_key = data.get('api_key')
        topic = data.get('topic')
        persona1 = data.get('persona1')
        persona2 = data.get('persona2')
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'API 키가 제공되지 않았습니다.'
            }), 400
        
        if not topic or not persona1 or not persona2:
            return jsonify({
                'success': False,
                'error': '주제와 페르소나가 필요합니다.'
            }), 400
        
        # 프롬프트 생성
        generated_prompt = generate_conversation_prompt(api_key, topic, persona1, persona2)
        
        if generated_prompt:
            return jsonify({
                'success': True,
                'prompt': generated_prompt
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '프롬프트 생성에 실패했습니다.'
            }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }), 500

@app.route('/api/generate-response', methods=['POST'])
def generate_response():
    """
    LLM을 사용하여 응답 생성 엔드포인트
    Request body: {
        "api_key": "sk-...",
        "model_type": "openai" | "anthropic" | "google",
        "topic": "대화 주제",
        "persona": "페르소나",
        "other_persona": "상대방 페르소나 (선택사항)",
        "previous_messages": [{"bot": 1, "text": "..."}, ...],
        "bot_number": 1 or 2,
        "custom_system_prompt": "동적으로 생성된 프롬프트 (선택사항)"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '요청 데이터가 없습니다.'
            }), 400
        
        api_key = data.get('api_key')
        model_type = data.get('model_type', 'openai')
        topic = data.get('topic')
        persona = data.get('persona')
        other_persona = data.get('other_persona')  # 상대방 페르소나
        previous_messages = data.get('previous_messages', [])
        bot_number = data.get('bot_number', 1)
        temperature = data.get('temperature', 1.2)  # 기본값 1.2
        top_p = data.get('top_p', 0.9)  # 기본값 0.9
        custom_system_prompt = data.get('custom_system_prompt')  # 동적으로 생성된 프롬프트
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'API 키가 제공되지 않았습니다.'
            }), 400
        
        if not topic or not persona:
            return jsonify({
                'success': False,
                'error': '주제와 페르소나가 필요합니다.'
            }), 400
        
        # temperature 유효성 검사 (0.0 ~ 2.0)
        if not isinstance(temperature, (int, float)) or temperature < 0.0 or temperature > 2.0:
            temperature = 1.2  # 기본값으로 설정
        
        # top_p 유효성 검사 (0.0 ~ 1.0)
        if not isinstance(top_p, (int, float)) or top_p < 0.0 or top_p > 1.0:
            top_p = 0.9  # 기본값으로 설정
        
        # LLMRequestConfig 객체 생성
        config = LLMRequestConfig(
            api_key=api_key,
            model_type=model_type,
            topic=topic,
            persona=persona,
            previous_messages=previous_messages,
            bot_number=bot_number,
            temperature=float(temperature),
            top_p=float(top_p)
        )
        
        # LLM 응답 생성 (커스텀 프롬프트와 상대방 페르소나 전달)
        result = generate_llm_response(config, custom_system_prompt, other_persona)
        
        if result.success:
            return jsonify({
                'success': True,
                'text': result.text,
                'tokens': {
                    'prompt_tokens': result.prompt_tokens,
                    'completion_tokens': result.completion_tokens,
                    'total_tokens': result.total_tokens
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.error or '응답 생성에 실패했습니다.'
            }), 200  # 200으로 반환하여 프론트엔드에서 처리 가능하도록
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }), 500

@app.route('/api/estimate-tokens', methods=['POST'])
def estimate_tokens():
    """
    시뮬레이션의 예상 토큰 사용량 계산 엔드포인트
    Request body: {
        "model_type1": "openai" | "anthropic" | "google",
        "model_type2": "openai" | "anthropic" | "google",
        "topic": "대화 주제",
        "persona1": "페르소나 1",
        "persona2": "페르소나 2",
        "turns_per_bot": 3,
        "number_of_sets": 2
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '요청 데이터가 없습니다.'
            }), 400
        
        model_type1 = data.get('model_type1', 'openai')
        model_type2 = data.get('model_type2', 'openai')
        topic = data.get('topic', '')
        persona1 = data.get('persona1', '')
        persona2 = data.get('persona2', '')
        turns_per_bot = data.get('turns_per_bot', 3)
        number_of_sets = data.get('number_of_sets', 2)
        max_tokens1 = data.get('max_tokens1', 120)
        max_tokens2 = data.get('max_tokens2', 120)
        temperature1 = data.get('temperature1', 1.2)
        temperature2 = data.get('temperature2', 1.2)
        top_p1 = data.get('top_p1', 0.9)
        top_p2 = data.get('top_p2', 0.9)
        
        if not topic or not persona1 or not persona2:
            return jsonify({
                'success': False,
                'error': '주제와 페르소나가 필요합니다.'
            }), 400
        
        # 토큰 예측
        estimate = estimate_simulation_tokens(
            model_type1=model_type1,
            model_type2=model_type2,
            topic=topic,
            persona1=persona1,
            persona2=persona2,
            turns_per_bot=turns_per_bot,
            number_of_sets=number_of_sets,
            max_tokens1=max_tokens1,
            max_tokens2=max_tokens2,
            temperature1=temperature1,
            temperature2=temperature2,
            top_p1=top_p1,
            top_p2=top_p2
        )
        
        return jsonify({
            'success': True,
            'estimate': estimate
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'서버 오류: {str(e)}'
        }), 500

@app.route('/api/evaluate-conversation', methods=['POST'])
def evaluate_conversation():
    """
    Evaluates a conversation using an LLM.
    Request body: {
        "topic": "...",
        "persona1": "...",
        "persona2": "...",
        "dialogue_log": [ { "speaker": "...", "text": "..." }, ... ]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        result = evaluate_conversation_log(
            topic=data.get('topic', ''),
            persona1=data.get('persona1', ''),
            persona2=data.get('persona2', ''),
            dialogue_log=data.get('dialogue_log', [])
        )

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'success': False, 'error': f'Server Error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    """서버 상태 확인"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')

