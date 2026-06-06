const fs = require('fs');
const vm = require('vm');

console.log('Verifying delegated-orders.html...');
try {
  const html = fs.readFileSync('/Users/praveenasok/Desktop/inhsuite/delegated-orders.html', 'utf8');
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIndex = 1;
  while ((match = scriptRegex.exec(html)) !== null) {
    const code = match[1].trim();
    if (!code || match[0].includes('src=')) continue;
    
    console.log(`Verifying inline script block ${scriptIndex}...`);
    try {
      new vm.Script(code);
    } catch (scriptErr) {
      console.error(`Error in script block ${scriptIndex}:`, scriptErr.message);
      // Let's print out some surrounding lines to help debug
      const lines = code.split('\n');
      console.log('Around the error:');
      const errLine = scriptErr.stack.split('\n')[0];
      console.log(errLine);
      throw scriptErr;
    }
    scriptIndex++;
  }
  console.log('delegated-orders.html is syntactically 100% correct!');
} catch (err) {
  console.error('delegated-orders.html has syntax error:', err.message);
  process.exit(1);
}
