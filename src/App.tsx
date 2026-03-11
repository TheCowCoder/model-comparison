/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import HomeView from './views/HomeView';
import ComparisonView from './views/ComparisonView';
import AdminView from './views/AdminView';
import LeaderboardView from './views/LeaderboardView';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/compare" element={<ComparisonView />} />
            <Route
              path="/admin"
              element={(
                <ProtectedRoute>
                  <AdminView />
                </ProtectedRoute>
              )}
            />
            <Route path="/leaderboards" element={<LeaderboardView />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
