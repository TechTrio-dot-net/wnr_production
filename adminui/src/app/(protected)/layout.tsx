// Protected layout: remove server-side auth check because admin auth is Bearer-token
// based and stored in client localStorage. Client `AuthProvider` will validate
// the token and redirect to `/login` when missing.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
