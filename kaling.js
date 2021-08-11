// @ts-nocheck
const cryptoModule = require('./crypto');
const CryptoJS = cryptoModule.CryptoJS;

exports.Kakao = function() {
    function Kakao() {
        this.apiKey = null;
        this.cookies = {};
        this.loginReferer = null;
        this.cryptoKey = null;
        this.parsedTemplate = null;
        this.csrf = null;
    }
    Kakao.prototype.init = function(apiKey) {
        if(typeof apiKey !== 'string' || apiKey.length !== 32) throw new TypeError('api key ' + apiKey + ' is not valid api key');
        this.apiKey = apiKey;
        return this;
    };
    Kakao.prototype.isInitialized = function() { return !!this.apiKey; };
    Kakao.prototype.static = {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
        ct: 'application/x-www-form-urlencoded',
        ka: 'sdk/1.36.6 os/javascript lang/en-US device/Win32 origin/http%3A%2F%2F도메인'
    };
    Kakao.prototype.login = function(id, password) {
        if(!this.isInitialized()) throw new ReferenceError('method login is called before initialization');
        if(typeof id !== 'string') throw new TypeError('invalid id type ' + typeof id);
        if(typeof password !== 'string') throw new TypeError('invalid password type ' + typeof password);
        
        (function loginManager() {
            const connection = org.jsoup.Jsoup.connect('https://sharer.kakao.com/talk/friends/picker/link');
            connection.header('User-Agent', this.static.ua);
            connection.data({
                app_key: this.apiKey,
                validation_action: 'default',
                validation_params: '{}',
                ka: this.static.ka,
                lcba: ''
            });
            connection.ignoreHttpErrors(true);
            connection.method(org.jsoup.Connection.Method.POST);
            const response = connection.execute();
            if(response.statusCode() === 401) throw new ReferenceError('invalid api key');
            if(response.statusCode() !== 200) throw new Error('unexpected error on method login');
            Object.assign(this.cookies, {
                _kadu: response.cookie('_kadu'),
                _kadub: response.cookie('_kadub'),
                _maldive_oauth_webapp_session: response.cookie('_maldive_oauth_webapp_session')
            });
            const document = response.parse();
            this.cryptoKey = document.select('input[name=p]').attr('value');
            this.loginReferer = response.url().toString();
        }).bind(this)();

        (function tiara() {
            const connection = org.jsoup.Jsoup.connect('https://track.tiara.kakao.com/queen/footsteps');
            connection.ignoreContentType(true);
            const response = connection.execute();
            this.cookies.TIARA = response.cookie('TIARA');
        }).bind(this)();

        (function authenticate() {
            const connection = org.jsoup.Jsoup.connect('https://accounts.kakao.com/weblogin/authenticate.json');
            connection.header('User-Agent',this.static.ua);
            connection.header('Referer',this.loginReferer);
            connection.cookies(this.cookies);
            connection.data({
                os: 'web',
                webview_v: '2',
                email: CryptoJS.AES.encrypt(id, this.cryptoKey).toString(),
                password: CryptoJS.AES.encrypt(password, this.cryptoKey).toString(),
                continue: decodeURIComponent(this.loginReferer.split('continue=')[1]),
                third: 'false',
                k: 'true'
            });
            connection.ignoreContentType(true);
            connection.method(org.jsoup.Connection.Method.POST);
            const response = connection.execute();
            const result = JSON.parse(response.body());
            if(result.status === -450) throw new ReferenceError('invalid id or password');
            if(result.status !== 0 ) throw new Error('unexpected error on method login');
            Object.assign(this.cookies, {
                _kawlt: response.cookie('_kawlt'),
                _kawltea: response.cookie('_kawltea'),
                _karmt: response.cookie('_karmt'),
                _karmtea: response.cookie('_karmtea')
            });
        }).bind(this)();
    };
    Kakao.prototype.send = function(roomTitle, data, type) {
        type = type || 'default';
        
        (function proceed() {
            const connection = org.jsoup.Jsoup.connect('https://sharer.kakao.com/talk/friends/picker/link');
            connection.header('User-Agent', this.static.ua);
            connection.header('Referer', this.loginReferer);
            connection.cookies({
                TIARA: this.cookies.TIARA,
                _kawlt: this.cookies._kawlt,
                _kawltea: this.cookies._kawltea,
                _karmt: this.cookies._karmt,
                _karmtea: this.cookies._karmtea
            });
            connection.data({
                app_key: this.apiKey,
                validation_action: type,
                validation_params: JSON.stringify(data),
                ka: this.static.ka,
                lcba: ''
            });
            connection.method(org.jsoup.Connection.Method.POST);
            connection.ignoreHttpErrors(true);
            const response = connection.execute();
            if(response.statusCode() === 400) throw new TypeError('invalid template parameter');
            Object.assign(this.cookies, {
                KSHARER: response.cookie('KSHARER'),
                using: 'true'
            });
            const document = response.parse();
            this.parsedTemplate = JSON.parse(document.select('#validatedTalkLink').attr('value'));
            this.csrf = document.select('div').last().attr('ng-init').split('\'')[1];
        }).bind(this)();

        (function getRooms() {
            const connection = org.jsoup.Jsoup.connect('https://sharer.kakao.com/api/talk/chats');
            connection.header('User-Agent', this.static.ua);
            connection.header('Referer', 'https://sharer.kakao.com/talk/friends/picker/link');
            connection.header('Csrf-Token', this.csrf);
            connection.header('App-Key', this.apiKey);
            connection.cookies(this.cookies);
            connection.ignoreContentType(true);
            const response = connection.execute();
            const document = response.body().replace(/\u200b/g,'');
            this.rooms = JSON.parse(document);
        }).bind(this)();

        (function sendTemplate() {
            let id, securityKey;
            for(let room of this.rooms.chats) {
                if(room.title === roomTitle) {
                    id = room.id;
                    securityKey = this.rooms.securityKey;
                    break;
                }
            }
            if(typeof id === 'undefined') throw new ReferenceError('invalid room name ' + roomTitle);
            const connection = org.jsoup.Jsoup.connect('https://sharer.kakao.com/api/talk/message/link');
            connection.header('User-Agent', this.static.ua);
            connection.header('Referer', 'https://sharer.kakao.com/talk/friends/picker/link');
            connection.header('Csrf-Token', this.csrf);
            connection.header('App-Key', this.apiKey);
            connection.header('Content-Type', 'application/json;charset=UTF-8');
            connection.cookies({
                KSHARER: this.cookies.KSHARER,
                TIARA: this.cookies.TIARA,
                using: this.cookies.using,
                _kadu: this.cookies._kadu,
                _kadub: this.cookies._kadub,
                _kawlt: this.cookies._kawlt,
                _kawltea: this.cookies._kawltea,
                _karmt: this.cookies._karmt,
                _karmtea: this.cookies._karmtea
            });
            connection.requestBody(JSON.stringify({
                receiverChatRoomMemberCount: [1],
                receiverIds: [id],
                receiverType: 'chat',
                securityKey: securityKey,
                validatedTalkLink: this.parsedTemplate
            }));
            connection.ignoreContentType(true);
            connection.ignoreHttpErrors(true);
            connection.method(org.jsoup.Connection.Method.POST);
            const response = connection.execute();
        }).bind(this)();
    };

    return Kakao;
};