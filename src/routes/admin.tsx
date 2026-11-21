import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "../components/admin/AdminDashboard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "GOODSPOTLESS | Gestão interna" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: AdminDashboard,
});
