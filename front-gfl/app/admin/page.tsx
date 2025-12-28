import { auth } from "auth";
import type { SteamSession } from "auth";
import AdminDashboard from "./AdminDashboard";
import Footer from "components/ui/Footer.tsx";
import ResponsiveAppBar from "components/ui/ResponsiveAppBar.tsx";
import getServerUser from "../getServerUser.ts";

export default async function AdminPage() {
  const session = (await auth()) as SteamSession | null;
  if (!session?.user?.steam?.is_superuser) {
    return <div>Unauthorized</div>;
  }
  const user = getServerUser();

  return <>
       <ResponsiveAppBar userPromise={user} server={null} setDisplayCommunity={null} />
       <div className="min-h-screen py-4">
         <div className="container max-w-7xl mx-auto px-4">
           <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
           <AdminDashboard />
         </div>
       </div>
       <Footer />
     </>
}
