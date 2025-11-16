import { Header } from './Header'

export function Layout({ isAuthenticated, user, favoritesCount = 0, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        isAuthenticated={isAuthenticated}
        user={user}
        favoritesCount={favoritesCount}
        onLogout={onLogout}
      />
      <main className="min-h-[calc(100vh-80px)]">{children}</main>
    </div>
  )
}
