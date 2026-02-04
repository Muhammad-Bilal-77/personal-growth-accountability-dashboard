import { useState } from "react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post<{ token: string }>("/api/auth/login", { username, password });
      if (response.token) {
        setToken(response.token);
        onSuccess();
      }
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="card-static p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-foreground mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your username and password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Username</label>
            <input
              className="w-full input-minimal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Password</label>
            <input
              type="password"
              className="w-full input-minimal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary w-full" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
