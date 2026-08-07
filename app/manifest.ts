import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aurora Memory Vault",
    short_name: "Aurora Vault",
    description: "Preserve every life moment, image, and reflection with client-side privacy and liquid glass elegance.",
    start_url: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#38BDF8",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/memory-vault.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
