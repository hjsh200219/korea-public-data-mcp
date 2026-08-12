# 설치 가이드 (완전 초보자용)

컴퓨터 프로그램에 익숙하지 않은 분들도 따라할 수 있도록 만든 안내서입니다.
**그대로 따라하시면** 됩니다.

---

## 이 프로그램은 무엇인가요?

AI(Claude, ChatGPT 등)에게 **"민법 검색해줘"**, **"부당해고 판례 찾아줘"**, **"삼성전자 재무제표 보여줘"**, **"강남구 약국 찾아줘"** 라고 말하면
각종 공공데이터 API에서 정보를 자동으로 찾아주는 프로그램입니다.

**지원하는 데이터 소스:**
- **법제처 국가법령정보센터** — 법령, 판례, 헌재결정례, 행정규칙 등 21종
- **DART 전자공시시스템** — 기업공시, 재무제표, 기업개황 등 5종
- **공공데이터포털** — 약국, 병원, 주식배당, 사업자등록 등 8종

별도 설치나 API 키 발급 없이, **URL만 등록하면** 바로 사용할 수 있습니다.

---

## 사용 방법 선택

사용하는 AI 앱에 따라 **하나만** 따라하시면 됩니다.

| 방법 | AI 앱 | 소요 시간 |
|------|-------|-----------|
| [방법 A](#방법-a-claude-앱-모바일웹) | Claude 모바일/웹 앱 | 1분 |
| [방법 B](#방법-b-chatgpt-커스텀-gpt) | ChatGPT (커스텀 GPT) | 3분 |
| [방법 C](#방법-c-claude-desktop) | Claude Desktop (PC 앱) | 3분 |
| [방법 D](#방법-d-cursor) | Cursor (코딩 에디터) | 3분 |
| [방법 E](#방법-e-claude-code-플러그인) | Claude Code (터미널) | 30초 |

---

## 방법 A: Claude 앱 (모바일/웹)

> Claude Pro 또는 Max 플랜이 필요합니다.

**1.** Claude 앱을 엽니다. (모바일 앱 또는 https://claude.ai)

**2.** 화면 좌측 하단의 **프로필 아이콘** → **Settings** 를 클릭합니다.

**3.** **Connectors** 메뉴를 클릭합니다.

**4.** **Add custom connector** 를 클릭합니다.

**5.** 아래 URL을 입력합니다:

```
https://public-data.up.railway.app/mcp
```

**6.** **Add** 를 클릭합니다.

**끝입니다!** 이제 채팅창에 "민법 검색해줘" 라고 입력해 보세요.

---

## 방법 B: ChatGPT (커스텀 GPT)

**1.** ChatGPT에 로그인합니다. (https://chatgpt.com)

**2.** 좌측 메뉴에서 **Explore GPTs** 또는 **My GPTs** 를 클릭합니다.

**3.** **Create a GPT** 를 클릭합니다.

**4.** **Configure** 탭을 클릭합니다.

**5.** 아래쪽으로 스크롤하여 **Actions** 섹션을 찾고, **Create new action** 을 클릭합니다.

**6.** **Import from URL** 을 클릭하고 아래 URL을 입력합니다:

```
https://public-data.up.railway.app/openapi.json
```

**7.** 스키마가 자동으로 로드되면 **Save** 를 클릭합니다.

**끝입니다!** 만들어진 GPT에서 "민법 검색해줘" 라고 입력해 보세요.

---

## 방법 C: Claude Desktop

> Claude Desktop은 PC에 설치하는 Claude 앱입니다.

### C-1. 설정 파일 위치 찾기

**macOS:**

1. Finder(파일 탐색기)를 엽니다.
2. 상단 메뉴에서 **"이동" → "폴더로 이동"** 을 클릭합니다 (또는 `Cmd + Shift + G`).
3. 아래 경로를 붙여넣고 Enter를 누릅니다:

```
~/Library/Application Support/Claude
```

4. `Claude` 폴더가 열립니다.
5. 이 폴더 안에 `claude_desktop_config.json` 파일이 있는지 확인합니다.
   - **있으면**: 이 파일을 텍스트 편집기(메모장 등)로 엽니다.
   - **없으면**: 새 텍스트 파일을 만들어서 이름을 `claude_desktop_config.json`으로 저장합니다.

**Windows:**

1. 파일 탐색기를 엽니다 (`Windows 키 + E`).
2. 주소 표시줄에 아래 경로를 붙여넣고 Enter를 누릅니다:

```
%APPDATA%\Claude
```

3. `Claude` 폴더가 열립니다.
4. 이 폴더 안에 `claude_desktop_config.json` 파일이 있는지 확인합니다.
   - **있으면**: 이 파일을 마우스 오른쪽 클릭 → **"연결 프로그램" → "메모장"** 으로 엽니다.
   - **없으면**: 폴더 안에서 마우스 오른쪽 클릭 → **"새로 만들기" → "텍스트 문서"** → 이름을 `claude_desktop_config.json`으로 변경합니다.

> **주의:** Windows에서 파일 확장자가 보이지 않으면 `.json.txt` 같은 잘못된 이름이 될 수 있습니다.
> 파일 탐색기 상단의 **"보기" → "파일 확장명"** 에 체크하여 확장자가 보이게 하세요.

### C-2. 설정 내용 입력

파일을 열고, 아래 내용을 **통째로 복사해서 붙여넣기** 합니다.

> **처음 만든 빈 파일인 경우** — 아래 내용을 그대로 붙여넣습니다:

```json
{
  "mcpServers": {
    "public-data": {
      "url": "https://public-data.up.railway.app/mcp"
    }
  }
}
```

> **이미 다른 MCP 설정이 있는 경우** — `"mcpServers": {` 중괄호 안에 아래 부분만 추가합니다.
> 기존 설정 마지막 `}` 뒤에 쉼표(`,`)를 꼭 넣어주세요:

```json
    "public-data": {
      "url": "https://public-data.up.railway.app/mcp"
    }
```

### C-3. 저장 및 재시작

1. 파일을 **저장**합니다 (`Ctrl + S` 또는 `Cmd + S`).
2. Claude Desktop 앱을 **완전히 종료**합니다.
   - macOS: Dock에서 오른쪽 클릭 → "종료"
   - Windows: 시스템 트레이(화면 우측 하단)에서 Claude 아이콘 오른쪽 클릭 → "종료"
3. Claude Desktop을 **다시 실행**합니다.

**끝입니다!** 채팅창에 "민법 검색해줘" 라고 입력해 보세요.

---

## 방법 D: Cursor

> Cursor는 AI 기능이 내장된 코딩 에디터입니다.

### D-1. 설정 파일 위치 찾기

**macOS:**

1. Finder에서 `Cmd + Shift + G`를 누릅니다.
2. 아래 경로를 붙여넣고 Enter를 누릅니다:

```
~/.cursor
```

3. 이 폴더 안에 `mcp.json` 파일이 있으면 열고, 없으면 새로 만듭니다.

**Windows:**

1. 파일 탐색기 주소 표시줄에 아래 경로를 입력합니다:

```
%USERPROFILE%\.cursor
```

2. 이 폴더 안에 `mcp.json` 파일이 있으면 열고, 없으면 새로 만듭니다.

### D-2. 설정 내용 입력

위의 **C-2** 과정과 동일합니다. 같은 JSON 내용을 `mcp.json` 파일에 입력합니다.

### D-3. 저장 및 재시작

1. 파일을 저장합니다.
2. Cursor를 **완전히 종료 후 다시 실행**합니다.

**끝입니다!**

---

## 방법 E: Claude Code 플러그인

> Claude Code는 터미널에서 쓰는 AI 코딩 도구입니다. 설정 파일을 직접 편집할 필요가 없습니다.

**1.** 터미널에서 Claude Code를 실행합니다.

```
claude
```

**2.** 채팅창에 아래 두 줄을 차례로 입력합니다. (한 줄씩, 앞의 `/` 포함)

```
/plugin marketplace add hjsh200219/korea-public-data-mcp
```

```
/plugin install korea-public-data@korea-public-data
```

**3.** Claude Code를 종료했다가 다시 실행합니다.

**끝입니다!** 이제 채팅창에서 `/k-law`, `/k-dart`, `/k-trade` 같은 명령을 쓸 수 있고, 그냥 한국어로 물어봐도 됩니다.

제대로 설치됐는지 확인하려면 `/k-tools`를 입력하세요. 사용 가능한 도구 목록이 나옵니다.

---

## 동작 확인

설정이 끝났으면 AI 채팅창에 아래 문장을 입력해 보세요:

```
민법 검색해줘
```

```
부당해고 관련 판례 찾아줘
```

```
삼성전자 2024년 재무제표 보여줘
```

```
강남구 약국 찾아줘
```

검색 결과가 나타나면 **설정 완료**입니다!

---

## 자주 묻는 질문 (FAQ)

**Q. Claude 앱에서 Connectors 메뉴가 보이지 않습니다.**

Pro 또는 Max 플랜에서만 사용 가능합니다. 무료 플랜에서는 Connectors 기능이 제공되지 않습니다.

**Q. Claude Desktop / Cursor에서 MCP 도구가 보이지 않습니다.**

- 설정 파일(JSON)의 **URL이 정확한지** 다시 확인하세요.
- 앱을 **완전히 종료 후 재시작** 했는지 확인하세요.
- JSON 파일에 **문법 오류**가 없는지 확인하세요. 흔한 실수:
  - 쉼표(`,`)를 빠뜨리거나 잘못 넣은 경우
  - 중괄호(`{`, `}`)의 짝이 안 맞는 경우
  - 따옴표(`"`)를 빠뜨린 경우

**Q. JSON 문법이 맞는지 확인하는 방법이 있나요?**

아래 무료 사이트에 설정 파일 내용을 붙여넣으면 문법 오류를 자동으로 찾아줍니다:

```
https://jsonlint.com
```

**Q. ChatGPT에서 Actions 스키마 로드가 안 됩니다.**

- 인터넷 연결을 확인하세요.
- URL을 정확히 `https://public-data.up.railway.app/openapi.json` 으로 입력했는지 확인하세요.

**Q. 검색 결과가 안 나오거나 오류가 발생합니다.**

- 서버가 일시적으로 점검 중일 수 있습니다. 잠시 후 다시 시도해 주세요.
- 계속 문제가 발생하면 [GitHub Issues](https://github.com/hjsh200219/korea-public-data-mcp/issues)에 알려주세요.

---

## 용어 정리

| 용어 | 설명 |
|------|------|
| **MCP** | Model Context Protocol. AI 앱에 외부 도구를 연결하는 규격(플러그인 시스템). |
| **Remote MCP** | 인터넷을 통해 원격 서버에 연결하는 MCP 방식. 별도 설치가 필요 없습니다. |
| **Connector** | Claude 앱에서 외부 도구를 연결하는 기능. Settings에서 추가합니다. |
| **GPT Actions** | ChatGPT의 커스텀 GPT에 외부 API를 연결하는 기능. |
| **JSON** | 설정 정보를 저장하는 텍스트 형식. 중괄호 `{}`와 따옴표 `""`를 사용합니다. |
| **API** | Application Programming Interface. 프로그램끼리 정보를 주고받는 방법. |
