const cryptoModule = require('./crypto');
const CryptoJS = cryptoModule.CryptoJS;

function Kakao() {
    this.key = null;
    this.domain = null;
    this.isInitialized = false;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36';
    this.contentType = 'application/x-www-form-urlencoded';
    this.ka = null;
    this.cryptoKey = null;
    this.referer = null;
    this.cookies = new java.util.HashMap();
    this.loginUrl = 'https://accounts.kakao.com/login?continue=https%3A%2F%2Faccounts.kakao.com%2Fweblogin%2Faccount%2Finfo';
    this.tiaraUrl = 'https://stat.tiara.kakao.com/track?d=%7B%22sdk%22%3A%7B%22type%22%3A%22WEB%22%2C%22version%22%3A%221.1.15%22%7D%7D';
    this.authenticateUrl = 'https://accounts.kakao.com/weblogin/authenticate.json';
};

Kakao.prototype = {};
Kakao.prototype.init = function(key, domain) {
    if (typeof key != 'string') throw new TypeError('Api key must be string.');
    if (key.length != 32) throw new TypeError('Invalid api key: ' + key + '.');
    if (typeof domain != 'string') throw new TypeError('Domain must be string.');
    this.key = key;
    this.domain = domain;
    this.ka = 'sdk/1.36.6 os/javascript lang/en-US device/Win32 origin/' + domain;
    this.isInitialized = true;
};
Kakao.prototype.login = function(id, pw) {
    if (!this.isInitialized) throw new TypeError('Cannot call login method before initialization.');
    if (typeof id != 'string') throw new TypeError('Invalid id type ' + typeof id);
    if (typeof pw != 'string') throw new TypeError('Invalid password type ' + typeof pw);

    var res = org.jsoup.Jsoup.connect(this.loginUrl)
        .header('User-Agent', this.userAgent)
        .data('app_key', this.key)
        .data('validation_action', 'default')
        .data('validation_params', '{}')
        .data('ka', this.ka)
        .data('lcba', '')
        .ignoreHttpErrors(true)
        .method(org.jsoup.Connection.Method.POST)
        .execute();

    if (res.statusCode() == 401) throw new ReferenceError('Invalid api key: ' + key);
    if (res.statusCode() != 200) throw new Error('Unexpected error on method login');
    var cookies = res.cookies();
    var keys = cookies.keySet().toArray();
    for (var n = 0; n < keys.length; n++) {
        this.cookies.put(keys[n], cookies.get(keys[n]));
    }

    this.cryptoKey = res.parse().select('input[name=p]').attr('value');
    this.referer = res.url().toString();
    this.cookies.put('TIARA', org.jsoup.Jsoup.connect(this.tiaraUrl)
        .ignoreContentType(true).execute().cookie('TIARA'));

    this.authenticate(id, pw);
};

Kakao.prototype.authenticate = function(id, pw) {
    var res = org.jsoup.Jsoup.connect(this.authenticateUrl)
        .header('User-Agent', this.userAgent)
        .header('Referer', this.referer)
        .cookies(this.cookies)
        .data('os', 'web')
        .data('webview_v', '2')
        .data('email', CryptoJS.AES.encrypt(id, this.cryptoKey).toString())
        .data('password', CryptoJS.AES.encrypt(pw, this.cryptoKey).toString())
        .data('continue', decodeURIComponent(this.referer.split('continue=')[1]))
        .data('third', 'false')
        .data('k', 'true')
        .ignoreContentType(true)
        .method(org.jsoup.Connection.Method.POST)
        .execute();

    //print(res.body());
    var result = JSON.parse(res.body());
    if (result.status == -450) throw new ReferenceError('Invalid id or password');
    if (result.status != 0) throw new Error('Unexpected error on method login');

    var cookies = res.cookies();
    var keys = cookies.keySet().toArray();
    for (var n = 0; n < keys.length; n++) {
        this.cookies.put(keys[n], cookies.get(keys[n]));
    }
};

module.exports.Kakao = function() {
    return Kakao;
};