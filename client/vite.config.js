import { defineConfig, loadEnv } from "vite";
import process from "process";

export default ({ mode }) => {
	// Load app-level env vars to node-level env vars.
	process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

	return defineConfig({
		server: {
			host: "0.0.0.0",
			port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5173,
		},
	});
};
