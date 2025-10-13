import { ISunshineApp } from "./sunshine-app.interface";

export interface ISunshineApps {
	apps: ISunshineApp[];
	env: Record<string, string>;
}
