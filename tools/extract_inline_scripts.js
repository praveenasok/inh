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
  if (!argPath) {
    console.error('Usage: node tools/extract_inline_scripts.js <html-file> [output-dir]');
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), argPath);
  const outDir = path.resolve(process.cwd(), process.argv[3] || '.tmp-inline');
  const html = fs.readFileSync(filePath, 'utf8');
  const scripts = extractInlineScripts(html);
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(filePath).replace(/\.[^\.]+$/, '');
  scripts.forEach(({ idx, code }) => {
    const outFile = path.join(outDir, `${base}-inline-${idx}.js`);
    fs.writeFileSync(outFile, code, 'utf8');
    console.log(outFile);
  });
}

main();