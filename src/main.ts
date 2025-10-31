import * as DotEnv from "dotenv";
import fs from "fs";
import path from "path";
import Axios from "axios";
import { Agent } from "https";
import { ISunshineApps } from "./interface/sunshine/sunshine-apps.interface";
import { ISunshineApp } from "./interface/sunshine/sunshine-app.interface";

DotEnv.config();

const GAME_DIRECTORY = process.env.GAME_DIRECTORY;
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

checkEnv(GAME_DIRECTORY, "GAME_DIRECTORY");
checkEnv(SUNSHINE_COMMAND, "SUNSHINE_COMMAND");
checkEnv(SUNSHINE_ADDRESS, "SUNSHINE_ADDRESS");
checkEnv(SUNSHINE_USERNAME, "SUNSHINE_USERNAME");
checkEnv(SUNSHINE_PASSWORD, "SUNSHINE_PASSWORD");

const dirs = fs.readdirSync(GAME_DIRECTORY);

const newApps: ISunshineApp[] = [];
for (let dir of dirs) {
	const fullDir = path.join(GAME_DIRECTORY, dir);
	const stat = fs.lstatSync(fullDir);
	if (!stat.isDirectory()) {
		console.log(`"${dir}" isn't a directory, skipping.`);
	} else {
		const contents = fs.readdirSync(fullDir);

		if (contents.includes("PS3_GAME")) {
			console.log("PS3 Game located:", dir);

			newApps.push({
				name: dir,
				cmd: SUNSHINE_COMMAND.split("{PS3_GAME_MOUNT}").join(fullDir),
				index: -1,
				"image-path": path.join(fullDir, "PS3_GAME", "ICON0.PNG"),
				"prep-cmd": [
					{
						do: '/run/current-system/sw/bin/sh -c "/run/current-system/sw/bin/hyprctl keyword monitor DP-1,${SUNSHINE_CLIENT_WIDTH}x${SUNSHINE_CLIENT_HEIGHT}@${SUNSHINE_CLIENT_FPS},0x0,1"',
						undo: '/run/current-system/sw/bin/sh -c "/run/current-system/sw/bin/hyprctl keyword monitor DP-1,3440x1440@144,0x0,1"',
					},
					{
						do: "",
						undo: "/run/current-system/sw/bin/pkill gamescope",
					},
				],
			});
		}
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
