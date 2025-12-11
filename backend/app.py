from flask import Flask, request, jsonify
from flask_cors import CORS
from validate_api_key import validate_api_key

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

@app.route('/health', methods=['GET'])
def health():
    """서버 상태 확인"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')

