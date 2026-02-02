/**
 * 瘦身计划 V2：将 .backup/constraints 移动到 docs/archive/backup-constraints（A 类工程冻结，保留文本）
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, '.backup', 'constraints');
const destDir = path.join(root, 'docs', 'archive', 'backup-constraints');

if (!fs.existsSync(srcDir)) {
  console.log('.backup/constraints not found, skip.');
  process.exit(0);
}
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const names = fs.readdirSync(srcDir);
let n = 0;
names.forEach((name) => {
  const src = path.join(srcDir, name);
  const dest = path.join(destDir, name);
  if (fs.statSync(src).isFile()) {
    fs.renameSync(src, dest);
    n++;
  }
});
console.log('Moved', n, 'files from .backup/constraints to docs/archive/backup-constraints/');

// 删除空目录 .backup/constraints 和 .backup
try {
  if (fs.existsSync(path.join(root, '.backup', 'constraints')) && fs.readdirSync(path.join(root, '.backup', 'constraints')).length === 0) {
    fs.rmdirSync(path.join(root, '.backup', 'constraints'));
  } else if (fs.existsSync(path.join(root, '.backup', 'constraints'))) {
    fs.readdirSync(path.join(root, '.backup', 'constraints')).forEach((f) => {
      fs.unlinkSync(path.join(root, '.backup', 'constraints', f));
    });
    fs.rmdirSync(path.join(root, '.backup', 'constraints'));
  }
  if (fs.existsSync(path.join(root, '.backup')) && fs.readdirSync(path.join(root, '.backup')).length === 0) {
    fs.rmdirSync(path.join(root, '.backup'));
  }
  console.log('Removed empty .backup directory.');
} catch (e) {
  console.error('Cleanup .backup:', e.message);
}
