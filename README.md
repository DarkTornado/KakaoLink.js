# 카카오링크 모듈 for 비공식 카카오톡 봇

* `Delta`님이 만드신 카카오링크 자동 전송 모듈을 기반으로 하는 모듈
* 카카오가 자꾸 로그인 부분 구조 바꿈;;

## How to Use?
* `kaling.js` 파일과 `crypto.js` 파일을 다운로드받아서 봇 구동 앱의 모듈 폴더에 넣습니다.
* `kaling.js`는 카카오링크 전송 자동화 모듈입니다.
* `crypto.js`는 `kaling.js`가 필요로 하는 모듈입니다

## Example
* 기존 카링 모듈과 사용법이 유사하며, `Kakao.init();`에 도메인 부분이 추가된걸 제외하면 기존 방식 그대로 사용해도 무방합니다.
```javascript
const kalingModule = require('kaling');
const Kakao = new kalingModule();
Kakao.init('Your Javascript Key', 'Web Platform Domain');
Kakao.login('Email or Phone Number', 'Password');

Kakao.send(room, template_info, type);
```

### 기타 변동 사항

#### 2021년 5월 18일
* 쿠키 이름 변경됨
#### 2021년 7월 19일
* 쿠키 생성에 사용되는 URL이 변경됨
#### 2021년 8월 5일
* 로그인에 사용하던 URL이 이상해서 변경

## To do
* [ ] 로그인 세션 만료시 자동 로그인 실행 후 재시도