const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs');
const crc = require('node-crc');
const crc32 = str => crc.crc32(Buffer.from(str, 'utf8')).toString('hex');
/**
 * 新浪微博登录(无加密接口版本)
 * @param  string $u 用户名
 * @param  string $p 密码
 * @return string    返回最有用最精简的cookie
 */
async function login($u, $p) {
  let cookie = fs.readFileSync('cookie.txt').toString();
  if (cookie) { return cookie; }
  const $loginUrl = 'https://login.sina.com.cn/sso/login.php?client=ssologin.js(v1.4.15)&_=1403138799543';
  const $loginData = {};
  $loginData['entry'] = 'sso';
  $loginData['gateway'] = '1';
  $loginData['from'] = 'null';
  $loginData['savestate'] = '30';
  $loginData['useticket'] = '0';
  $loginData['pagerefer'] = '';
  $loginData['vsnf'] = '1';
  $loginData['su'] = Buffer.from($u).toString('base64')
  $loginData['service'] = 'sso';
  $loginData['sp'] = $p;
  $loginData['sr'] = '1920*1080';
  $loginData['encoding'] = 'UTF-8';
  $loginData['cdult'] = '3';
  $loginData['domain'] = 'sina.com.cn';
  $loginData['prelt'] = '0';
  $loginData['returntype'] = 'TEXT';
  const res = await axios.post($loginUrl, querystring.stringify($loginData), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  cookie = res.headers['set-cookie'][1];
  fs.writeFileSync('cookie.txt', cookie);
  return cookie;
}

async function upload(b64_data) {
  const weiboAccount = process.env.WEIBO_ACCOUNT;
  if (!weiboAccount) { return console.log('请设置环境变量 WEIBO_ACCOUNT 格式为 username;password'); }
  const [$u, $p] = weiboAccount.split(';');
  const cookie = await login($u, $p);
  const $uploadUrl = 'http://picupload.service.weibo.com/interface/pic_upload.php?mime=image%2Fjpeg&data=base64&url=0&markpos=1&logo=&nick=0&marks=1&app=miniblog';
  const $uploadData = { b64_data };
  const res = await axios.post($uploadUrl, querystring.stringify($uploadData), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      'Cookie': cookie
    }
  });
  const code = res.data.match(/"code":"(\w+)"/)[1];
  if (code == 'A20001') {
    fs.writeFileSync('cookie.txt', '');
    return upload(b64_data);;
  }
  const $pid = res.data.match(/"pid":"(\w+)"/)[1];
  // 所有尺寸：'large', 'mw1024', 'mw690', 'bmiddle', 'small', 'thumb180', 'thumbnail', 'square'
  return `//ws${(crc32($pid) & 3) + 1}.sinaimg.cn/large/${$pid}.${$pid[21] === 'g' ? 'gif' : 'jpg'}`;
}

(async () => {
  const bitmap = fs.readFileSync('users.png');
  const base64 = new Buffer(bitmap).toString('base64');
  const url = await upload(base64);
  console.log(url);
})()
