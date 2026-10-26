import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Bike, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as any)?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      toast.success('Bem-vindo(a) ao sistema!')
      navigate(from, { replace: true })
    } catch (err: any) {
      console.error(err)
      setError(
        err?.message?.includes('Failed to authenticate')
          ? 'E-mail ou senha incorretos. Verifique suas credenciais.'
          : 'Não foi possível entrar no sistema. Tente novamente.',
      )
      toast.error('Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill demo accounts for fast access
  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail)
    setPassword('Skip@Pass')
    setLoading(true)
    setError(null)
    try {
      await login(userEmail, 'Skip@Pass')
      toast.success('Acesso rápido realizado!')
      navigate(from, { replace: true })
    } catch (err: any) {
      setError('Erro no login rápido. Tente com e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2 shadow-sm">
            <Bike className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            MotoLoc Gestão
          </h1>
          <p className="text-sm text-muted-foreground">
            Acesso para Proprietários e Administradores
          </p>
        </div>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Entrar na sua conta</CardTitle>
            <CardDescription>
              Informe seu e-mail e senha para gerenciar aluguéis e caixa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/recuperar-senha" className="text-xs text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar no Sistema'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                Acessos Rápidos (Demonstração)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('m2.negocios2@gmail.com')}
                  className="text-xs h-auto py-2 flex flex-col items-start text-left border-blue-200 dark:border-blue-900 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                >
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Proprietário
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate w-full">
                    m2.negocios2@gmail.com
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('admin@motos.com')}
                  className="text-xs h-auto py-2 flex flex-col items-start text-left border-amber-200 dark:border-amber-900 hover:bg-amber-50/50 dark:hover:bg-amber-950/30"
                >
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Administrador
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate w-full">
                    admin@motos.com
                  </span>
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-center text-xs text-muted-foreground border-t pt-4">
            <Link
              to="/verificar-email"
              className="hover:underline text-slate-600 dark:text-slate-400"
            >
              Precisa reenviar a verificação de e-mail?
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
