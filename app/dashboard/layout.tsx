import { DashboardNav } from './nav';

/**
 * Wraps every /dashboard/* route with the shared navigation. Kept a server
 * component; only the nav itself is client (it needs the active pathname).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <DashboardNav />
      {children}
    </div>
  );
}
