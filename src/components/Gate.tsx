import { Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import SignIn from '../pages/SignIn';
import Onboarding from '../pages/Onboarding';

// Wraps screens that need an account: sign in first, then finish the profile once.
export function Gate() {
  const { session, profile, loading, profileError, refreshProfile } = useAuth();
  if (loading) return <main className="page"><p className="muted">Loading your account...</p></main>;
  if (!session) return <SignIn />;
  if (profileError) {
    return (
      <main className="page">
        <h1 className="display-md">We could not load your profile</h1>
        <p className="form-error" role="alert">{profileError}</p>
        <button type="button" className="btn btn-accent" onClick={() => refreshProfile()}>Try again</button>
      </main>
    );
  }
  if (!profile) return <main className="page"><p className="muted">Loading your profile...</p></main>;
  if (!profile.onboarded) return <Onboarding />;
  return <Outlet />;
}
