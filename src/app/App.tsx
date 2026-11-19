import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './ThemeContext';
import { MockAppStateProvider } from './state/MockAppStateContext';
import { MissionStateProvider } from './state/MissionStateProvider';
import { AdminStateProvider } from './state/AdminStateProvider';
import { WatermarkOverlay } from './components/WatermarkOverlay';

function AppContent() {
  return (
    <>
      <div className="min-h-screen bg-background-primary text-text-primary font-sans antialiased selection:bg-accent-primary/30 w-full h-full relative">
        <RouterProvider router={router} />
      </div>
      <WatermarkOverlay />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MockAppStateProvider>
        <MissionStateProvider>
          <AdminStateProvider>
            <AppContent />
          </AdminStateProvider>
        </MissionStateProvider>
      </MockAppStateProvider>
    </ThemeProvider>
  );
}
