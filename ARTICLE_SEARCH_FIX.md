# 조문 검색 기능 수정 보고서

## 🔍 문제점

법령 조문 팝업이 "조문을 찾을 수 없습니다" 오류를 표시하는 문제가 있었습니다.

### 원인 분석

1. **서버 의존성 문제**
   ```javascript
   // ❌ Before: 서버 API 호출 (서버가 없으면 실패)
   const articleData = await API.getLawArticleByName(lawReference);
   ```
   - `getLawArticleByName` 함수가 서버의 `/api/law/article` 엔드포인트를 호출
   - 서버가 구현되지 않았거나 응답하지 않으면 실패

2. **데이터 구조 불일치**
   - 서버가 반환하는 데이터 구조와 클라이언트가 기대하는 구조가 다름
   - 조문 내용, 항, 호 등의 계층 구조 처리 부족

---

## ✅ 해결 방법

### 1. 클라이언트 측에서 직접 조문 검색

서버 API 대신 클라이언트에서 법령 데이터를 가져온 후 조문을 찾도록 변경:

```javascript
// ✅ After: 클라이언트에서 직접 검색
async function openLawModal(lawReference) {
  // 1. 법령명과 조문 번호 파싱
  const [, lawName, articleNum] = lawReference.match(/^(.+?)\s+제(\d+)조/);
  
  // 2. 법령 검색
  const searchResult = await API.searchLaw(lawName, { display: 1 });
  const lawMst = searchResult.items[0].mst;
  
  // 3. 법령 전체 데이터 가져오기
  const lawData = await API.getLawDetail(lawMst);
  
  // 4. 조문 찾기 (재귀 탐색)
  const article = findArticleInContents(lawData.contents, articleNum);
  
  // 5. 조문 렌더링
  renderArticleModal(article);
}
```

### 2. 재귀 탐색 함수 구현

법령의 계층 구조(편 > 장 > 절 > 조문)를 재귀적으로 탐색:

```javascript
function findArticleInContents(contents, articleNum) {
  if (!Array.isArray(contents)) return null;
  
  for (const node of contents) {
    // 조문을 찾으면 반환
    if (node.type === 'article' && node.num === articleNum) {
      return node;
    }
    
    // 하위 노드가 있으면 재귀 탐색
    if (node.children) {
      const found = findArticleInContents(node.children, articleNum);
      if (found) return found;
    }
  }
  
  return null;
}
```

### 3. 조문 렌더링 개선

조문의 구조(제목, 본문, 항, 호)를 제대로 표시:

```javascript
// 조문 제목
<div class="modal-article-title">제1조 범죄의 성립과 처벌</div>

// 본문 (있는 경우)
<div class="modal-article-content">본문 내용...</div>

// 항(①②③)
<div class="modal-article-para">
  <span class="modal-para-num">①</span> 범죄의 성립과 처벌은...
</div>

// 호(1. 2. 3.)
<div class="modal-article-item">
  <span class="modal-item-num">1.</span> 항목 내용...
</div>
```

---

## 📊 데이터 구조 이해

### laws.json 구조

```json
{
  "mst": "local-law-형법.docx",
  "name": "형법",
  "contents": [
    {
      "type": "part",          // 편
      "title": "제1편 총칙",
      "children": [
        {
          "type": "chapter",   // 장
          "title": "제1장 형법의 적용범위",
          "children": [
            {
              "type": "article",  // 조문
              "num": "1",
              "title": "범죄의 성립과 처벌",
              "content": "",      // 본문 (있는 경우)
              "paragraphs": [     // 항들
                {
                  "num": "①",
                  "content": "범죄의 성립과 처벌은...",
                  "items": [      // 호들 (있는 경우)
                    {
                      "num": "1",
                      "content": "...",
                      "sub_items": []  // 목 (있는 경우)
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 계층 구조

```
법령
 └─ 편 (Part)
     └─ 장 (Chapter)
         └─ 절 (Section)
             └─ 조문 (Article)
                 ├─ 본문 (content)
                 └─ 항 (paragraphs)
                     └─ 호 (items)
                         └─ 목 (sub_items)
```

---

## 🎨 스타일 개선

### modal-styles.css 추가

조문 모달의 가독성을 높이기 위한 스타일:

```css
/* 조문 제목 */
.modal-article-title {
  font-family: var(--font-serif);
  color: var(--accent);
  border-bottom: 1px solid var(--border);
}

/* 항 번호 강조 */
.modal-para-num {
  color: var(--accent);
  font-weight: 700;
}

