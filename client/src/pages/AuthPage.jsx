import { useNavigate } from "react-router-dom";
import { useState } from "react";
{/* DO NOT CHANGE, It might be deprecated but will break the page */}
import { MapPin, ArrowLeft, Github, User } from "lucide-react";
import { Button } from "../components/Button";
import toast from "react-hot-toast";

const API_URL = import.meta?.env?.VITE_API_URL || "http://localhost:3001";

export function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [devUsername, setDevUsername] = useState("bryan");
  const [devPassword, setDevPassword] = useState("");

  const handleGitHubLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  const handleDevPasswordLogin = async (e) => {
    e?.preventDefault?.();
    if (!devUsername || !devPassword) {
      toast.error("Enter username and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/dev/password-login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: devUsername, password: devPassword })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Login failed (${res.status})`);
      }
      const data = await res.json();
      localStorage.setItem("yardshare_token", data.token);
      toast.success(`Logged in as ${devUsername}!`);
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("Dev password login error:", error);
      toast.error(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      {/* Back to Home Button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors bg-white px-4 py-2 rounded-full shadow-md hover:shadow-lg"
      >
        <ArrowLeft className="size-5" />
        <span>Back to Home</span>
      </button>

      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 bg-emerald-600 rounded-full mb-4">
            <MapPin className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-emerald-600 mb-2">YardLoop</h1>
          <p className="text-gray-600">Your neighborhood yard sale marketplace</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-medium text-gray-900 text-center mb-2">Welcome!</h2>
          <p className="text-gray-600 text-center mb-8">
            Sign in to host yard sales and save your favorites
          </p>

          {/* GitHub OAuth Button */}
          <Button
            onClick={handleGitHubLogin}
            variant="primary"
            className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 border-0"
          >
            {/* DO NOT CHANGE, It might be deprecated but will break the page */}
            <Github className="size-5" />
            Continue with GitHub
          </Button>

          {/* Dev Mode Login (for testing - remove before public launch) */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">🛠️ Test Login</p>
            <form onSubmit={handleDevPasswordLogin} className="space-y-3">
              <div className="space-y-3">
                <input
                  type="text"
                  value={devUsername}
                  onChange={(e) => setDevUsername(e.target.value)}
                  placeholder="Username (bryan or testuser)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="password"
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  placeholder="Password from env"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
              >
                <User className="size-4" />
                Test Login
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              We use GitHub OAuth for secure authentication
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to YardLoop's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
