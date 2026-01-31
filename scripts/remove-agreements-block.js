const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../app/(admin)/dashboard/page.tsx');
let s = fs.readFileSync(filePath, 'utf8');
const startMarker = '          {/* 租赁合同管理 - 协议列表已迁移至 AgreementManagement */}';
const endMarker = '          {/* 租赁合同管理标签页 */}';
const i = s.indexOf(startMarker);
const j = s.indexOf(endMarker, i);
if (i === -1 || j === -1) {
  console.error('Markers not found', { i, j });
  process.exit(1);
}
const before = s.slice(0, i);
const after = s.slice(j);
s = before + after;
fs.writeFileSync(filePath, s);
console.log('Removed', (j - i), 'chars');
