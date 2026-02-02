/**
 * 瘦身计划 V2：将根目录散落 .md 和 .sql 移动到 archive，保留 UTF-8 路径。
 * 运行：node scripts/move-archive-slimming.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'docs', 'archive', 'reports');
const sqlDir = path.join(root, 'scripts', 'archive-sql');

const skipMd = new Set(['README.md']); // 若有根目录 README 可保留

if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
if (!fs.existsSync(sqlDir)) fs.mkdirSync(sqlDir, { recursive: true });

const entries = fs.readdirSync(root, { withFileTypes: true });
const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md') && !skipMd.has(e.name));
const sqlFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.sql'));

let movedMd = 0;
let movedSql = 0;
mdFiles.forEach((f) => {
  const src = path.join(root, f.name);
  const dest = path.join(reportsDir, f.name);
  try {
    fs.renameSync(src, dest);
    movedMd++;
  } catch (err) {
    console.error('Move MD failed:', f.name, err.message);
  }
});
sqlFiles.forEach((f) => {
  const src = path.join(root, f.name);
  const dest = path.join(sqlDir, f.name);
  try {
    fs.renameSync(src, dest);
    movedSql++;
  } catch (err) {
    console.error('Move SQL failed:', f.name, err.message);
  }
});

console.log('Moved .md:', movedMd, 'to docs/archive/reports/');
console.log('Moved .sql:', movedSql, 'to scripts/archive-sql/');
