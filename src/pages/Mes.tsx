import React, { useState, useEffect } from 'react'
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { caixaService } from '@/services/caixa'
import { motosService } from '@/services/motos'
import { empresaService } from '@/services/cadastros'
import { formatDateDisplay } from '@/lib/dateUtils'
import { CaixaLancamento, Moto, EntidadeTipo, EmpresaConfig } from '@/types/database'
import { ENTIDADES_CONFIG } from '@/pages/CashFlow'
import { toast } from 'sonner'

interface MonthGroup {
  key: string // "YYYY-MM"
  label: string // "MAIO 2025"
  year: number
  month: number
  recebimentos: CaixaLancamento[]
  despesas: CaixaLancamento[]
  totalRecebimentos: number
  totalDespesas: number
  saldoLiquido: number
  percentualMargem: number
}

const MONTH_NAMES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]

export default function Mes() {
  const [lancamentos, setLancamentos] = useState<CaixaLancamento[]>([])
  const [motosMap, setMotosMap] = useState<Record<string, Moto>>({})
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Controle de Mês/Ano selecionado para navegação
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1) // 1 a 12

  const loadData = async () => {
    setLoading(true)
    try {
      const [caixaData, motosData, empData] = await Promise.all([
        caixaService.getAll(),
        motosService.getAll().catch((err) => {
          console.warn('Erro ao carregar motos no relatório Mes:', err)
          return [] as Moto[]
        }),
        empresaService.get().catch(() => null),
      ])
      setLancamentos(caixaData)
      setEmpresaConfig(empData)
      const map: Record<string, Moto> = {}
      motosData.forEach((m) => {
        map[m.id] = m
      })
      setMotosMap(map)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados mensais')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Chave do mês selecionado "YYYY-MM"
  const selectedKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  // Calcular diretamente os dados do mês selecionado
  const currentMonthGroup = React.useMemo(() => {
    const monthName = MONTH_NAMES[selectedMonth - 1] || `MÊS ${selectedMonth}`
    const label = `${monthName} ${selectedYear}`

    const rawRecebimentos: CaixaLancamento[] = []
    const rawDespesas: CaixaLancamento[] = []

    lancamentos.forEach((item) => {
      // Data formato YYYY-MM-DD
      const datePart = (item.data || '').split('T')[0].split(' ')[0]
      const yearMonth = datePart ? datePart.slice(0, 7) : ''
      if (yearMonth !== selectedKey) return

      // Filtro de busca opcional (descrição, categoria ou nome da moto)
      if (search.trim()) {
        const query = search.toLowerCase()
        const desc = (item.descricao || '').toLowerCase()
        const cat = (item.categoria || '').toLowerCase()
        const motoObj = item.expand?.moto || (item.moto ? motosMap[item.moto] : null)
        const motoNome = (motoObj?.nome || motoObj?.modelo || '').toLowerCase()
        const entidadeNome = (item.entidade || '').toLowerCase()
        if (
          !desc.includes(query) &&
          !cat.includes(query) &&
          !motoNome.includes(query) &&
          !entidadeNome.includes(query)
        ) {
          return
        }
      }

      if (item.tipo === 'entrada') {
        rawRecebimentos.push(item)
      } else {
        rawDespesas.push(item)
      }
    })

    // Ordenar recebimentos e despesas por data decrescente
    const recebimentos = rawRecebimentos.sort((a, b) => {
      const dA = a.data ? a.data.slice(0, 10) : ''
      const dB = b.data ? b.data.slice(0, 10) : ''
      return dB.localeCompare(dA)
    })

    const despesas = rawDespesas.sort((a, b) => {
      const dA = a.data ? a.data.slice(0, 10) : ''
      const dB = b.data ? b.data.slice(0, 10) : ''
      return dB.localeCompare(dA)
    })

    const totalRecebimentos = recebimentos.reduce((sum, r) => sum + r.valor, 0)
    const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)
    const saldoLiquido = totalRecebimentos - totalDespesas

    let percentualMargem = 0
    if (totalRecebimentos > 0) {
      percentualMargem = Math.round((saldoLiquido / totalRecebimentos) * 100)
    }

    return {
      key: selectedKey,
      label,
      year: selectedYear,
      month: selectedMonth,
      recebimentos,
      despesas,
      totalRecebimentos,
      totalDespesas,
      saldoLiquido,
      percentualMargem,
    } as MonthGroup
  }, [lancamentos, motosMap, search, selectedKey, selectedMonth, selectedYear])

  // Navegação de meses
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear((prev) => prev - 1)
    } else {
      setSelectedMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear((prev) => prev + 1)
    } else {
      setSelectedMonth((prev) => prev + 1)
    }
  }

  const handleGoToCurrentMonth = () => {
    const now = new Date()
    setSelectedYear(now.getFullYear())
    setSelectedMonth(now.getMonth() + 1)
  }

  const isCurrentMonthSelected =
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1

  // Helper para obter o identificador do vínculo (moto ou participante)
  const nomeEmpresaDisplay = empresaConfig?.nome_empresa?.trim() || 'Empresa'

  const getVinculoInfo = (item: CaixaLancamento) => {
    if (item.entidade) {
      let label =
        ENTIDADES_CONFIG[item.entidade as EntidadeTipo]?.chipLabel || item.entidade.toUpperCase()
      let cor =
        ENTIDADES_CONFIG[item.entidade as EntidadeTipo]?.cor ||
        'bg-slate-100 text-slate-800 border-slate-300'

      if (item.entidade === 'empresa') {
        label = nomeEmpresaDisplay
        cor = 'bg-amber-100 text-amber-800 border-amber-300'
      } else if (item.entidade === 'socia') {
        label = item.expand?.socio?.nome ? item.expand.socio.nome : 'SÓCIA'
        cor = 'bg-purple-100 text-purple-800 border-purple-300'
      } else if (item.entidade === 'terceiros') {
        label = item.expand?.conta_a_pagar?.credor ? item.expand.conta_a_pagar.credor : 'TERCEIROS'
        cor = 'bg-rose-100 text-rose-800 border-rose-300'
      }

      return {
        tipo: 'entidade' as const,
        label,
        cor,
      }
    }
    const motoObj = item.expand?.moto || (item.moto ? motosMap[item.moto] : null)
    const nome = motoObj?.nome?.trim() || motoObj?.modelo?.trim()
    if (nome) {
      return {
        tipo: 'moto' as const,
        label: nome,
      }
    }
    return null
  }

  return (
    <div className="space-y-3.5">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Visão Mensal de Caixa (MÊS)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualização lado a lado de Recebimentos e Despesas mês a mês, com somatório, saldo
            líquido e margem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs gap-1.5 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Barra de Navegação entre Meses e Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Navegador de Mês */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToCurrentMonth}
            disabled={isCurrentMonthSelected}
            className="text-xs font-semibold gap-1 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mês Atual ({MONTH_NAMES[today.getMonth()].slice(0, 3)}/{today.getFullYear()})
          </Button>

          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-none border-r border-slate-200 dark:border-slate-700"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-xs font-bold font-mono uppercase text-slate-800 dark:text-slate-200">
              {MONTH_NAMES[selectedMonth - 1]} / {selectedYear}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-none border-l border-slate-200 dark:border-slate-700"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filtro de Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filtrar por descrição, moto ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs pl-8 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Cards de Resumo do Mês Selecionado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Card className="shadow-xs border-emerald-100 dark:border-emerald-950">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Recebimentos ({MONTH_NAMES[selectedMonth - 1].slice(0, 3)}/{selectedYear})
            </span>
            <div className="p-1 bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-md">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              R${' '}
              {currentMonthGroup.totalRecebimentos.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentMonthGroup.recebimentos.length} entrada(s) no mês
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-red-100 dark:border-red-950">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Despesas ({MONTH_NAMES[selectedMonth - 1].slice(0, 3)}/{selectedYear})
            </span>
            <div className="p-1 bg-red-100/70 text-red-700 dark:bg-red-950 dark:text-red-400 rounded-md">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-black text-red-600 dark:text-red-400">
              R${' '}
              {currentMonthGroup.totalDespesas.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentMonthGroup.despesas.length} saída(s) no mês
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-blue-100 dark:border-blue-950">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Saldo Líquido ({MONTH_NAMES[selectedMonth - 1].slice(0, 3)}/{selectedYear})
            </span>
            <div className="p-1 bg-blue-100/70 text-blue-700 dark:bg-blue-950 dark:text-blue-400 rounded-md">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div
              className={`text-lg font-black ${
                currentMonthGroup.saldoLiquido >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-red-600'
              }`}
            >
              R${' '}
              {currentMonthGroup.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {currentMonthGroup.totalRecebimentos > 0
                ? `${currentMonthGroup.percentualMargem}% da receita do mês`
                : 'Resultado do mês'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bloco Único Exibido: Apenas o Mês Selecionado */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const month = currentMonthGroup
            const isPositivo = month.saldoLiquido >= 0

            return (
              <Card
                key={month.key}
                className="overflow-hidden shadow-xs border-slate-200 dark:border-slate-800"
              >
                {/* CABEÇALHO DO BLOCO: NOME DO MÊS ESCRITO EM CIMA + SALDO LÍQUIDO E % À DIREITA */}
                <div className="bg-slate-100/90 dark:bg-slate-800/80 px-3.5 py-2 sm:py-2.5 border-b border-slate-200 dark:border-slate-700/80">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    {/* NOME DO MÊS ESCRITO EM CIMA DO BLOCO */}
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          MÊS SELECIONADO
                        </span>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          {month.label}
                        </h2>
                      </div>
                    </div>

                    {/* SALDO LÍQUIDO DO MÊS E % QUE REPRESENTA DA RECEITA BRUTA */}
                    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-xs">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Resultado do Mês
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Saldo líquido:
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black ${
                              isPositivo
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            R${' '}
                            {month.saldoLiquido.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>

                      {month.totalRecebimentos > 0 ? (
                        <Badge
                          variant="secondary"
                          className={`text-[11px] px-2 py-0.5 font-bold ${
                            isPositivo
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                          }`}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {month.percentualMargem}% da receita
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] text-muted-foreground px-2 py-0.5"
                        >
                          Sem receita
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* DUAS COLUNAS LADO A LADO: À ESQUERDA "RECEBIMENTOS" E À DIREITA "DESPESAS" */}
                {/* No celular, flex-col empilha sem scroll horizontal. Em telas md+, grid de 2 colunas. */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                  {/* COLUNA ESQUERDA: RECEBIMENTOS */}
                  <div className="flex flex-col bg-white dark:bg-slate-900">
                    {/* Cabeçalho da coluna com SOMATÓRIO em cima */}
                    <div className="px-3 py-1.5 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                            RECEBIMENTOS
                          </h3>
                          <span className="text-[10px] text-muted-foreground">
                            {month.recebimentos.length} lançamento(s)
                          </span>
                        </div>
                      </div>

                      {/* SOMATÓRIO EM CIMA */}
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                          Total Recebimentos
                        </span>
                        <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">
                          R${' '}
                          {month.totalRecebimentos.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Recebimentos: VALOR, DATA, MOTO, DESCRIÇÃO */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-[11px]">
                            <th className="py-1.5 px-2 text-right font-bold w-24 text-emerald-700 dark:text-emerald-400">
                              VALOR
                            </th>
                            <th className="py-1.5 px-2 text-left font-bold w-20">DATA</th>
                            <th className="py-1.5 px-2 text-left font-bold w-20 text-slate-700 dark:text-slate-300">
                              MOTO
                            </th>
                            <th className="py-1.5 px-2 text-left font-bold">DESCRIÇÃO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {month.recebimentos.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-4 text-center text-xs text-muted-foreground"
                              >
                                Nenhum recebimento neste mês
                              </td>
                            </tr>
                          ) : (
                            month.recebimentos.map((item) => {
                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
                                >
                                  {/* VALOR */}
                                  <td className="py-1.5 px-2 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    R${' '}
                                    {item.valor.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>

                                  {/* DATA */}
                                  <td className="py-1.5 px-2 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                                    {formatDateDisplay(item.data)}
                                  </td>

                                  {/* MOTO / ENTIDADE (3ª coluna) */}
                                  <td className="py-1.5 px-2 whitespace-nowrap">
                                    {(() => {
                                      const vinculo = getVinculoInfo(item)
                                      if (!vinculo) {
                                        return (
                                          <span className="text-muted-foreground text-xs">—</span>
                                        )
                                      }
                                      if (vinculo.tipo === 'entidade') {
                                        return (
                                          <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${vinculo.cor}`}
                                            title="Lançamento da entidade da empresa"
                                          >
                                            {vinculo.label}
                                          </span>
                                        )
                                      }
                                      return (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                          {vinculo.label}
                                        </span>
                                      )
                                    })()}
                                  </td>

                                  {/* DESCRIÇÃO */}
                                  <td className="py-1.5 px-2">
                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                                      {item.descricao}
                                    </div>
                                    {item.categoria && item.categoria !== 'Aluguel' && (
                                      <span className="text-[10px] text-muted-foreground leading-tight block">
                                        {item.categoria}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* COLUNA DIREITA: DESPESAS */}
                  <div className="flex flex-col bg-white dark:bg-slate-900">
                    {/* Cabeçalho da coluna com SOMATÓRIO em cima */}
                    <div className="px-3 py-1.5 bg-red-50/60 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xs sm:text-sm text-red-800 dark:text-red-300">
                            DESPESAS
                          </h3>
                          <span className="text-[10px] text-muted-foreground">
                            {month.despesas.length} lançamento(s)
                          </span>
                        </div>
                      </div>

                      {/* SOMATÓRIO EM CIMA */}
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-800 dark:text-red-400 block">
                          Total Despesas
                        </span>
                        <span className="text-xs sm:text-sm font-black text-red-600 dark:text-red-400">
                          R${' '}
                          {month.totalDespesas.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Despesas: VALOR, DATA, MOTO, DESCRIÇÃO */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-[11px]">
                            <th className="py-1.5 px-2 text-right font-bold w-24 text-red-700 dark:text-red-400">
                              VALOR
                            </th>
                            <th className="py-1.5 px-2 text-left font-bold w-20">DATA</th>
                            <th className="py-1.5 px-2 text-left font-bold w-20 text-slate-700 dark:text-slate-300">
                              MOTO
                            </th>
                            <th className="py-1.5 px-2 text-left font-bold">DESCRIÇÃO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {month.despesas.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-4 text-center text-xs text-muted-foreground"
                              >
                                Nenhuma despesa neste mês
                              </td>
                            </tr>
                          ) : (
                            month.despesas.map((item) => {
                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors"
                                >
                                  {/* VALOR */}
                                  <td className="py-1.5 px-2 text-right font-bold text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                                    R${' '}
                                    {item.valor.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>

                                  {/* DATA */}
                                  <td className="py-1.5 px-2 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                                    {formatDateDisplay(item.data)}
                                  </td>

                                  {/* MOTO / ENTIDADE (3ª coluna) */}
                                  <td className="py-1.5 px-2 whitespace-nowrap">
                                    {(() => {
                                      const vinculo = getVinculoInfo(item)
                                      if (!vinculo) {
                                        return (
                                          <span className="text-muted-foreground text-xs">—</span>
                                        )
                                      }
                                      if (vinculo.tipo === 'entidade') {
                                        return (
                                          <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${vinculo.cor}`}
                                            title="Lançamento da entidade da empresa"
                                          >
                                            {vinculo.label}
                                          </span>
                                        )
                                      }
                                      return (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                          {vinculo.label}
                                        </span>
                                      )
                                    })()}
                                  </td>

                                  {/* DESCRIÇÃO */}
                                  <td className="py-1.5 px-2">
                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                                      {item.descricao}
                                    </div>
                                    {item.categoria && (
                                      <span className="text-[10px] text-muted-foreground leading-tight block">
                                        {item.categoria}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })()}
        </div>
      )}
    </div>
  )
}
