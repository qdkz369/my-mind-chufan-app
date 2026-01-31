const fs = require("fs");
const path = require("path");
const fullPath = path.join(process.cwd(), "app", "(admin)", "dashboard", "page.tsx");
const content = fs.readFileSync(fullPath, "utf8");
const lines = content.split("\n");
const start = 1021;  // 0-based, line 1022
const end = 1307;    // 0-based, line 1308
const replacement = ["  // 工人添加/编辑/删除 handlers 已迁入 WorkersWithDialogs", ""];
const newLines = lines.slice(0, start).concat(replacement).concat(lines.slice(end + 1));
fs.writeFileSync(fullPath, newLines.join("\n"));
console.log("Removed lines", start + 1, "to", end + 1);
