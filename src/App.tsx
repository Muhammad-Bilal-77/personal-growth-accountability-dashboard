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

const queryClient = new QueryClient();

const App = () => (
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

export default App;
