#!/usr/bin/env node
// Generates vendor/qr.js from the QR encoder bundled with npm (qrcode-terminal/vendor/QRCode, MIT, Kazuhiko Arase).
// Output exposes window.qrcode(0,'M') with addData/make/createSvgTag, so no third-party script is loaded at runtime.
const fs=require('fs'),path=require('path');
const src=process.argv[2]||'/opt/node22/lib/node_modules/npm/node_modules/qrcode-terminal/vendor/QRCode';
const names=fs.readdirSync(src).filter(f=>f.endsWith('.js')).map(f=>f.replace(/\.js$/,''));
let out=`/*! QR encoder: QRCode for JavaScript, Copyright (c) 2009 Kazuhiko Arase, MIT license (http://www.opensource.org/licenses/mit-license.php).\n    "QR Code" is a registered trademark of DENSO WAVE INCORPORATED. Bundled as-is; wrapper API below. */\n(function(){\nvar __m={},__c={};\nfunction __r(n){n=n.replace(/^\\.\\//,'').replace(/\\.js$/,'');if(__c[n])return __c[n].exports;var m=__c[n]={exports:{}};__m[n](m,m.exports,__r);return m.exports}\n`;
for(const n of names){out+=`__m[${JSON.stringify(n)}]=function(module,exports,require){\n${fs.readFileSync(path.join(src,n+'.js'),'utf8')}\n};\n`}
out+=`var QRCode=__r('index'),EC=__r('QRErrorCorrectLevel');
window.qrcode=function(typeNumber,level){var q=new QRCode(typeNumber||-1,EC[level||'M']);
  q.createSvgTag=function(o){o=o||{};var cs=o.cellSize||4,mg=o.margin==null?cs*4:o.margin*cs,n=q.getModuleCount(),s=n*cs+mg*2,d='';
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.isDark(r,c))d+='M'+(mg+c*cs)+','+(mg+r*cs)+'h'+cs+'v'+cs+'h-'+cs+'z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+s+' '+s+'"><rect width="'+s+'" height="'+s+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'};
  return q};
})();\n`;
fs.writeFileSync(path.join(__dirname,'..','vendor','qr.js'),out);console.log('vendor/qr.js',out.length,'bytes');
