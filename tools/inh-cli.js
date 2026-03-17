#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
function readFile(p){return fs.readFileSync(p,'utf8')}
function writeFile(p,c){fs.writeFileSync(p,c,'utf8')}
function getFirebaseKey(){const p=path.resolve(__dirname,'..','firebase-config.js');const s=readFile(p);const m=s.match(/apiKey:\s*"([^"]+)"/);if(!m){process.stdout.write('apiKey: (not found)\n');return}process.stdout.write(`apiKey: ${m[1]}\n`)}
function setFirebaseKey(k){const p=path.resolve(__dirname,'..','firebase-config.js');let s=readFile(p);s=s.replace(/(apiKey:\s*")[^"]+("\s*,)/,`$1${k}$2`);writeFile(p,s);process.stdout.write('Firebase apiKey updated\n')}
function getDriveKey(){const p=path.resolve(__dirname,'..','js','google-drive-config.js');const s=readFile(p);const m=s.match(/API_KEY:\s*'([^']+)'/);if(!m){process.stdout.write('Drive API_KEY: (not found)\n');return}process.stdout.write(`Drive API_KEY: ${m[1]}\n`)}
function setDriveKey(k){const p=path.resolve(__dirname,'..','js','google-drive-config.js');let s=readFile(p);s=s.replace(/(API_KEY:\s*')[^']+('\s*,)/,`$1${k}$2`);writeFile(p,s);process.stdout.write('Drive API_KEY updated\n')}
function getConfig(){getFirebaseKey();getDriveKey()}
function setConfig(opts){if(opts.firebase){setFirebaseKey(opts.firebase)}if(opts.drive){setDriveKey(opts.drive)}}
function usage(){process.stdout.write(
`inh-cli
Usage:
  node tools/inh-cli.js help
  node tools/inh-cli.js firebase:get-key
  node tools/inh-cli.js firebase:set-key <key>
  node tools/inh-cli.js drive:get-key
  node tools/inh-cli.js drive:set-key <key>
  node tools/inh-cli.js config:get
  node tools/inh-cli.js config:set [--firebase <key>] [--drive <key>]
  node tools/inh-cli.js preview
`)}
function preview(){process.stdout.write('http://localhost:8083/\n')}
const args=process.argv.slice(2);
const cmd=args[0]||'help';
if(cmd==='help'){usage()}
else if(cmd==='firebase:get-key'){getFirebaseKey()}
else if(cmd==='firebase:set-key'){const k=args[1];if(!k){process.stderr.write('Missing <key>\n');process.exit(1)}setFirebaseKey(k)}
else if(cmd==='drive:get-key'){getDriveKey()}
else if(cmd==='drive:set-key'){const k=args[1];if(!k){process.stderr.write('Missing <key>\n');process.exit(1)}setDriveKey(k)}
else if(cmd==='config:get'){getConfig()}
else if(cmd==='config:set'){let fb=null;let dr=null;for(let i=1;i<args.length;i++){if(args[i]==='--firebase'){fb=args[i+1]}if(args[i]==='--drive'){dr=args[i+1]}}setConfig({firebase:fb,drive:dr})}
else if(cmd==='preview'){preview()}
else{usage();process.exitCode=1}
