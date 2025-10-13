import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

export function isMountPoint(dirPath: string) {
	try {
		const stats = fs.statSync(dirPath);
		const parentPath = path.resolve(dirPath, "..");
		const parentStats = fs.statSync(parentPath);
		return stats.dev !== parentStats.dev || stats.ino === parentStats.ino;
	} catch (e) {
		console.error(e);
		return false;
	}
}

export function execSync(parts: string[]) {
	const child = spawnSync(parts[0], parts.slice(1));
}
