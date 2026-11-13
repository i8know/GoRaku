import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import PageTransition from './components/PageTransition'
import ToastContainer from './components/ToastContainer'
import LandingPage from './pages/Landing'
import './aizome.css'
import './index.css'
import './pages.css'
import './decks.css'
import { useToastStore } from './store/useToastStore'

const ProtectedLayout = lazy(() => import('./components/Layout'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const App = lazy(() => import('./App'))
const DecksPage = lazy(() => import('./pages/Decks'))
const DeckDetailPage = lazy(() => import('./pages/DeckDetail'))
const ReviewPage = lazy(() => import('./pages/Review'))
const MiningPage = lazy(() => import('./pages/Mining'))
const LibraryPage = lazy(() => import('./pages/Library'))
const ReaderPage = lazy(() => import('./pages/Reader'))
const MangaReaderPage = lazy(() => import('./pages/MangaReader'))
const ProgressPage = lazy(() => import('./pages/Progress'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const ExamPage = lazy(() => import('./pages/Exam'))
const LicenseAttributionPage = lazy(() => import('./pages/LicenseAttribution'))

function RouteFallback() {
  return (
    <div
      className="app-shell grid place-items-center min-h-dvh px-4 text-sm text-[var(--tinta-2)]"
      role="status"
      aria-live="polite"
    >
      Memuat halaman…
    </div>
  );
}

function AppRoutes() {
  const notify = useToastStore((s) => s.notify);
  const location = useLocation();
  const topGroupKey =
    location.pathname === '/' || location.pathname === '/login'
      ? location.pathname
      : 'protected-app';

  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<RouteFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={topGroupKey}>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PageTransition routeKey="/">
              <LandingPage />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition routeKey="/login">
              <LoginPage />
            </PageTransition>
          }
        />

        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/beranda" element={<App />} />
          <Route path="/deck" element={<DecksPage onCreate={() => {}} notify={notify} />} />
          <Route path="/deck/:deckId" element={<DeckDetailPage notify={notify} />} />
          <Route path="/deck/:deckId/review" element={<ReviewPage />} />
          <Route path="/mining" element={<MiningPage notify={notify} />} />
          <Route path="/library" element={<LibraryPage onAdd={() => {}} notify={notify} />} />
          <Route path="/library/:bookId" element={<ReaderPage notify={notify} />} />
          <Route path="/manga/:bookId" element={<MangaReaderPage notify={notify} />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/exam" element={<ExamPage notify={notify} />} />
          <Route path="/license" element={<LicenseAttributionPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage notify={notify} />} />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            <PageTransition routeKey="/">
              <LandingPage />
            </PageTransition>
          }
        />
      </Routes>
        </AnimatePresence>
      </Suspense>
    </MotionConfig>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
      <ToastContainer />
    </BrowserRouter>
  </React.StrictMode>,
)
