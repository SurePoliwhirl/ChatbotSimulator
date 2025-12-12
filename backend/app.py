from flask import Flask, request, jsonify
from flask_cors import CORS
from validate_api_key import validate_api_key
from generate_llm_response import generate_llm_response
from config import LLMRequestConfig, LLMResponse

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

@app.route('/api/generate-response', methods=['POST'])
def generate_response():
    """
    LLM을 사용하여 응답 생성 엔드포인트
    Request body: {
        "api_key": "sk-...",
        "model_type": "openai" | "anthropic" | "google",
        "topic": "대화 주제",
        "persona": "페르소나",
        "previous_messages": [{"bot": 1, "text": "..."}, ...],
        "bot_number": 1 or 2
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
        previous_messages = data.get('previous_messages', [])
        bot_number = data.get('bot_number', 1)
        temperature = data.get('temperature', 1.2)  # 기본값 1.2
        top_p = data.get('top_p', 0.9)  # 기본값 0.9
        
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
        
        # LLM 응답 생성
        result = generate_llm_response(config)
        
        if result.success:
            return jsonify({
                'success': True,
                'text': result.text
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

@app.route('/health', methods=['GET'])
def health():
    """서버 상태 확인"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')

