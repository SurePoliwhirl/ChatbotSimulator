 
  # Chatbot Conversation Generator

  This is a code bundle for Chatbot Conversation Generator. The original project is available at https://www.figma.com/design/SXPT9iSqVaIuvUeX3zWq3C/Chatbot-Conversation-Generator.

  ## Running the code

  ### 프론트엔드 실행

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ### 백엔드 서버 실행 (API 키 검증용)

  API 키 검증 기능을 사용하려면 백엔드 서버를 실행해야 합니다.

  1. `backend` 폴더로 이동:
  ```bash
  cd backend
  ```

  2. Python 가상 환경 생성 및 활성화 (선택사항):
  ```bash
  python -m venv venv
  # Windows
  venv\Scripts\activate
  # Mac/Linux
  source venv/bin/activate
  ```

  3. 의존성 설치:
  ```bash
  pip install -r requirements.txt
  ```

  4. 서버 실행:
  ```bash
  python app.py
  ```

  서버가 `http://localhost:5000`에서 실행됩니다.

  자세한 내용은 `backend/README.md`를 참고하세요.
  