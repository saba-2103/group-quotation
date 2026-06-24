import type { NextConfig } from "next";
import path from "path";

const TWP = path.resolve(__dirname, "node_modules/tailwindcss");

const nextConfig: NextConfig = {
	typescript: { ignoreBuildErrors: true },
	output: "standalone",
	// Workaround: spaces in the project folder path cause enhanced-resolve to
	// skip the project's node_modules when resolving "tailwindcss" during CSS
	// compilation. Aliasing to the absolute path fixes both webpack and Turbopack.
	webpack: (config) => {
		config.resolve.alias = {
			...config.resolve.alias,
			tailwindcss: TWP,
		};
		return config;
	},
	turbopack: {
		resolveAlias: {
			tailwindcss: TWP,
		},
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev` — skipped during
// Docker/standalone builds and when the optional Cloudflare package isn't
// installed (e.g., a slim runtime image).
if (process.env.NODE_ENV === "development" && !process.env.DOCKER_BUILD) {
	import("@opennextjs/cloudflare")
		.then(({ initOpenNextCloudflareForDev }) => {
			initOpenNextCloudflareForDev();
		})
		.catch((error: unknown) => {
			const errorCode =
				typeof error === "object" && error && "code" in error
					? String((error as { code?: unknown }).code)
					: "";
			const errorMessage =
				error instanceof Error ? error.message : String(error ?? "");
			const isMissingCloudflareModule =
				(errorCode === "MODULE_NOT_FOUND" ||
					errorCode === "ERR_MODULE_NOT_FOUND") &&
				errorMessage.includes("@opennextjs/cloudflare");
			if (isMissingCloudflareModule) {
				console.warn(
					"Cloudflare dev init skipped: optional @opennextjs/cloudflare not installed.",
				);
				return;
			}
			console.warn("Cloudflare dev init failed:", error);
		});
}
