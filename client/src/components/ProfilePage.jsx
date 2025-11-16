import { Layout } from './Layout'

export function ProfilePage({ isAuthenticated, user, favoritesCount, onLogout }) {
  return (
    <Layout isAuthenticated={isAuthenticated} user={user} favoritesCount={favoritesCount} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl mb-4">My Profile</h1>
        <p className="text-gray-600">Profile details coming soon</p>
      </div>
    </Layout>
  );
}
