# LexVis — 법률 열람 & 판례 해석 보조

국가법령정보 Open API 연동, 법률 용어 자동 해설, 상·하급심 연계 탐색 서비스

---

## 📁 프로젝트 구조

```
lexvis/
├── server/
│   ├── index.js          # Express 서버 진입점
│   ├── lawApi.js         # 국가법령정보 API 공통 모듈
│   └── routes/
│       ├── law.js        # /api/law/* 라우터
│       ├── precedent.js  # /api/precedent/* 라우터
│       └── term.js       # /api/term/* 라우터 (용어 사전)
├── public/
│   ├── index.html        # SPA 진입점
│   ├── css/
│   │   ├── main.css      # 공통 스타일
│   │   ├── home.css      # 홈/서브 페이지 스타일
│   │   └── viewer.css    # 판례/법령 뷰어 스타일
│   └── js/
│       ├── api.js        # 서버 API 호출 모듈 (ES Module)
│       └── app.js        # 메인 앱 로직
├── data/
│   └── terms.json        # 용어 사전 데이터 (서버 저장)
├── .env                  # API 키 설정 (깃허브에 올리지 말 것!)
├── .env.example          # .env 템플릿
├── .gitignore
└── package.json
```

---

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/YOUR_USERNAME/lexvis.git
cd lexvis
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경 변수 설정
```bash
cp .env.example .env
```
`.env` 파일을 열고 발급받은 OC 아이디 입력:
```
LAW_API_OC=여기에_open.law.go.kr_에서_발급받은_OC_입력
PORT=3000
```

### 4. 서버 실행
```bash
# 개발 모드 (nodemon 자동 재시작)
npm run dev

# 프로덕션
npm start
```

### 5. 브라우저에서 접속
```
http://localhost:3000
```

---

## 🔑 국가법령정보 API 키 발급

1. **https://open.law.go.kr** 접속
2. 회원가입 → 로그인
3. 상단 메뉴: **OPEN API → API 신청**
4. "법령서비스" + "판례서비스" 신청 (무료)
5. 승인 후 **마이페이지 → OC 확인**
6. `.env`의 `LAW_API_OC=` 뒤에 OC 값 입력

---

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/law/search?query=형법` | 법령 검색 |
| GET | `/api/law/detail/:mst` | 법령 본문 조회 |
| GET | `/api/law/article?mst=X&jo=268` | 특정 조문 팝업용 |
| GET | `/api/precedent/search?query=업무상과실` | 판례 검색 |
| GET | `/api/precedent/detail/:id` | 판례 본문 조회 |
| GET | `/api/term` | 용어 목록 |
| POST | `/api/term` | 용어 추가 |
| DELETE | `/api/term/:word` | 용어 삭제 |

---

## 🌐 깃허브 배포

```bash
# 저장소 초기화
git init
git add .
git commit -m "feat: initial commit"

# 깃허브에 새 repo 생성 후
git remote add origin https://github.com/YOUR_USERNAME/lexvis.git
git push -u origin main
```

> ⚠️ `.env` 파일은 절대 커밋하지 마세요. `.gitignore`에 이미 포함되어 있습니다.

---

## ☁️ 서버 배포 (선택)

### Railway (무료)
```bash
# Railway CLI 설치
npm install -g @railway/cli
railway login
railway init
railway up
# 환경변수: Railway 대시보드 → Variables → LAW_API_OC 추가
```

### Render (무료)
1. render.com → New Web Service
2. 깃허브 연결
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment Variables: `LAW_API_OC` 추가

---

## 🗃️ 용어 사전 코드로 직접 추가

`data/terms.json` 파일을 직접 편집:
```json
{
  "새용어": {
    "hanja": "漢字",
    "def": "용어 설명",
    "law": "근거: 해당 법령"
  }
}
```
서버 재시작 없이 즉시 적용됩니다.
