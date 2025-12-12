 
  # Chatbot Conversation Generator

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

  2. [uv](https://github.com/astral-sh/uv) 설치 (아직 설치하지 않은 경우):
  ```bash
  # Windows (PowerShell)
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

  # Mac/Linux
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

  3. Python 3.12 설치 (uv가 자동으로 다운로드):
  ```bash
  uv python install 3.12
  ```

  4. 의존성 설치 및 가상 환경 생성:
  ```bash
  uv sync
  ```

  5. 서버 실행:
  ```bash
  uv run python app.py
  ```

  서버가 `http://localhost:5000`에서 실행됩니다.

  자세한 내용은 `backend/README.md`를 참고하세요.
  