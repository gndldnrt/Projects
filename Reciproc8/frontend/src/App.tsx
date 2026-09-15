import { useState } from 'react';
import { Dashboard } from './Dashboard';
import { OnboardingForm } from './OnboardingForm';

export function App() {
  const [onboarded, setOnboarded] = useState(false);
  return onboarded ? <Dashboard /> : <OnboardingForm onComplete={() => setOnboarded(true)} />;
}
