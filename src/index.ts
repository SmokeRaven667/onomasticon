import { registerApi } from "./module/api.js";
import { registerInitHook } from "./module/init.js";
import { registerLaunchPoint } from "./module/launchPoint.js";
import { registerSettings } from "./module/settings.js";

export const ONOMASTICON_VERSION = "0.0.1";

registerInitHook();
registerLaunchPoint();
registerApi();
registerSettings();
