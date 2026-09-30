import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { CommissionPage } from '@/pages/CommissionPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DriverDetailPage } from '@/pages/DriverDetailPage';
import { DriversRegistryPage } from '@/pages/DriversRegistryPage';
import { FuelPricePage } from '@/pages/FuelPricePage';
import { LoginPage } from '@/pages/LoginPage';
import { PendingQueuePage } from '@/pages/PendingQueuePage';
import { TransitOperatorsPage } from '@/pages/TransitOperatorsPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { TripsPage } from '@/pages/TripsPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/pending" element={<PendingQueuePage />} />
        <Route path="/drivers" element={<DriversRegistryPage />} />
        <Route path="/drivers/:id" element={<DriverDetailPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/transit-operators" element={<TransitOperatorsPage />} />
        <Route path="/commission" element={<CommissionPage />} />
        <Route path="/fuel-price" element={<FuelPricePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
