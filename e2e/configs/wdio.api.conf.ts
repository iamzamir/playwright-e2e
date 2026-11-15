require("./setup.js");

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let testFile = path.resolve(__dirname, '../specs/DataSetup/ODM/Test_002_RestartMaasCluster.spec.ts');
let timeout = 30000;

// Construct the command to run the test
const command = `cross-env ENVIRONMENT=INTEROP npx mocha "${testFile}" --require ts-node/register --timeout ${timeout} --reporter mocha-allure-reporter --reporter-options targetDir=.e2e/reports/allure-results`;

// Execute the command
execSync(command, { stdio: 'inherit' });