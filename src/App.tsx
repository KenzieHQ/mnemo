import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, Spinner, Center } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Decks from './pages/Decks';
import DeckDetail from './pages/DeckDetail';
import Flashcards from './pages/Flashcards';
import Study from './pages/Study';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isConfigured } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  // If Supabase is not configured, allow access (offline mode)
  if (!isConfigured) {
    return <>{children}</>;
  }

  // If configured but not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Main app layout with sidebar
const AppLayout: React.FC = () => {
  return (
    <Flex minH="100vh">
      <Sidebar />
      <Box flex="1" ml={{ base: 0, md: '240px' }} p={{ base: 4, md: 8 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/decks/:deckId" element={<DeckDetail />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/study/:deckId" element={<Study />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Flex>
  );
};

// Auth-aware app router
const AppRouter: React.FC = () => {
  const { user, isConfigured } = useAuth();

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          user && isConfigured ? <Navigate to="/dashboard" replace /> : <AuthPage />
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
