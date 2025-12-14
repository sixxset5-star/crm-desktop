#!/usr/bin/env node

import path from 'node:path';
import { rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.resolve(__dirname, '..', 'release');

async function main() {
	await rm(releaseDir, { recursive: true, force: true });
	await mkdir(releaseDir, { recursive: true });
	console.log(`Release folder cleaned: ${releaseDir}`);
}

main().catch((error) => {
	console.error('Failed to clean release folder:', error);
	process.exit(1);
});
















