import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import logoInvestFrota from '@/assets/imagemgerada1793657108051-6f85f.png'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react'
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

export default function VerifyEmail() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { requestVerification } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await requestVerification(email)
      setSent(true)
      toast.success('E-mail de verificação reenviado!')
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível reenviar a verificação. Verifique o e-mail informado.')
      toast.error('Erro ao enviar verificação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-2 bg-[#F2EFE9] rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-700/60 mb-2">
            <img
              src={logoInvestFrota}
              alt="INVEST FROTA"
              className="w-20 h-20 object-contain rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Verificação de Conta
          </h1>
          <p className="text-sm text-muted-foreground">
            Confirme seu endereço de e-mail para acesso total à INVEST FROTA
          </p>
        </div>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Reenviar Verificação</CardTitle>
            <CardDescription>
              Não recebeu a mensagem de ativação? Digite seu e-mail para enviarmos uma nova chave de
              validação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-4 space-y-3">
                <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Link de validação enviado!
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Enviamos as instruções para <strong>{email}</strong>. Abra sua caixa de entrada e
                  clique no link para validar.
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                    Enviar para outro e-mail
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail da sua conta</Label>
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

                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <Send className="w-4 h-4" />
                  {loading ? 'Reenviando...' : 'Reenviar E-mail de Verificação'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para o login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
