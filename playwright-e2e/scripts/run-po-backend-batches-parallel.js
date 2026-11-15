const { spawn } = require('child_process');

const environment = (process.env.ENVIRONMENT || 'INTEROP').toLowerCase();

if (!['qa', 'interop'].includes(environment)) {
  console.error(`Unsupported ENVIRONMENT value: ${process.env.ENVIRONMENT}. Expected QA or INTEROP.`);
  process.exit(1);
}

const prefix = environment === 'qa' ? 'test:qa:pobackend' : 'test:interop:pobackend';

// Migration isn't supported on QA (Test_009 has no QA test data, so the batch fails at load); the
// nightly workflow skips it too (playwright-po-backend-suite.yaml). Run it on INTEROP.
const batchNames = ['actionitem', 'calendar', 'linkmanagement', 'migration', 'processbatch', 'uifields']
  .filter((name) => !(environment === 'qa' && name === 'migration'));
if (environment === 'qa') {
  console.log('Migration batch skipped: not supported on QA. Run test:interop:pobackend:migration instead.');
}

const batchScripts = batchNames.map((name) => `${prefix}:${name}`);

function runBatch(scriptName) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', scriptName], {
      shell: true,
      stdio: 'inherit',
      // Keeps each concurrent batch's HTML/Monocart report in its own folder,
      // and disables the inline reporter filter so concurrent children do not race.
      env: {
        ...process.env,
        PW_REPORT_TAG: scriptName.split(':').pop(),
        PW_DISABLE_INLINE_ALLURE_FILTER: 'true'
      }
    });

    child.on('close', (code) => {
      resolve({ scriptName, code: code ?? 1 });
    });

    child.on('error', () => {
      resolve({ scriptName, code: 1 });
    });
  });
}

async function main() {
  console.log(`Starting ${batchScripts.length} ProcessOrchestrationBackend batches in parallel for ENVIRONMENT=${environment.toUpperCase()}, each with workers=1${environment === 'qa' ? '' : ' (except migration with workers=2)'}...`);
  const results = await Promise.all(batchScripts.map(runBatch));

  // Run the Allure trace filter once cleanly across all collected results
  try {
    const { stripAllureTraces } = require('./strip-allure-traces.js');
    if (process.env.CI || (process.env.PW_STRIP_ALLURE_TRACES || '').toLowerCase() === 'true') {
      stripAllureTraces();
    }
  } catch (err) {
    console.warn(`Warning running post-batch trace cleanup: ${err.message}`);
  }

  const failed = results.filter((result) => result.code !== 0);
  if (failed.length > 0) {
    console.error('One or more batch runs failed:');
    failed.forEach((result) => console.error(`- ${result.scriptName} exited with code ${result.code}`));
    process.exit(1);
  }

  console.log('All ProcessOrchestrationBackend batch runs completed successfully.');
}

main();
