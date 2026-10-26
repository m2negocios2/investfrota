/* Main App Component - Handles routing (using react-router-dom), auth provider and all routes */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from './components/Layout'

// Pages
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import MotosList from './pages/MotosList'
import MotoForm from './pages/MotoForm'
import MotoDetails from './pages/MotoDetails'
import Rentals from './pages/Rentals'
import CashFlow from './pages/CashFlow'
import BillsToPay from './pages/BillsToPay'
import ExpenseCategories from './pages/ExpenseCategories'
import Reports from './pages/Reports'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-senha" element={<ForgotPassword />} />
          <Route path="/verificar-email" element={<VerifyEmail />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/motos" element={<MotosList />} />
            <Route path="/motos/nova" element={<MotoForm />} />
            <Route path="/motos/:id" element={<MotoDetails />} />
            <Route path="/motos/:id/editar" element={<MotoForm />} />
            <Route path="/alugueis" element={<Rentals />} />
            <Route path="/caixa" element={<CashFlow />} />
            <Route path="/contas-a-pagar" element={<BillsToPay />} />
            <Route path="/categorias-gastos" element={<ExpenseCategories />} />
            <Route path="/relatorios" element={<Reports />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
