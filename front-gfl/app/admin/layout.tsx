import type { ReactNode } from 'react';
import { auth } from 'auth';
import type { SteamSession } from 'auth';
import Footer from 'components/ui/Footer';
import ResponsiveAppBar from 'components/ui/ResponsiveAppBar';
import getServerUser from '../getServerUser';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = (await auth()) as SteamSession | null;

  if (!session?.user?.steam?.is_superuser) {
    return <div>Unauthorized</div>;
  }

  const user = getServerUser();

  return (
    <>
      <ResponsiveAppBar userPromise={user} server={null} setDisplayCommunity={null} />
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
