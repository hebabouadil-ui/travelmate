import { SiteNav } from "@/components/SiteNav";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata = { title: "Your dashboard" };

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen">
      <SiteNav />
      <Dashboard />
    </main>
  );
}
