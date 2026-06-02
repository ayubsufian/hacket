import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/Dashboard'
import EventsPage from './pages/EventsPage'
import EventDetailsPage from './pages/EventDetailsPage'
import TeamsPage from './pages/TeamsPage'
import SubmissionsPage from './pages/SubmissionsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import JudgeDashboard from './pages/JudgeDashboard'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import OrganizerDashboard from './pages/OrganizerDashboard'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppShell>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/staff/accept-invitation" element={<AcceptInvitationPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />

              {/* Auth-protected */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
              <Route path="/submissions" element={<ProtectedRoute><SubmissionsPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Role-restricted */}
              <Route path="/judge" element={<ProtectedRoute roles={['JUDGE', 'MENTOR', 'ADMIN']}><JudgeDashboard /></ProtectedRoute>} />
              <Route path="/organizer" element={<ProtectedRoute roles={['ORGANIZER', 'ADMIN']}><OrganizerDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPage /></ProtectedRoute>} />
            </Routes>
          </AppShell>
        </AuthProvider>
      </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
