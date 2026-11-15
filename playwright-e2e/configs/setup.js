require('dotenv').config();

process.env.PW_LOCAL_RUN_ID ??= `local${Date.now().toString(36)}`;

// Environments, endpoints and hosts are defined once in ./env (typed). This file only applies them
// to process.env, which the Playwright configs, global-setup and codegen require at startup.
const { buildConfig, applyToProcessEnv } = loadEnvModule();

// Playwright and ts-node resolve ./env to env/index.ts. Plain node (scripts/env-parity.js) doesn't,
// even with native type stripping, so register ts-node there and retry.
function loadEnvModule() {
  try {
    return require('./env');
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND' || !String(err.message).includes("'./env'")) throw err;
    require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
    return require('./env');
  }
}

let result;
try {
  result = buildConfig(process.env);
} catch (err) {
  for (const line of err.setupLogs || []) console.log(line);
  throw err;
}
applyToProcessEnv(result);
for (const line of result.logs) console.log(line);
