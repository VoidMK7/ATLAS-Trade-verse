#!/usr/bin/env node
// Assembles src/* into index.html + app.js (no dependencies). Run: node build.js
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'src'),files=fs.readdirSync(dir).sort();
let head=fs.readFileSync(path.join(dir,'10-head.html'),'utf8');
const i=head.lastIndexOf('<script>');if(i<0)throw new Error('10-head.html must end with an opening <script> tag');
head=head.slice(0,i).replace('<script src="config.js"></script>','<script src="config.js"></script>');
const js=files.filter(f=>f.endsWith('.js')).map(f=>`/* ---- ${f} ---- */\n`+fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
fs.writeFileSync(path.join(__dirname,'app.js'),js);
fs.writeFileSync(path.join(__dirname,'index.html'),head+'<script src="app.js"></script>\n</body>\n</html>\n');
console.log('built index.html + app.js ('+(js.length/1024).toFixed(0)+' KB js)');
