# KakaoLink.js

* `Delta`님이 만드신 카카오링크 자동 전송 모듈을 기반으로 하는 모듈
* 카카오가 자꾸 로그인 부분 구조 바꿈;;

## How to Use?
* `kaling.js` 파일과 `crypto.js` 파일을 다운로드받아서 봇 구동 앱의 모듈 폴더에 넣습니다.
* `kaling.js`는 카카오링크 전송 자동화 모듈입니다.
* `crypto.js`는 `kaling.js`가 필요로 하는 모듈입니다

## Example
* 기존 카링 모듈과 사용법이 유하사며, 기존 방식 그대로 사용해도 무방합니다.
```javascript
const kalingModule = require('kaling');
const Kakao = new kalingModule();
Kakao.init('Your Javascript Key');
Kakao.init('email or phone number', 'password');

Kakao.send(room, template_info, type);
```
