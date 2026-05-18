import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone"
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`. Skipped during
// Docker/standalone builds and silently ignored when the optional
// @opennextjs/cloudflare package isn't installed (e.g. a slim runtime image).
if (process.env.NODE_ENV === "development" && !process.env.DOCKER_BUILD) {
  import("@opennextjs/cloudflare")
    .then(({ initOpenNextCloudflareForDev }) => {
      initOpenNextCloudflareForDev();
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("@opennextjs/cloudflare")) return;
      console.warn("Cloudflare dev init failed:", error);
    });
}
