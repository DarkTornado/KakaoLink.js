/*
카카오링크 자동 전송 모듈
© 2021-2022 Dark Tornado, All rights reserved.
Based on Delta's kaling.js
*/

(function() {
    const cryptoModule = require('./crypto');
    const CryptoJS = cryptoModule.CryptoJS;
    const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36';
    const VERSION = '2022.10.01.dev';

    /* Main */
    function Kakao() {
        this.key = null;
        this.isInitialized = false;
        this.ka = null;
        this.referer = null;
        this.cookies = new java.util.HashMap();
        this.id = null;
        this.pw = null;
    };

    Kakao.prototype = {};
    Kakao.prototype.init = function(key, domain) {
        if (typeof key != 'string') throw new TypeError('Api key must be string.');
        if (key.length != 32) throw new TypeError('Invalid api key: ' + key + '.');
        if (typeof domain != 'string') throw new TypeError('Domain must be string.');
        this.key = key;
        this.ka = 'sdk/1.43.0 os/javascript sdk_type/javascript lang/en-US device/Win32 origin/' + encodeURIComponent(domain);
        this.isInitialized = true;
    };
    Kakao.prototype.login = function(id, pw, save) {
        if (!this.isInitialized) throw new TypeError('Cannot call login method before initialization.');
        if (typeof id != 'string') throw new TypeError('Invalid id type ' + typeof id);
        if (typeof pw != 'string') throw new TypeError('Invalid password type ' + typeof pw);
        var login = new LoginManager(this);
        login.applyData();
        login.authenticate(id, pw);
        if (save) {
            this.id = id;
            this.pw = pw;
        }
    };
    Kakao.prototype.send = function(room, data, type, retry) {
        if (type === undefined) type = 'default';
        if (data.hasOwnProperty('link_ver')) data.link_ver = '4.0';
        var sender = new TemplateSender(this);
        var applied = sender.prepareData(type, data);
        if (!applied) {
            if (!retry) throw new Error('Failed to send KakaoLink. Please login again and retry it.');
            if (this.id == null) throw new Error('Cannot execute auto login. Data is not enough(id, password).');
            this.login(this.id, this.pw);
            sender = new TemplateSender(this);
            var applied = sender.prepareData(type, data);
            if (!applied) throw new Error('Failed to send KakaoLink although auto login was executed.');
        }
        sender.findRoom(room);
        sender.send();
    };

    Kakao.prototype.getVersion = function() {
        return VERSION;
    };

    Kakao.prototype.applyDownloader = function(ctx) {
        createModuleDownloader(ctx);
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
            .header('referer', 'https://accounts.kakao.com/')
            .header('Upgrade-Insecure-Requests', '1')
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
            .ignoreContentType(true).header('referer', 'https://accounts.kakao.com/').execute().cookie('TIARA'));
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
        this.shortKey = null;
        this.checksum = null;
        this.csrf = null;
        this.template = null;
        this.roomList = null;
        this.channelData = null;
        this.pickerURL = 'https://sharer.kakao.com/picker/link';
        this.senderURL = 'https://sharer.kakao.com/picker/send';
    };

    TemplateSender.prototype = {};
    TemplateSender.prototype.prepareData = function(type, data) {
        var res = org.jsoup.Jsoup.connect(this.pickerURL)
            .header('User-Agent', UserAgent)
            .header('Upgrade-Insecure-Requests', '1')
            .cookies(this.kakao.cookies)
            .data('app_key', this.kakao.key)
            .data('ka', this.kakao.ka)
            .data('validation_action', type)
            .data('validation_params', JSON.stringify(data))
            .ignoreHttpErrors(true)
            .method(org.jsoup.Connection.Method.POST)
            .execute();

        var base64 = res.body().match(/serverData = "(.*)"/);
        if (base64 == null) return false;
        else base64 = base64[1];
        var decoded = new java.lang.String(android.util.Base64.decode(base64, android.util.Base64.URL_SAFE)) + '';
        var json = JSON.parse(decoded).data;

        this.shortKey = json.shortKey;
        this.csrf = json.csrfToken;
        this.checksum = json.checksum;
        this.roomList = json.chats;
        var cookies = res.cookies();
        var keys = cookies.keySet().toArray();
        for (var n = 0; n < keys.length; n++) {
            this.kakao.cookies.put(keys[n], cookies.get(keys[n]));
        }
        return true;
    };
    TemplateSender.prototype.findRoom = function(room) {
        var rooms = this.roomList;
        for (var n = 0; n < rooms.length; n++) {
            if (rooms[n].title.replace(/\u200b/g, '') == room) {
                this.channelData = rooms[n];
                return;
            }
        }
        throw new Error('Invalid room name ' + room);
    };
    TemplateSender.prototype.send = function() {
        var str = new java.lang.String(JSON.stringify(this.channelData));
        var receiver = android.util.Base64.encodeToString(str.getBytes(), android.util.Base64.NO_WRAP) + '';
        var res = org.jsoup.Jsoup.connect(this.senderURL)
            .header('User-Agent', UserAgent)
            .header('origin', 'https://sharer.kakao.com')
            .header('Referer', this.pickerURL + '?app_key=' + this.kakao.key + '&short_key=' + this.shortKey)
            .header('Content-Type', 'application/x-www-form-urlencoded')
            .header('Upgrade-Insecure-Requests', '1')
            .cookies(this.kakao.cookies)
            .data('app_key', this.kakao.key)
            .data('short_key', this.shortKey)
            .data('_csrf', this.csrf)
            .data('checksum', this.checksum)
            .data('receiver', receiver)
            .ignoreContentType(true)
            .ignoreHttpErrors(true)
            .method(org.jsoup.Connection.Method.POST)
            .execute();
    };


    /* Module Downloader */
    const GithubURL = 'https://raw.githubusercontent.com/DarkTornado/KakaoLink.js/main/';
    var ctx;

    function createModuleDownloader(_ctx) {
        ctx = _ctx;
        createUI();
    }

    function createUI() {
        var layout0 = new android.widget.LinearLayout(ctx);
        layout0.setOrientation(1);
        var title = new android.widget.Toolbar(ctx);
        title.setTitle('kaling.js 모듈 적용기');
        title.setTitleTextColor(android.graphics.Color.WHITE);
        title.setBackgroundColor(android.graphics.Color.BLACK);
        var margin = new android.widget.LinearLayout.LayoutParams(-1, -2);
        margin.setMargins(0, 0, 0, dip2px(ctx, 10));
        title.setLayoutParams(margin);
        title.setElevation(dip2px(ctx, 3));
        layout0.addView(title);

        var layout = new android.widget.LinearLayout(ctx);
        layout.setOrientation(1);

        var txt = new android.widget.TextView(ctx);
        txt.setText(' 개발자의 깃허브에서 카카오링크를 다운로드 받아서 자동으로 적용하는 기능입니다.\n' +
            ' "채팅 자동응답 봇"에서 사용시 모듈이 바로 적용되고, "메신저봇"에서 사용시 "/내장메모리/Download/" 폴더에 저장됩니다.\n\n' +
            '현재 사용중인 카링 모듈 버전 : ' + VERSION);
        txt.setTextSize(18);
        layout.addView(txt);

        var check = new android.widget.Button(ctx);
        check.setText('최신 버전 확인');
        check.setOnClickListener(new android.view.View.OnClickListener() {
            onClick: function(v) {
                var version = getNewestVersion();
                if (version == null) toast('최신버전 확인 실패');
                else showDialog('버전 정보', '현재 버전 : ' + VERSION + '\n최신 버전 : ' + version);
            }
        });
        layout.addView(check);
        var kaling = new android.widget.Button(ctx);
        kaling.setText('kaling.js 다운로드');
        kaling.setTransformationMethod(null);
        kaling.setOnClickListener(new android.view.View.OnClickListener() {
            onClick: function(v) {
                checkBotType('kaling');
            }
        });
        layout.addView(kaling);
        var crypto = new android.widget.Button(ctx);
        crypto.setText('crypto.js 다운로드');
        crypto.setTransformationMethod(null);
        crypto.setOnClickListener(new android.view.View.OnClickListener() {
            onClick: function(v) {
                checkBotType('crypto');
            }
        });
        layout.addView(crypto);

        var maker = new android.widget.TextView(ctx);
        maker.setText('\n© 2021-2022 Dark Tornado, All rights reserved.\n');
        maker.setTextSize(12);
        maker.setGravity(android.view.Gravity.CENTER);
        layout.addView(maker);

        var pad = dip2px(ctx, 16);
        layout.setPadding(pad, pad, pad, pad);
        var scroll = new android.widget.ScrollView(ctx);
        scroll.addView(layout);
        layout0.addView(scroll);
        ctx.setContentView(layout0);
        android.os.StrictMode.enableDefaults();
    }

    function getNewestVersion() {
        var url = GithubURL + 'version.txt';
        var data = getWebText(url);
        if (data == '') return null;
        return data;
    }

    function checkBotType(fileName) {
        var type = getBotType();
        if (type == '채팅 자동응답 봇') {
            prepareDownload(fileName, 'ChatBot/module');
        } else if (type == '메신저봇') {
            prepareDownload(fileName, 'Download');
        } else {
            showDialog('기능 사용 불가능', '현재 사용중이신 봇 구동 앱이 무엇인지 식별하지 못했어요.');
        }
    }

    function prepareDownload(fileName, dir) {
        var sdcard = android.os.Environment.getExternalStorageDirectory().getAbsolutePath();
        var file = new java.io.File(sdcard + '/' + dir + '/' + fileName + '.js');
        if (file.exists()) {
            alertFileExists(fileName, file);
        } else {
            download(fileName, file);
        }
    }

    function alertFileExists(fileName, file) {
        var dialog = new android.app.AlertDialog.Builder(ctx);
        dialog.setTitle('파일이 이미 있습니다');
        dialog.setMessage('기존에 있던 모듈 파일을 덮어씌우시겠습니까?');
        dialog.setNegativeButton('아니요', null);
        dialog.setPositiveButton('네', new android.content.DialogInterface.OnClickListener({
            onClick: function(v) {
                download(fileName, file);
            }
        }));
        dialog.show();
    }

    function download(fileName, file) {
        var downloaded = copyFromWeb(GithubURL + fileName + '.js', file);
        if (downloaded) showDialog('모듈 다운로드 완료', '모듈 파일을 다운로드했어요\n위치: ' + file);
        else showDialog('모듈 다운로드 실패', '모듈 파일을 다운로드하지 못했어요 :(');
    }

    function getWebText(url) {
        try {
            var url = new java.net.URL(url);
            var con = url.openConnection();
            if (con != null) {
                con.setConnectTimeout(5000);
                con.setUseCaches(false);
                var isr = new java.io.InputStreamReader(con.getInputStream());
                var br = new java.io.BufferedReader(isr);
                var str = br.readLine();
                var line = '';
                while ((line = br.readLine()) != null) {
                    str += '\n' + line;
                }
                isr.close();
                br.close();
                con.disconnect();
            }
            return str + '';
        } catch (e) {
            Log.e(e, true);
        }
        return '';
    }

    function copyFromWeb(url, file) {
        try {
            var url = new java.net.URL(url);
            var con = url.openConnection();
            if (con != null) {
                con.setConnectTimeout(5000);
                con.setUseCaches(false);
                var bis = new java.io.BufferedInputStream(con.getInputStream());
                var fos = new java.io.FileOutputStream(file);
                var bos = new java.io.BufferedOutputStream(fos);
                var buf;
                while ((buf = bis.read()) != -1) {
                    bos.write(buf);
                }
                bis.close();
                bos.close();
                con.disconnect();
                fos.close();
            }
            return true;
        } catch (e) {
            Log.e(e, true);
        }
        return false;
    }

    function showDialog(title, msg) {
        var dialog = new android.app.AlertDialog.Builder(ctx);
        dialog.setTitle(title);
        dialog.setMessage(msg);
        dialog.setNegativeButton('닫기', null);
        dialog.show();
    }

    function toast(msg) {
        android.widget.Toast.makeText(ctx, msg, android.widget.Toast.LENGTH_LONG).show();
    }

    function dip2px(ctx, dips) {
        return Math.ceil(dips * ctx.getResources().getDisplayMetrics().density);
    }

    function getBotType() {
        if (typeof com.darktornado.chatbot.BuildConfig == 'function') return '채팅 자동응답 봇';
        if (typeof com.xfl.msgbot.BuildConfig == 'function') return '메신저봇';
        return '알 수 없음';
    }


    /* Legacy Module Compatible */
    Kakao.Kakao = function() {
        return Kakao;
    };

    /* Export */
    module.exports = Kakao;
})();