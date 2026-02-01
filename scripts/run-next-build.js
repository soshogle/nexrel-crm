const { spawnSync } = require('child_process');

const defaultMaxOldSpaceSize = process.env.NEXT_BUILD_MAX_OLD_SPACE_SIZE || '8192';
const existingNodeOptions = process.env.NODE_OPTIONS || '';

if (!/--max-old-space-size=/.test(existingNodeOptions)) {
  const separator = existingNodeOptions.trim().length > 0 ? ' ' : '';
  process.env.NODE_OPTIONS = `${existingNodeOptions}${separator}--max-old-space-size=${defaultMaxOldSpaceSize}`;
}

const nextBin = process.platform === 'win32'
  ? 'node_modules\\.bin\\next.cmd'
  : 'node_modules/.bin/next';

const result = spawnSync(nextBin, ['build'], {
  stdio: 'inherit',
  env: process.env
});

process.exit(result.status ?? 1);
