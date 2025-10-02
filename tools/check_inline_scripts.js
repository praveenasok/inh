const fs = require('fs');
const path = require('path');

function extractInlineScripts(html) {
  const scripts = [];
  const regex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi;
  let match, idx = 0;
  while ((match = regex.exec(html))) {
    scripts.push({ idx: ++idx, code: match[1] });
  }
  return scripts;
}

function main() {
  const argPath = process.argv[2];
  const filePath = argPath
    ? path.resolve(process.cwd(), argPath)
    : path.resolve(__dirname, '..', 'quotemaker.html');
  const html = fs.readFileSync(filePath, 'utf8');
  const scripts = extractInlineScripts(html);
  console.log('Inline script blocks found:', scripts.length);
  let failures = 0;
  scripts.forEach(({ idx, code }) => {
    try {
      // Using Function constructor for quick syntax validation
      new Function(code);
      console.log(`OK inline script #${idx}`);
    } catch (e) {
      failures++;
      console.log(`FAIL inline script #${idx}: ${e.message}`);
      const preview = code.split('\n').slice(0, 40).join('\n');
      console.log('--- Begin Script Preview ---');
      console.log(preview);
      console.log('--- End Script Preview ---');
    }
  });
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();