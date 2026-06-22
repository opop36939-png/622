# 국가기술자격 합격률 조회

한국산업인력공단 큐넷(Q-net)에서 제공하는 "연도별 회별 국가기술자격 합격률" 공공데이터 API를 활용한 웹사이트입니다.

## 기술 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Vercel 배포

## 로컬에서 실행하기

```bash
npm install
cp .env.local.example .env.local
# .env.local 파일을 열어 QNET_SERVICE_KEY 값을 발급받은 실제 인증키로 교체하세요.
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 환경변수

| 이름 | 설명 |
|---|---|
| `QNET_SERVICE_KEY` | 공공데이터포털에서 발급받은 큐넷 OpenAPI 인증키 |

⚠️ 인증키는 **서버에서만** 사용됩니다 (`app/api/pass-rate/route.ts`). 브라우저로는 절대 전달되지 않습니다.

## Vercel 배포

1. 이 저장소를 GitHub에 push
2. [vercel.com](https://vercel.com)에서 New Project → 이 저장소 Import
3. Settings → Environment Variables에서 `QNET_SERVICE_KEY` 추가
4. Deploy

## 등급코드 참고

| 코드 | 등급명 |
|---|---|
| 10 | 기술사 |
| 20 | 기능장 |
| 30 | 기사 |
| 31 | 산업기사 |
| 32 | 1급 |
| 33 | 2급 |
| 40 | 기능사 |

## 데이터 출처

- [공공데이터포털 - 한국산업인력공단_연도별 회별 국가기술자격 합격률](https://www.data.go.kr/data/15089380/openapi.do)
