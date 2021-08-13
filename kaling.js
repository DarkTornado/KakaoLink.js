/*
카카오링크 자동 전송 모듈
© 2021 Dark Tornado, All rights reserved.
Based on Delta's kaling.js
*/

(function() {
    const cryptoModule = require('./crypto');
    const CryptoJS = cryptoModule.CryptoJS;
    const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36';

    /* Main */
    function Kakao() {
        this.key = null;
        this.isInitialized = false;
        this.ka = null;
        this.referer = null;
        this.cookies = new java.util.HashMap();
    };

    Kakao.prototype = {};
    Kakao.prototype.init = function(key, domain) {
        if (typeof key != 'string') throw new TypeError('Api key must be string.');
        if (key.length != 32) throw new TypeError('Invalid api key: ' + key + '.');
        if (typeof domain != 'string') throw new TypeError('Domain must be string.');
        this.key = key;
        this.ka = 'sdk/1.36.6 os/javascript lang/en-US device/Win32 origin/' + encodeURIComponent(domain);
        this.isInitialized = true;
    };
    Kakao.prototype.login = function(id, pw) {
        if (!this.isInitialized) throw new TypeError('Cannot call login method before initialization.');
        if (typeof id != 'string') throw new TypeError('Invalid id type ' + typeof id);
        if (typeof pw != 'string') throw new TypeError('Invalid password type ' + typeof pw);
        var login = new LoginManager(this);
        login.applyData();
        login.authenticate(id, pw);
    };
    Kakao.prototype.send = function(room, data, type) {
        if (type == undefined) type = 'default';
        var sender = new TemplateSender(this);
        sender.applyData(type, data);
        sender.prepareRoom(room);
        sender.send();
    };

    /* Kakao Web Login */
    function LoginManager(kakao) {
        this.kakao = kakao;
        this.res = null;
        this.cryptoKey = null;
        this.loginURL = 'https://accounts.kakao.com/login?continue=https%3A%2F%2Faccounts.kakao.com%2Fweblogin%2Faccount%2Finfo';
        this.tiaraURL = 'https://stat.tiara.kakao.com/track?d=%7B%22sdk%22%3A%7B%22type%22%3A%22WEB%22%2C%22version%22%3A%221.1.15%22%7D%7D';
        this.authenticateURL = 'https://accounts.kakao.com/weblogin/authenticate.json';
    };

    LoginManager.prototype = {};
    LoginManager.prototype.applyData = function() {
        var res = org.jsoup.Jsoup.connect(this.loginURL)
            .header('User-Agent', UserAgent)
            .data('app_key', this.kakao.key)
            .data('validation_action', 'default')
            .data('validation_params', '{}')
            .data('ka', this.kakao.ka)
            .data('lcba', '')
            .ignoreHttpErrors(true)
            .method(org.jsoup.Connection.Method.POST)
            .execute();

        if (res.statusCode() == 401) throw new ReferenceError('Invalid api key: ' + key);
        if (res.statusCode() != 200) throw new Error('Unexpected error on method login');
        var cookies = res.cookies();
        var keys = cookies.keySet().toArray();
        for (var n = 0; n < keys.length; n++) {
            this.kakao.cookies.put(keys[n], cookies.get(keys[n]));
        }
        this.cryptoKey = res.parse().select('input[name=p]').attr('value');
        this.kakao.referer = res.url().toString();
        this.kakao.cookies.put('TIARA', org.jsoup.Jsoup.connect(this.tiaraURL)
            .ignoreContentType(true).execute().cookie('TIARA'));
    };
    LoginManager.prototype.authenticate = function(id, pw) {
        var res = org.jsoup.Jsoup.connect(this.authenticateURL)
            .header('User-Agent', UserAgent)
            .header('Referer', this.kakao.referer)
            .cookies(this.kakao.cookies)
            .data('os', 'web')
            .data('webview_v', '2')
            .data('email', CryptoJS.AES.encrypt(id, this.cryptoKey).toString())
            .data('password', CryptoJS.AES.encrypt(pw, this.cryptoKey).toString())
            .data('continue', decodeURIComponent(this.kakao.referer.split('continue=')[1]))
            .data('third', 'false')
            .data('k', 'true')
            .ignoreContentType(true)
            .method(org.jsoup.Connection.Method.POST)
            .execute();

        var result = JSON.parse(res.body());
        if (result.status == -450) throw new ReferenceError('Invalid id or password');
        if (result.status != 0) throw new Error('Unexpected error on method login');

        var cookies = res.cookies();
        var keys = cookies.keySet().toArray();
        for (var n = 0; n < keys.length; n++) {
            this.kakao.cookies.put(keys[n], cookies.get(keys[n]));
        }
    };

    /* KakaoLink Sender */
    function TemplateSender(kakao) {
        this.kakao = kakao;
        this.id = null;
        this.key = null;
        this.csrf = null;
        this.template = null;
        this.pickerURL = 'https://sharer.kakao.com/talk/friends/picker/link';
        this.roomListURL = 'https://sharer.kakao.com/api/talk/chats';
        this.senderURL = 'https://sharer.kakao.com/api/talk/message/link';
    };

    TemplateSender.prototype = {};
    TemplateSender.prototype.applyData = function(type, data) {
        var res = org.jsoup.Jsoup.connect(this.pickerURL)
            .header('User-Agent', UserAgent)
            .header('Referer', this.kakao.referer)
            .cookies(this.kakao.cookies)
            .data('app_key', this.kakao.key)
            .data('validation_action', type)
            .data('validation_params', JSON.stringify(data))
            .data('ka', this.kakao.ka)
            .data('lcba', '')
            .ignoreHttpErrors(true)
            .method(org.jsoup.Connection.Method.POST)
            .execute();

        if (res.statusCode() == 400) throw new TypeError('Invalid template parameter');

        var cookies = res.cookies();
        var keys = cookies.keySet().toArray();
        for (var n = 0; n < keys.length; n++) {
            this.kakao.cookies.put(keys[n], cookies.get(keys[n]));
        }

        var html = res.parse();
        this.template = JSON.parse(html.select('#validatedTalkLink').attr('value'));
        this.csrf = html.select('div').last().attr('ng-init').split('\'')[1];
    };
    TemplateSender.prototype.prepareRoom = function(room) {
        var res = org.jsoup.Jsoup.connect(this.roomListURL)
            .header('User-Agent', UserAgent)
            .header('Referer', this.pickerURL)
            .header('Csrf-Token', this.csrf)
            .header('App-Key', this.kakao.key)
            .cookies(this.kakao.cookies)
            .ignoreContentType(true)
            .execute();
        var html = (res.body() + "").replace(/\u200b/g, '');
        var rooms = JSON.parse(html);
        this.key = rooms.securityKey;
        for (var n = 0; n < rooms.chats.length; n++) {
            if (rooms.chats[n].title == room) {
                this.id = rooms.chats[n].id;
                break;
            }
        }
        if (this.id == null) throw new ReferenceError('Invalid room name ' + room);
    };
    TemplateSender.prototype.send = function() {
        var res = org.jsoup.Jsoup.connect(this.senderURL)
            .header('User-Agent', UserAgent)
            .header('Referer', this.pickerURL)
            .header('Content-Type', 'application/json;charset=UTF-8')
            .header('Csrf-Token', this.csrf)
            .header('App-Key', this.kakao.key)
            .cookies(this.kakao.cookies)
            .requestBody(JSON.stringify({
                receiverChatRoomMemberCount: [1],
                receiverIds: [this.id],
                receiverType: 'chat',
                securityKey: this.key,
                validatedTalkLink: this.template
            }))
            .ignoreContentType(true)
            .ignoreHttpErrors(true)
            .method(org.jsoup.Connection.Method.POST)
            .execute();
    };

    /* Legacy Module Compatible */
    Kakao.Kakao = function() {
        return Kakao;
    };

    /* Export */
    module.exports = Kakao;
})();

