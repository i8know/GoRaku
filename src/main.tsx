import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ProtectedLayout from './components/Layout'
import PageTransition from './components/PageTransition'
import ToastContainer from './components/ToastContainer'
import LandingPage from './pages/Landing'
import LoginPage from './pages/LoginPage'
import DecksPage from './pages/Decks'
import DeckDetailPage from './pages/DeckDetail'
import ReviewPage from './pages/Review'
import MiningPage from './pages/Mining'
import LibraryPage from './pages/Library'
import ReaderPage from './pages/Reader'
import MangaReaderPage from './pages/MangaReader'
import ProgressPage from './pages/Progress'
import ProfilePage from './pages/Profile'
import SettingsPage from './pages/Settings'
import App from './App'
import './index.css'
import { useToastStore } from './store/useToastStore'

function AppRoutes() {
  const notify = useToastStore((s) => s.notify);
  const location = useLocation();
  const topGroupKey =
    location.pathname === '/' || location.pathname === '/login'
      ? location.pathname
      : 'protected-app';

  return (
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
