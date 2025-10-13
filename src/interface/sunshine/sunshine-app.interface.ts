import { ISunshinePrepCommand } from "./sunshine-prep-command.interface";

export interface ISunshineApp {
	name?: string;
	output?: string;
	cmd?: string;
	index?: number;
	"exclude-global-prep-cmd"?: boolean;
	elevated?: boolean;
	"auto-detatch"?: boolean;
	"wait-all"?: boolean;
	"exit-timeout"?: number;
	"prep-cmd"?: ISunshinePrepCommand[];
	detatched?: string[];
	"image-path"?: string;
}
