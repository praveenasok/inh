const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'delegated-orders.html');
if (!fs.existsSync(htmlPath)) {
  console.error("File not found:", htmlPath);
  process.exit(1);
}

const content = fs.readFileSync(htmlPath, 'utf8');

// Regex to find all script blocks
const regex = /<script>([\s\S]*?)<\/script>|<script\s+type="[^"]+">([\s\S]*?)<\/script>/gi;
let match;
let index = 1;
let hasErrors = false;

while ((match = regex.exec(content)) !== null) {
  const jsCode = match[1] || match[2] || '';
  if (!jsCode.trim()) continue;

  console.log(`Script block #${index} found. Size: ${jsCode.length} chars`);
  
  try {
    new vm.Script(jsCode);
    console.log(`✅ Script block #${index} syntax is valid!`);
  } catch (e) {
    console.error(`❌ Syntax Error in Script block #${index}:`, e.message);
    console.error(e.stack);
    hasErrors = true;
  }
  index++;
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log("🎉 All embedded script blocks are syntactically correct!");
  process.exit(0);
}
