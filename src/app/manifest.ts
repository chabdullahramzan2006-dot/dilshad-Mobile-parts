import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dilshad Mobile Parts",
    short_name: "Dilshad Parts",
    description: "Shop management and digital khata system for Dilshad Mobile Parts.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0284c7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
