import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Percent,
  Bike,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { caixaService } from '@/services/caixa'
import { pagamentosService } from '@/services/pagamentos'
import { Moto, Contrato, CaixaLancamento, Pagamento } from '@/types/database'

export default function Reports() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [caixa, setCaixa] = useState<CaixaLancamento[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [m, c, cx, p] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        caixaService.getAll(),
        pagamentosService.getAll(),
      ])
      setMotos(m)
      setContratos(c)
      setCaixa(cx)
      setPagamentos(p)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Projeções Financeiras:
  // Receita Bruta Projetada no Mês = soma de diária * 30 de todos os contratos ativos
  const activeContracts = contratos.filter((c) => c.status === 'ativo')
  const receitaBrutaProjetada = activeContracts.reduce((acc, c) => acc + c.valor_diario * 30, 0)

  // Despesas Previstas no Mês = soma de contas a pagar pendentes e aprovadas
  const despesasPrevistas = pagamentos
    .filter((p) => p.status === 'pendente' || p.status === 'aprovado')
    .reduce((acc, p) => acc + p.valor, 0)

  // Lucro Líquido Projetado
  const lucroLiquidoProjetado = receitaBrutaProjetada - despesasPrevistas
  const margemProjetada =
    receitaBrutaProjetada > 0
      ? Math.round((lucroLiquidoProjetado / receitaBrutaProjetada) * 100)
      : 0

  // Dados realizados de Caixa
  const receitasRealizadas = caixa
    .filter((c) => c.tipo === 'entrada')
    .reduce((acc, c) => acc + c.valor, 0)
  const despesasRealizadas = caixa
    .filter((c) => c.tipo === 'saida')
    .reduce((acc, c) => acc + c.valor, 0)
  const lucroRealizado = receitasRealizadas - despesasRealizadas

  // Rentabilidade por Moto
  const motoPerformance = motos.map((moto) => {
    const motoCaixa = caixa.filter((c) => c.moto === moto.id)
    const entradas = motoCaixa
      .filter((c) => c.tipo === 'entrada')
      .reduce((acc, c) => acc + c.valor, 0)
    const saidas = motoCaixa.filter((c) => c.tipo === 'saida').reduce((acc, c) => acc + c.valor, 0)
    const saldo = entradas - saidas
    return {
      id: moto.id,
      modelo: moto.modelo,
      placa: moto.placa,
      status: moto.status,
      entradas,
      saidas,
      saldo,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Projeções & Relatórios Contábeis
          </h1>
          <p className="text-sm text-muted-foreground">
            Indicadores de receita bruta, custos previstos, lucro líquido e desempenho por moto.
          </p>
        </div>
      </div>

      {/* Projections Highlight Card */}
      <Card className="shadow-sm border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Projeção Financeira Mensal Estimada</CardTitle>
          </div>
          <CardDescription>
            Calculada a partir dos contratos ativos atuais (base 30 dias) e contas a pagar em aberto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <span className="text-xs text-muted-foreground block font-medium">
                Receita Bruta Projetada
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white block mt-1">
                R$ {receitaBrutaProjetada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                {activeContracts.length} contratos ativos gerando diárias
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <span className="text-xs text-muted-foreground block font-medium">
                Valores a Pagar / Custos
              </span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400 block mt-1">
                R$ {despesasPrevistas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Manutenções, rastreadores e taxas
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <span className="text-xs text-muted-foreground block font-medium">
                Lucro Líquido Projetado
              </span>
              <span
                className={`text-2xl font-bold block mt-1 ${lucroLiquidoProjetado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                R$ {lucroLiquidoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Estimativa após custos previstos
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <span className="text-xs text-muted-foreground block font-medium">
                Margem Líquida
              </span>
              <span className="text-2xl font-bold text-blue-600 block mt-1">
                {margemProjetada}%
              </span>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Eficiência operacional estimada
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Realized vs Projected Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Realizado de Caixa */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-base font-bold">Histórico Contábil Realizado</CardTitle>
            </div>
            <CardDescription>
              Valores efetivamente consolidados no fluxo de caixa da frota
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Total de Recebimentos Realizados</span>
                </div>
                <span className="font-bold text-emerald-600">
                  R$ {receitasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/40 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">Total de Despesas Pagas</span>
                </div>
                <span className="font-bold text-red-600">
                  R$ {despesasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Resultado Líquido em Caixa</span>
                </div>
                <span
                  className={`font-bold text-base ${lucroRealizado >= 0 ? 'text-blue-600' : 'text-red-600'}`}
                >
                  R$ {lucroRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição da Frota */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base font-bold">Visão de Ocupação da Frota</CardTitle>
            </div>
            <CardDescription>Acompanhamento de alocação de ativos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Motos Alugadas ({motos.filter((m) => m.status === 'locada').length})</span>
                  <span>
                    {motos.length > 0
                      ? Math.round(
                          (motos.filter((m) => m.status === 'locada').length / motos.length) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{
                      width: `${motos.length > 0 ? (motos.filter((m) => m.status === 'locada').length / motos.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>
                    Motos Disponíveis ({motos.filter((m) => m.status === 'disponivel').length})
                  </span>
                  <span>
                    {motos.length > 0
                      ? Math.round(
                          (motos.filter((m) => m.status === 'disponivel').length / motos.length) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width: `${motos.length > 0 ? (motos.filter((m) => m.status === 'disponivel').length / motos.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>
                    Em Oficina / Manutenção ({motos.filter((m) => m.status === 'manutencao').length}
                    )
                  </span>
                  <span>
                    {motos.length > 0
                      ? Math.round(
                          (motos.filter((m) => m.status === 'manutencao').length / motos.length) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{
                      width: `${motos.length > 0 ? (motos.filter((m) => m.status === 'manutencao').length / motos.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Rentabilidade por Moto */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Demonstrativo de Rentabilidade por Moto
          </CardTitle>
          <CardDescription>
            Receitas, custos e resultado líquido apurado individualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 text-muted-foreground border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Moto / Placa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Entradas (Aluguéis)</th>
                  <th className="py-3 px-4 text-right">Saídas (Manutenções)</th>
                  <th className="py-3 px-4 text-right">Saldo Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {motoPerformance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.modelo}
                      <span className="block font-mono text-xs text-muted-foreground">
                        {item.placa}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">
                      R$ {item.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-600">
                      R$ {item.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={item.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        R$ {item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
