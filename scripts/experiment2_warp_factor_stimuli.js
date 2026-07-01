#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const BASELINE_SCRIPT = path.join(__dirname, 'experiment2_expert_stimuli.js');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output', 'experiment2_warp_factor_stimuli');

const passthroughArgs = process.argv.slice(2);
const hasOutputDir = passthroughArgs.includes('--output-dir');
const args = hasOutputDir ? passthroughArgs : ['--output-dir', DEFAULT_OUTPUT_DIR, ...passthroughArgs];

const result = spawnSync(process.execPath, [BASELINE_SCRIPT, ...args], {
  env: {
    ...process.env,
    EXPERIMENT2_VARIANT: 'warp-factor',
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
