import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  Bike,
  LayoutDashboard,
  KeyRound,
  Wallet,
  Receipt,
  FileText,
  Menu,
  X,
  LogOut,
  Bell,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Tags,
  Smartphone,
  CalendarDays,
  Shield,
  ListTodo,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { pagamentosService } from '@/services/pagamentos'
import { infracoesService } from '@/services/infracoes'
import { Pagamento, Infracao } from '@/types/database'

export default function Layout() {
  const { user, role, isProprietario, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingBills, setPendingBills] = useState<Pagamento[]>([])
  const [pendingInfracoes, setPendingInfracoes] = useState<Infracao[]>([])
  const [showMondayBanner, setShowMondayBanner] = useState(false)

  // Check if today is Monday (1) or if user wants to see bills
  useEffect(() => {
    const today = new Date()
    const isMonday = today.getDay() === 1
    setShowMondayBanner(isMonday)

    if (isAuthenticated) {
      pagamentosService
        .getPendentes()
        .then((bills) => {
          setPendingBills(bills)
        })
        .catch(console.error)

      infracoesService
        .getPendentes()
        .then((infs) => {
          setPendingInfracoes(infs)
        })
        .catch(console.error)
    }
  }, [isAuthenticated, location.pathname])

  const navigation = [
    { name: 'PAINEL GERAL', href: '/', icon: LayoutDashboard },
    {
      name: 'INFRAÇÕES',
      href: '/infracoes',
      icon: AlertTriangle,
      badge: pendingInfracoes.length > 0 ? pendingInfracoes.length : undefined,
    },
    { name: 'ATRASOS', href: '/atrasos', icon: AlertTriangle },
    { name: 'PENDÊNCIAS', href: '/pendencias', icon: ListTodo },
    { name: 'SEMANA', href: '/semana', icon: CalendarDays },
    { name: 'CAUÇÕES', href: '/caucoes', icon: Shield },
    { name: 'MOTOS', href: '/motos', icon: Bike },
    { name: 'ALUGUÉIS & CONTRATOS', href: '/alugueis', icon: KeyRound },
    { name: 'FLUXO DE CAIXA', href: '/caixa', icon: Wallet },
    {
      name: 'AVISOS DE CUSTOS',
      href: '/contas-a-pagar',
      icon: Receipt,
      badge: pendingBills.length > 0 ? pendingBills.length : undefined,
    },
    {
      name: 'CATEGORIAS DE GASTOS',
      href: '/categorias-gastos',
      icon: Tags,
    },
    { name: 'PROJEÇÕES & RELATÓRIOS', href: '/relatorios', icon: TrendingUp },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // If user is not authenticated and not on an auth route, let the page handle or redirect
  const isAuthRoute = ['/login', '/recuperar-senha', '/verificar-email'].includes(location.pathname)

  if (isAuthRoute) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
              M2 Gestão de Motos
            </span>
            <span className="text-xs text-muted-foreground">Controle de Frotas</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.name || user?.email || 'Visitante'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {isProprietario ? (
                  <Badge
                    variant="default"
                    className="text-[10px] px-1.5 py-0 bg-blue-600 hover:bg-blue-600"
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Proprietário
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  >
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    Administrador
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-primary' : 'bg-red-500 text-white animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Guia Como Instalar no Celular */}
        <div className="mx-3 mb-2 p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-100">
            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Instalar no Celular</span>
          </div>
          <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 leading-snug">
            Abra no Chrome ou Safari e toque em <strong>"Adicionar à Tela de Início"</strong> para
            usar como app!
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </Button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Mobile / Tablet */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-600 text-white rounded-lg">
                <Bike className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white text-base">
                M2 Gestão de Motos
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Sistema de Gestão & Locações
            </h1>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            <Link
              to="/contas-a-pagar"
              className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {pendingBills.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </Link>

            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
              <div className="text-right">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  {user?.name || user?.email}
                </p>
                <p className="text-[11px] text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1">
            <div className="p-3 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">{user?.name || user?.email}</p>
                <span className="text-[10px] text-muted-foreground uppercase">{role}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLogout}
                className="text-red-500 text-xs"
              >
                Sair
              </Button>
            </div>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        {/* Monday / Pending Bills Notification Bar */}
        {(showMondayBanner || pendingBills.length > 0) && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Avisos de Custos & Pendências:</strong> Existem{' '}
                <span className="font-bold text-amber-800 dark:text-amber-100">
                  {pendingBills.length} pendência(s)
                </span>{' '}
                {isProprietario
                  ? 'aguardando quitação no caixa pela proprietária.'
                  : 'registradas no sistema.'}
              </span>
            </div>
            <Link
              to="/contas-a-pagar"
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 shrink-0"
            >
              Ver Avisos & Pagar no Caixa &rarr;
            </Link>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
