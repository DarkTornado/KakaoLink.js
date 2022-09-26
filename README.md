# 카카오링크 모듈 for 비공식 카카오톡 봇

© 2021-2022 Dark Tornado, All rights reserved.

* `Delta`님이 만드신 카카오링크 자동 전송 모듈을 기반으로 하는 모듈
* 카카오가 자꾸 로그인 부분 구조 바꿈;;

## How to Use?
* `kaling.js` 파일과 `crypto.js` 파일을 다운로드받아서 봇 구동 앱의 모듈 폴더에 넣습니다.
* `kaling.js`는 카카오링크 전송 자동화 모듈입니다.
* `crypto.js`는 `kaling.js`가 필요로 하는 모듈입니다
* `kaling_lagacy.js`는 `kaling.js`가 기반으로 하는 옛날 카링 모듈입니다. 적용하지 않아도 돼요.

## Example
* 기존 카링 모듈과 사용법이 유사하며, `Kakao.init();`에 도메인 부분이 추가된걸 제외하면 기존 방식 그대로 사용해도 무방합니다.
```javascript
const kalingModule = require('kaling'); //예전처럼 require('kaling').Kakao();로도 가능
const Kakao = new kalingModule();
Kakao.init('Your Javascript Key', 'Web Platform Domain');
Kakao.login('Email or Phone Number', 'Password');

Kakao.send(room, template_info, type);
```
* 로그인 시점에 아이디와 비밀번호를 저장해두고, 로그인 세션 만료시에 자동으로 로그인한 뒤에 전송하는 것을 원한다면, `Kakao.login();` 함수와 `Kakao.send();` 함수의 마지막 인자에 `true`를 추가하면 됩니다.
```javascript
const kalingModule = require('kaling');
const Kakao = new kalingModule();
Kakao.init('Your Javascript Key', 'Web Platform Domain');
Kakao.login('Email or Phone Number', 'Password', true); //true로 하지 않으면 아이디&비밀번호 정보를 저장하지 않아요

Kakao.send(room, template_info, type, true); //로그인 세션이 만료되어 오류가 발생할 각이 보이면 알아서 로그인한 뒤에 전송
```
## 기타 변동 사항

### 2021년 5월 18일
* 쿠키 이름 변경됨
### 2021년 7월 19일
* 쿠키 생성에 사용되는 URL이 변경됨
### 2021년 8월 5일
* 로그인에 사용하던 URL이 이상해서 변경
### 2022년 3월 24일 경
* 쿠키 이름이 변경됨
* 기존 모듈만 영향을 받고, 필자가 만든 모듈은 알아서 잘 딱 깔끔하고 센스있게 처리되는지라 수정 안해도 됨
### 2022년 9월 23일
* 특정 헤더 누락시 `404` 페이지로 무한 리다이렉트되는 현상 발생

## 라이선스
* [Deep Dark License](https://github.com/DarkTornado/DeepDarkLicense) - Type B
* 수정 후 소스 공개하기 싫으면 미리 개발자에게 연락주세용