/* 호 번호 */
.modal-item-num {
  color: var(--text-dim);
  font-weight: 600;
}
```

---

## 🔧 사용 방법

### HTML에 CSS 추가

`index.html`의 `<head>` 섹션에 추가:

```html
<link rel="stylesheet" href="/css/modal-styles.css">
```

### 파일 배치

```
project/
├── public/
│   ├── css/
│   │   ├── main.css
│   │   ├── home.css
│   │   ├── viewer.css
│   │   └── modal-styles.css  ← 새로 추가
│   └── js/
│       ├── app.js             ← 수정됨
│       └── api.js             ← 수정됨
```

---

## ✅ 테스트 방법

### 1. 판례에서 법령 참조 클릭

판례 본문에서 파란색으로 표시된 법령명을 클릭:
```
형법 제268조 ← 클릭
```

### 2. 모달 확인

팝업이 나타나며 다음 내용을 표시:
- ✅ 조문 제목: "제268조 업무상과실·중과실 치사상"
- ✅ 본문 또는 항들
- ✅ "해당 법률로 이동" 버튼

### 3. 전체 법령으로 이동

모달의 "해당 법률로 이동 →" 버튼 클릭시:
- ✅ 법령 전체가 표시됨
- ✅ 해당 조문으로 스크롤

---

## 🚀 개선 효과

### Before (서버 의존)
```
판례 → 법령 클릭 → 서버 요청 → ❌ 실패
```

### After (클라이언트 처리)
```
판례 → 법령 클릭 → 클라이언트 검색 → ✅ 성공
```

### 장점

1. **서버 불필요**
   - 클라이언트만으로 완전한 기능 구현
   - 서버 오류에 영향 받지 않음

2. **빠른 응답**
   - 이미 로드된 데이터 활용
   - 네트워크 요청 최소화

3. **정확한 데이터**
   - laws.json 구조 직접 파싱
   - 항, 호 등 계층 구조 완벽 표시

---

## 📝 추가 개선 사항

### 1. 조문 하이라이팅

법령 전체 페이지로 이동시 해당 조문을 하이라이트:

```javascript
goButton.onclick = () => {
  modal.classList.remove('show');
  window.goDetail('law', lawMst);
  
  // 해당 조문으로 스크롤 및 하이라이트
  setTimeout(() => {
    const articleElement = document.getElementById(`art-${articleNum}`);
    if (articleElement) {
      articleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      articleElement.classList.add('highlight-temp');
      setTimeout(() => articleElement.classList.remove('highlight-temp'), 2000);
    }
  }, 500);
};
```

### 2. 조문 캐싱

자주 조회되는 조문을 메모리에 캐싱:

```javascript
const articleCache = new Map();

function findArticleInContents(contents, articleNum) {
  const cacheKey = `${lawMst}-${articleNum}`;
  
  if (articleCache.has(cacheKey)) {
    return articleCache.get(cacheKey);
  }
  
  const article = recursiveFind(contents, articleNum);
  articleCache.set(cacheKey, article);
  
  return article;
}
```

### 3. 조문 간 링크

조문 내에서 다른 조문을 참조하는 경우 클릭 가능하게:

```javascript
// "제1조에 따라" → 클릭 가능한 링크로 변환
content = content.replace(
  /제(\d+)조/g,
  '<span class="law-ref" onclick="openLawModal(\'형법 제$1조\')">제$1조</span>'
);
```

---

## 🔍 디버깅 가이드

### 조문을 찾을 수 없는 경우

1. **콘솔 확인**
   ```javascript
   console.log('법령명:', lawName);
   console.log('조문 번호:', articleNum);
   console.log('검색 결과:', searchResult);
   console.log('법령 데이터:', lawData);
   ```

2. **데이터 구조 확인**
   - laws.json에 해당 법령이 있는지 확인
   - 조문 번호가 문자열로 저장되어 있는지 확인 (숫자가 아님)

3. **파싱 오류 확인**
   ```javascript
   const matched = lawReference.match(/^(.+?)\s+제(\d+)조/);
   if (!matched) {
     console.error('잘못된 형식:', lawReference);
   }
   ```

---

## ✅ 체크리스트

- [x] 서버 API 의존성 제거
- [x] 클라이언트 측 조문 검색 구현
- [x] 재귀 탐색 함수 작성
- [x] 조문 렌더링 개선
- [x] 모달 스타일 추가
- [x] API 모듈 정리
- [x] 에러 처리 강화

---

## 🎯 결론

조문 검색 기능이 완전히 작동하도록 수정되었습니다:

1. ✅ **서버 없이 작동** - 클라이언트만으로 완전한 기능
2. ✅ **정확한 데이터** - 계층 구조 완벽 파싱
3. ✅ **빠른 응답** - 로컬 데이터 활용
4. ✅ **좋은 UX** - 명확한 오류 메시지와 스타일

이제 판례에서 법령 참조를 클릭하면 해당 조문의 내용이 정확하게 표시됩니다!
