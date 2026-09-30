import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Gate } from './components/Gate';
import Home from './pages/Home';
import Explore from './pages/Explore';
import SiteDetail from './pages/SiteDetail';
import OpenDives from './pages/OpenDives';
import NewOpenDive from './pages/NewOpenDive';
import Logbook from './pages/Logbook';
import LogDive from './pages/LogDive';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import AddCertification from './pages/AddCertification';
import ReviewCertifications from './pages/admin/ReviewCertifications';
import Emergency from './pages/Emergency';
import { getState, setTheme } from './lib/store';
import { isConfigured } from './lib/supabase';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    setTheme(getState().theme);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  if (!isConfigured) {
    return (
      <main className="page">
        <h1 className="display-md">Setup needed</h1>
        <p className="muted">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the environment variables, then rebuild.</p>
      </main>
    );
  }
  return (
    <div className="app">
      <div className="glow" aria-hidden="true" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/site/:slug" element={<SiteDetail />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route element={<Gate />}>
          <Route path="/dives/new" element={<NewOpenDive />} />
          <Route path="/dives" element={<OpenDives />} />
          <Route path="/log/new" element={<LogDive />} />
          <Route path="/log" element={<Logbook />} />
          <Route path="/profile/edit" element={<Onboarding editing />} />
          <Route path="/profile/certification" element={<AddCertification />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/certifications" element={<ReviewCertifications />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
