#!/usr/bin/env node

import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const typeArg = (process.argv[2] || 'patch').toLowerCase();
const allowed = ['patch', 'minor', 'major'];

if (!allowed.includes(typeArg)) {
	console.error(`Unknown version type "${typeArg}". Use one of: ${allowed.join(', ')}`);
	process.exit(1);
}

const pkgPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'package.json');

async function main() {
	const pkgRaw = await readFile(pkgPath, 'utf-8');
	const pkg = JSON.parse(pkgRaw);

	const [major = 0, minor = 0, patch = 0] = String(pkg.version || '0.0.0')
		.split('.')
		.map((num) => Number.parseInt(num, 10) || 0);

	let nextMajor = major;
	let nextMinor = minor;
	let nextPatch = patch;

	if (typeArg === 'patch') {
		nextPatch += 1;
	} else if (typeArg === 'minor') {
		nextMinor += 1;
		nextPatch = 0;
	} else if (typeArg === 'major') {
		nextMajor += 1;
		nextMinor = 0;
		nextPatch = 0;
	}

	const nextVersion = [nextMajor, nextMinor, nextPatch].join('.');

	pkg.version = nextVersion;
	await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

	console.log(`Version bumped: ${major}.${minor}.${patch} → ${nextVersion}`);
}

main().catch((error) => {
	console.error('Failed to bump version:', error);
	process.exit(1);
});
















