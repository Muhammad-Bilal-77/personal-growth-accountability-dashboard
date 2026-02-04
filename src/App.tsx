import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PrayerTracker from "./pages/PrayerTracker";
import DailyObjectives from "./pages/DailyObjectives";
import AcademicRepository from "./pages/AcademicRepository";
import ProgressAnalytics from "./pages/ProgressAnalytics";
import EventCalendar from "./pages/EventCalendar";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { clearToken, isLoggedIn } from "@/lib/auth";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const queryClient = new QueryClient();

const App = () => {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      if (!isLoggedIn()) {
        setChecking(false);
        setAuthed(false);
        return;
      }

      try {
        await api.get("/api/auth/me");
        setAuthed(true);
      } catch (error) {
        clearToken();
        setAuthed(false);
      } finally {
        setChecking(false);
      }
    };

    verify();
  }, []);

  if (checking) {
    return null;
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/prayer" element={<PrayerTracker />} />
          <Route path="/objectives" element={<DailyObjectives />} />
          <Route path="/academic" element={<AcademicRepository />} />
          <Route path="/analytics" element={<ProgressAnalytics />} />
          <Route path="/calendar" element={<EventCalendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
