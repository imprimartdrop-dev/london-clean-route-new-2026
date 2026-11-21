import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "../components/admin/AdminDashboard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "GOODSPOTLESS | Gestão interna" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "GOODSPOTLESS" },
      { name: "theme-color", content: "#142f27" },
    ],
    links: [
      { rel: "manifest", href: "/goodspotless-admin.webmanifest" },
      { rel: "apple-touch-icon", href: "/goodspotless-icon-180.png", sizes: "180x180" },
      { rel: "icon", href: "/goodspotless-icon-192.png", type: "image/png" },
    ],
  }),
  component: AdminDashboard,
});
