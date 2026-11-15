const fs = require('fs');
const path = require('path');

function isHeavyAttachment(att) {
  if (!att) return false;
  const name = (att.name || '').toLowerCase();
  const type = (att.type || '').toLowerCase();
  const source = (att.source || '').toLowerCase();

  // Playwright traces: strictly check for trace metadata or trace-specific filename.
  // Do NOT match generic attachment*.zip as Allure names all zip attachments <uuid>-attachment.zip.
  const isTrace = name === 'trace' || name.includes('trace') || type.includes('trace') || /(^|[._-])trace.*\.zip$/i.test(source);
  if (isTrace) {
    return true;
  }
  // Videos
  const isVideo = name.includes('video') || type.startsWith('video/') || source.endsWith('.webm') || source.endsWith('.mp4');
  if (isVideo) {
    return true;
  }
  return false;
}

function filterAttachments(attachments, removedSources) {
  if (!Array.isArray(attachments)) return { kept: [], changed: false };
  const kept = [];
  let changed = false;
  for (const att of attachments) {
    if (isHeavyAttachment(att)) {
      if (att.source) removedSources.push(att.source);
      changed = true;
    } else {
      kept.push(att);
    }
  }
  return { kept, changed };
}

function filterSteps(steps, removedSources) {
  if (!Array.isArray(steps)) return { kept: [], changed: false };
  const kept = [];
  let changed = false;

  for (const step of steps) {
    const stepName = (step.name || '').toLowerCase();
    if (stepName === 'trace' || stepName === 'video') {
      if (Array.isArray(step.attachments)) {
        for (const att of step.attachments) {
          if (att.source) removedSources.push(att.source);
        }
      }
      changed = true;
      continue;
    }

    const attFilter = filterAttachments(step.attachments, removedSources);
    if (attFilter.changed) {
      step.attachments = attFilter.kept;
      changed = true;
    }

    if (Array.isArray(step.steps) && step.steps.length > 0) {
      const childFilter = filterSteps(step.steps, removedSources);
      if (childFilter.changed) {
        step.steps = childFilter.kept;
        changed = true;
      }
    }

    kept.push(step);
  }
  return { kept, changed };
}

function stripAllureTraces(targetDir) {
  const resultsDir = targetDir
    ? path.resolve(targetDir)
    : path.resolve(__dirname, '..', 'reports', 'allure-results');

  if (!fs.existsSync(resultsDir)) {
    return 0;
  }

  let totalFilesRemoved = 0;
  let totalJsonModified = 0;

  try {
    const files = fs.readdirSync(resultsDir);
    const resultJsonFiles = files.filter(f => f.endsWith('-result.json'));

    for (const jsonFile of resultJsonFiles) {
      const fullJsonPath = path.join(resultsDir, jsonFile);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(fullJsonPath, 'utf-8'));
      } catch {
        continue;
      }

      const removedSources = [];
      let modified = false;

      const topAttFilter = filterAttachments(data.attachments, removedSources);
      if (topAttFilter.changed) {
        data.attachments = topAttFilter.kept;
        modified = true;
      }

      const stepFilter = filterSteps(data.steps, removedSources);
      if (stepFilter.changed) {
        data.steps = stepFilter.kept;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullJsonPath, JSON.stringify(data));
        totalJsonModified++;
        for (const src of removedSources) {
          const srcPath = path.join(resultsDir, src);
          try {
            if (fs.existsSync(srcPath)) {
              fs.unlinkSync(srcPath);
              totalFilesRemoved++;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // Secondary sweep: remove any orphaned trace zips or webm video files left in resultsDir
    const remainingFiles = fs.readdirSync(resultsDir);
    for (const file of remainingFiles) {
      if (/(^|[._-])trace.*\.zip$/i.test(file) || file.endsWith('.webm') || file.endsWith('.mp4')) {
        try {
          fs.unlinkSync(path.join(resultsDir, file));
          totalFilesRemoved++;
        } catch {
          // ignore
        }
      }
    }

    if (totalFilesRemoved > 0 || totalJsonModified > 0) {
      console.log(`[strip-allure-traces] Cleaned ${totalJsonModified} result JSON(s) and removed ${totalFilesRemoved} trace/video file(s) from ${resultsDir}`);
    }
  } catch (err) {
    console.warn(`[strip-allure-traces] Warning during cleanup: ${err.message}`);
  }

  return totalFilesRemoved;
}

if (require.main === module) {
  const dir = process.argv[2];
  stripAllureTraces(dir);
}

module.exports = { stripAllureTraces, isHeavyAttachment };
