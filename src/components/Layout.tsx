import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import logoInvestFrota from '@/assets/imagemgerada1793657108051-copia-2e567.png'
import {
  Bike,
  LayoutDashboard,
  KeyRound,
  Wallet,
  Menu,
  X,
  LogOut,
  Bell,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  CalendarDays,
  Shield,
  ListTodo,
  Zap,
  CalendarRange,
  CreditCard,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { infracoesService } from '@/services/infracoes'
import { Infracao } from '@/types/database'

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth()

  // Higieniza nome de exibição no topo caso o usuário venha com "Proprietário M2" ou role residual
  const rawDisplayName = user?.name || user?.email || 'INVEST FROTA'
  const displayUserName =
    rawDisplayName.toLowerCase().includes('proprietário') ||
    rawDisplayName.toLowerCase().includes('proprietario')
      ? 'INVEST FROTA'
      : rawDisplayName
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingInfracoes, setPendingInfracoes] = useState<Infracao[]>([])

  useEffect(() => {
    if (isAuthenticated) {
      infracoesService
        .getPendentes()
        .then((infs) => {
          setPendingInfracoes(infs)
        })
        .catch(console.error)
    }
  }, [isAuthenticated, location.pathname])

  const navigation = [
    {
      name: 'CADASTROS',
      href: '/cadastros',
      icon: Building2,
    },
    { name: 'PAINEL GERAL', href: '/', icon: LayoutDashboard },
    { name: 'MOTOS', href: '/motos', icon: Bike },
    { name: 'ALUGUÉIS & CONTRATOS', href: '/alugueis', icon: KeyRound },
    { name: 'LANÇAMENTO ENTRADAS', href: '/lancamento-aluguel', icon: Zap },
    { name: 'LANÇAMENTO SAÍDAS', href: '/lancamentos-rapidos', icon: Zap },
    { name: 'FLUXO DE CAIXA', href: '/caixa', icon: Wallet },
    { name: 'MÊS', href: '/mes', icon: CalendarRange },
    { name: 'SEMANA', href: '/semana', icon: CalendarDays },
    { name: 'CONTAS A PAGAR / RECEBER', href: '/contas-a-pagar', icon: CreditCard },
    { name: 'CAUÇÕES', href: '/caucoes', icon: Shield },
    {
      name: 'INFRAÇÕES',
      href: '/infracoes',
      icon: AlertTriangle,
      badge: pendingInfracoes.length > 0 ? pendingInfracoes.length : undefined,
    },
    { name: 'LEMBRETES', href: '/pendencias', icon: ListTodo },
    { name: 'RELATÓRIOS', href: '/relatorios', icon: TrendingUp },
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
        <div className="py-4 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="h-16 w-16 rounded-xl bg-[#F2EFE9] p-1.5 shadow-sm border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src={logoInvestFrota}
              alt="INVEST FROTA"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-base tracking-wider text-slate-900 dark:text-white block leading-tight truncate">
              INVEST FROTA
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 mx-3 my-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0">
              {displayUserName ? displayUserName.slice(0, 2).toUpperCase() : 'IF'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {displayUserName}
              </p>
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
        {/* Top Header Mobile / Tablet / Desktop */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          {/* Lado Esquerdo: Mobile (menu hamburguer + logo nova à esquerda) | Desktop: logo nova à esquerda */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-[#F2EFE9] p-1 md:p-1.5 shadow-sm border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={logoInvestFrota}
                  alt="INVEST FROTA"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white text-base md:text-lg tracking-wider block leading-tight">
                INVEST FROTA
              </span>
            </div>
          </div>

          {/* Centro: Vazio conforme pedido expresso ("no centro tirar") */}
          <div className="flex-1" aria-hidden="true" />

          {/* Canto Direito: Notificações + Nome do usuário + Logout (sem badge/papel PROPRIETÁRIO) */}
          <div className="flex items-center gap-3">
            <Link
              to="/infracoes"
              title="Infrações e multas"
              className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {pendingInfracoes.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </Link>

            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {displayUserName}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1">
            <div className="p-3 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">{displayUserName}</p>
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

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
