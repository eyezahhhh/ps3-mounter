import { execSync } from "child_process";
import * as DotEnv from "dotenv";
import fs from "fs";
import path from "path";
import Axios from "axios";
import { Agent } from "https";
import { ISunshineApps } from "./interface/sunshine/sunshine-apps.interface";
import { ISunshineApp } from "./interface/sunshine/sunshine-app.interface";

DotEnv.config();

const ISO_DIRECTORY = process.env.ISO_DIRECTORY;
const MOUNT_DIRECTORY = process.env.MOUNT_DIRECTORY;
const SUNSHINE_COMMAND = process.env.SUNSHINE_COMMAND;
const SUNSHINE_ADDRESS = process.env.SUNSHINE_ADDRESS;
const SUNSHINE_USERNAME = process.env.SUNSHINE_USERNAME;
const SUNSHINE_PASSWORD = process.env.SUNSHINE_PASSWORD;

function checkEnv(
	variable: string | undefined,
	name: string,
): asserts variable is string {
	if (!variable) {
		console.error(`Environment variable "${name}" is not set!`);
		process.exit(1);
	}
	console.log(`${name}: ${variable}`);
}

checkEnv(ISO_DIRECTORY, "ISO_DIRECTORY");
checkEnv(MOUNT_DIRECTORY, "MOUNT_DIRECTORY");
checkEnv(SUNSHINE_COMMAND, "SUNSHINE_COMMAND");
checkEnv(SUNSHINE_ADDRESS, "SUNSHINE_ADDRESS");
checkEnv(SUNSHINE_USERNAME, "SUNSHINE_USERNAME");
checkEnv(SUNSHINE_PASSWORD, "SUNSHINE_PASSWORD");

const dirs = fs.readdirSync(ISO_DIRECTORY);

const mounts: string[] = [];
const newApps: ISunshineApp[] = [];
for (let dir of dirs) {
	const fullDir = path.join(ISO_DIRECTORY, dir);
	const stat = fs.lstatSync(fullDir);
	if (!stat.isDirectory()) {
		console.log(`"${dir}" isn't a directory, skipping.`);
	} else {
		const contents = fs.readdirSync(fullDir);

		const iso = contents.find((file) => file.toLowerCase().endsWith(".iso"));
		if (!iso) {
			console.log(`${dir} doesn't contain an ISO file, skipping.`);
		} else {
			console.log(`Found ISO: "${iso}"`);

			const mountPath = path.join(MOUNT_DIRECTORY, dir);
			let exists = false;

			if (fs.existsSync(mountPath)) {
				const mountStat = fs.lstatSync(mountPath);
				if (mountStat.isDirectory()) {
					const contents = fs.readdirSync(mountPath);
					if (contents.includes("PS3_GAME")) {
						exists = true;
					}
				} else {
					fs.rmSync(mountPath, {
						force: true,
						recursive: true,
					});
				}
			}

			if (!exists) {
				fs.mkdirSync(mountPath, {
					recursive: true,
				});

				console.log(`Mounting to: "${mountPath}"`);
				const command = `fuseiso "${path.join(fullDir, iso)}" "${mountPath}"`;
				execSync(command);
			}

			mounts.push(dir);
			newApps.push({
				name: dir,
				cmd: SUNSHINE_COMMAND.split("{PS3_GAME_MOUNT}").join(mountPath),
				index: -1,
				"image-path": path.join(mountPath, "PS3_GAME", "ICON0.PNG"),
				"prep-cmd": [
					{
						do: 'sh -c "hyprctl keyword monitor DP-1,${SUNSHINE_CLIENT_WIDTH}x${SUNSHINE_CLIENT_HEIGHT}@${SUNSHINE_CLIENT_FPS},0x0,1"',
						undo: 'sh -c "hyprctl keyword monitor DP-1,3440x1440@144,0x0,1"',
					},
				],
			});
		}
	}
}

for (let dir of dirs) {
	if (!mounts.includes(dir)) {
		console.log("DELETING", dir);
		fs.rmSync(dir, {
			force: true,
			recursive: true,
		});
	}
}

function getAxios() {
	return Axios.create({
		baseURL: SUNSHINE_ADDRESS,
		httpsAgent: new Agent({
			rejectUnauthorized: false,
		}),
		headers: {
			Authorization: `Basic ${Buffer.from(`${SUNSHINE_USERNAME}:${SUNSHINE_PASSWORD}`).toString("base64")}`,
		},
	});
}

(async () => {
	const { data: apps } = await getAxios().get<ISunshineApps>("api/apps");

	for (let i = apps.apps.length - 1; i >= 0; i--) {
		console.log(`Deleting app ${i}`);
		await getAxios().delete(`api/apps/${i}`, {
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	for (let app of newApps) {
		console.log(`Creating app ${app.name}`);
		await getAxios().post("api/apps", app);
	}
})();
