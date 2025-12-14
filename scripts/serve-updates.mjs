#!/usr/bin/env node

import express from 'express';
import serveStatic from 'serve-static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, stat } from 'node:fs/promises';

const PORT = Number(process.env.UPDATES_PORT || 9000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASE_DIR = path.resolve(__dirname, '..', 'release');

const app = express();

app.use('/files', serveStatic(RELEASE_DIR));

function formatBytes(size) {
	if (!Number.isFinite(size)) return '-';
	const units = ['B', 'KB', 'MB', 'GB'];
	let idx = 0;
	let current = size;
	while (current >= 1024 && idx < units.length - 1) {
		current /= 1024;
		idx += 1;
	}
	return `${current.toFixed(current >= 10 ? 0 : 1)} ${units[idx]}`;
}

async function getEntries() {
	try {
		const names = await readdir(RELEASE_DIR);
		const entries = await Promise.all(
			names.map(async (name) => {
				const fullPath = path.join(RELEASE_DIR, name);
				const stats = await stat(fullPath);
				return {
					name,
					isDir: stats.isDirectory(),
					size: stats.size,
					mtime: stats.mtimeMs,
					url: `/files/${encodeURIComponent(name)}${stats.isDirectory() ? '/' : ''}`,
				};
			}),
		);
		return entries.sort((a, b) => Number(b.mtime - a.mtime));
	} catch (error) {
		return { error };
	}
}

app.get('/', async (_req, res) => {
	const result = await getEntries();
	if (result.error) {
		res.status(500).send(`<h1>CRM Desktop Updates</h1><p>Не могу прочитать папку release: ${result.error.message}</p>`);
		return;
	}
	const rows = result
		.map(
			(entry) => `<tr>
				<td><a href="${entry.url}" target="_blank" rel="noopener noreferrer">${entry.name}${entry.isDir ? '/' : ''}</a></td>
				<td>${entry.isDir ? '—' : formatBytes(entry.size)}</td>
				<td>${new Date(entry.mtime).toLocaleString()}</td>
			</tr>`,
		)
		.join('');

	res.send(`<!doctype html>
<html lang="ru">
<head>
	<meta charset="UTF-8" />
	<title>CRM Desktop Updates</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0f172a; color:#f1f5f9; margin:0; padding:40px; }
		.container { max-width: 900px; margin: 0 auto; }
		h1 { margin-bottom: 12px; }
		p { margin-top: 0; margin-bottom: 24px; color:#cbd5f5; }
		code { background:rgba(15,23,42,0.5); padding:2px 6px; border-radius:4px; }
		table { width:100%; border-collapse: collapse; background:#1e293b; border-radius:16px; overflow:hidden; box-shadow:0 20px 45px rgba(15,23,42,0.35); }
		th, td { padding:14px 16px; text-align:left; }
		th { background:#0f172a; font-weight:600; text-transform:uppercase; font-size:12px; letter-spacing:1px; color:#94a3b8; }
		tr:nth-child(even) td { background:#162033; }
		tr:hover td { background:#22304b; }
		a { color:#38bdf8; text-decoration:none; }
		a:hover { text-decoration:underline; }
		.badge { display:inline-block; padding:4px 10px; border-radius:999px; background:#0f172a; color:#38bdf8; font-size:12px; margin-left:8px; }
		.footer { margin-top:24px; font-size:12px; color:#64748b; }
	</style>
</head>
<body>
	<div class="container">
		<h1>CRM Desktop Updates <span class="badge">local</span></h1>
		<p>Сервер раздаёт содержимое папки <code>${RELEASE_DIR}</code>. Используй <code>npm run serve:updates</code>, потом запускай приложение.</p>
		<table>
			<thead>
				<tr>
					<th>Файл</th>
					<th>Размер</th>
					<th>Изменён</th>
				</tr>
			</thead>
			<tbody>${rows || '<tr><td colspan="3">Папка пуста — сперва собери релиз.</td></tr>'}</tbody>
		</table>
		<div class="footer">Запущено на http://localhost:${PORT} • Остановить сервер: Ctrl+C</div>
	</div>
</body>
</html>`);
});

app.listen(PORT, () => {
	console.log(`📦 CRM Desktop updates server running on http://localhost:${PORT}`);
	console.log(`Serving static files from ${RELEASE_DIR}`);
});
















