const fs = require('fs');
const path = require('path');

const style = fs.readFileSync('resources/css/style.css', 'utf8');
const project = fs.readFileSync('resources/css/project.css', 'utf8');
const allCss = `${style}\n${project}`;

function escapeCssClass(cls) {
  return cls.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

const files = ['index.html'];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(full.replace(/\\/g, '/'));
    }
  }
}
walk('pages');

const report = { files: {}, allMissingCount: 0, allMissing: [] };
const allMissingSet = new Set();
const classRe = /class\s*=\s*"([^"]+)"/g;

for (const rel of files) {
  const html = fs.readFileSync(rel, 'utf8');
  const classSet = new Set();
  let m;
  while ((m = classRe.exec(html)) !== null) {
    for (const c of m[1].trim().split(/\s+/)) {
      if (c) classSet.add(c);
    }
  }

  const missing = [...classSet]
    .filter((c) => !allCss.includes(`.${escapeCssClass(c)}`))
    .sort();

  report.files[rel] = {
    totalClasses: classSet.size,
    missingCount: missing.length,
    missing,
  };

  for (const c of missing) allMissingSet.add(c);
}

report.allMissing = [...allMissingSet].sort();
report.allMissingCount = report.allMissing.length;

fs.writeFileSync('.missing-classes-report.json', JSON.stringify(report, null, 2));
console.log('WROTE .missing-classes-report.json');
