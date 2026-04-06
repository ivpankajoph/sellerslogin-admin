const fs = require('fs');
const filePath = 'c:\\oph work\\sellerslogin-admin\\src\\features\\integrations\\index.tsx';
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split(/\r?\n/);

// Remove the lines 986 to 1180 (0-indexed: 985 to 1179)
// The count is 1180 - 986 + 1 = 195 lines
lines.splice(985, 195);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Removed duplicate code successfully.');
