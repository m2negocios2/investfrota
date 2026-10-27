import React, { useState, useEffect } from 'react'
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Percent,
  TrendingUp,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { caixaService } from '@/services/caixa'
import { motosService } from '@/services/motos'
import { formatDateDisplay } from '@/lib/dateUtils'
import { CaixaLancamento, Moto } from '@/types/database'
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [caixaData, motosData] = await Promise.all([
        caixaService.getAll(),
        motosService.getAll().catch((err) => {
          console.warn('Erro ao carregar motos no relatório Mes:', err)
          return [] as Moto[]
        }),
      ])
      setLancamentos(caixaData)
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

  // Agrupar lançamentos por Mês (respeitando datas exatas YYYY-MM)
  const monthGroups = React.useMemo(() => {
    const groupsMap = new Map<
      string,
      { recebimentos: CaixaLancamento[]; despesas: CaixaLancamento[] }
    >()

    lancamentos.forEach((item) => {
      // Data formato YYYY-MM-DD
      const datePart = (item.data || '').split('T')[0].split(' ')[0]
      const yearMonth = datePart ? datePart.slice(0, 7) : ''
      if (!yearMonth || yearMonth.length < 7) return

      // Filtro de busca opcional (descrição, categoria ou nome da moto)
      if (search.trim()) {
        const query = search.toLowerCase()
        const desc = (item.descricao || '').toLowerCase()
        const cat = (item.categoria || '').toLowerCase()
        const motoObj = item.expand?.moto || motosMap[item.moto]
        const motoNome = (motoObj?.nome || motoObj?.modelo || '').toLowerCase()
        if (!desc.includes(query) && !cat.includes(query) && !motoNome.includes(query)) {
          return
        }
      }

      if (!groupsMap.has(yearMonth)) {
        groupsMap.set(yearMonth, { recebimentos: [], despesas: [] })
      }
      const group = groupsMap.get(yearMonth)!
      if (item.tipo === 'entrada') {
        group.recebimentos.push(item)
      } else {
        group.despesas.push(item)
      }
    })

    // Garantir que o mês atual sempre apareça, mesmo sem lançamentos ainda
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth() + 1
    const currentKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`
    if (!groupsMap.has(currentKey) && !search.trim()) {
      groupsMap.set(currentKey, { recebimentos: [], despesas: [] })
    }

    // Ordenar as chaves de mês do mais recente para o mais antigo (DESCENDING)
    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a))

    return sortedKeys.map((key) => {
      const [yStr, mStr] = key.split('-')
      const year = parseInt(yStr, 10)
      const month = parseInt(mStr, 10)
      const monthName = MONTH_NAMES[month - 1] || `MÊS ${month}`
      const label = `${monthName} ${year}`

      const groupData = groupsMap.get(key)!
      // Ordenar recebimentos por data decrescente (ou crescente se preferir; mantemos padrão consistente)
      const recebimentos = [...groupData.recebimentos].sort((a, b) => {
        const dA = a.data ? a.data.slice(0, 10) : ''
        const dB = b.data ? b.data.slice(0, 10) : ''
        return dB.localeCompare(dA)
      })

      const despesas = [...groupData.despesas].sort((a, b) => {
        const dA = a.data ? a.data.slice(0, 10) : ''
        const dB = b.data ? b.data.slice(0, 10) : ''
        return dB.localeCompare(dA)
      })

      const totalRecebimentos = recebimentos.reduce((sum, r) => sum + r.valor, 0)
      const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0)
      const saldoLiquido = totalRecebimentos - totalDespesas

      // Percentual que o saldo líquido representa da receita bruta
      let percentualMargem = 0
      if (totalRecebimentos > 0) {
        percentualMargem = Math.round((saldoLiquido / totalRecebimentos) * 100)
      }

      return {
        key,
        label,
        year,
        month,
        recebimentos,
        despesas,
        totalRecebimentos,
        totalDespesas,
        saldoLiquido,
        percentualMargem,
      } as MonthGroup
    })
  }, [lancamentos, motosMap, search])

  // Helper para obter o nome da moto vinculada ao lançamento
  const getMotoNome = (item: CaixaLancamento) => {
    const motoObj = item.expand?.moto || motosMap[item.moto]
    const nome = motoObj?.nome?.trim() || motoObj?.modelo?.trim()
    return nome || '—'
  }

  // Totalizadores gerais (todos os meses visíveis)
  const totalGeralReceitas = monthGroups.reduce((acc, m) => acc + m.totalRecebimentos, 0)
  const totalGeralDespesas = monthGroups.reduce((acc, m) => acc + m.totalDespesas, 0)
  const totalGeralSaldo = totalGeralReceitas - totalGeralDespesas

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Visão Mensal de Caixa (MÊS)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
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
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo Geral Acumulado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs border-emerald-100 dark:border-emerald-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Total Recebimentos Acumulados
            </span>
            <div className="p-1.5 bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              R$ {totalGeralReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todas as entradas registradas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-red-100 dark:border-red-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Total Despesas Acumuladas
            </span>
            <div className="p-1.5 bg-red-100/70 text-red-700 dark:bg-red-950 dark:text-red-400 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">
              R$ {totalGeralDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todos os custos e manutenções
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-blue-100 dark:border-blue-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Saldo Líquido Total
            </span>
            <div className="p-1.5 bg-blue-100/70 text-blue-700 dark:bg-blue-950 dark:text-blue-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${
                totalGeralSaldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'
              }`}
            >
              R$ {totalGeralSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Resultado financeiro geral consolidado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtro de Busca */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar lançamentos por descrição, moto ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Lista de Blocos Mensais */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : monthGroups.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Nenhum mês encontrado com lançamentos
          </p>
          <p className="text-xs">Registre entradas ou saídas no Fluxo de Caixa.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {monthGroups.map((month) => {
            const isPositivo = month.saldoLiquido >= 0

            return (
              <Card
                key={month.key}
                className="overflow-hidden shadow-md border-slate-200 dark:border-slate-800"
              >
                {/* CABEÇALHO DO BLOCO: NOME DO MÊS ESCRITO EM CIMA + SALDO LÍQUIDO E % À DIREITA */}
                <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-4 border-b border-slate-200 dark:border-slate-700/80">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* NOME DO MÊS ESCRITO EM CIMA DO BLOCO */}
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground block">
                          MÊS
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          {month.label}
                        </h2>
                      </div>
                    </div>

                    {/* SALDO LÍQUIDO DO MÊS E % QUE REPRESENTA DA RECEITA BRUTA */}
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Resultado do Mês
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Saldo líquido:
                          </span>
                          <span
                            className={`text-lg sm:text-xl font-black ${
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
                          className={`text-xs px-2.5 py-1 font-bold ${
                            isPositivo
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5 mr-1" />
                          {month.percentualMargem}% da receita bruta
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
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
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 rounded-md">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-emerald-800 dark:text-emerald-300">
                            RECEBIMENTOS
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            {month.recebimentos.length} lançamento(s)
                          </span>
                        </div>
                      </div>

                      {/* SOMATÓRIO EM CIMA */}
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                          Total Recebimentos
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400">
                          R${' '}
                          {month.totalRecebimentos.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Recebimentos: VALOR, DATA, MOTO, DESCRIÇÃO */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs">
                            <th className="py-2.5 px-3 text-right font-bold w-28 text-emerald-700 dark:text-emerald-400">
                              VALOR
                            </th>
                            <th className="py-2.5 px-3 text-left font-bold w-24">DATA</th>
                            <th className="py-2.5 px-3 text-left font-bold w-24 text-slate-700 dark:text-slate-300">
                              MOTO
                            </th>
                            <th className="py-2.5 px-3 text-left font-bold">DESCRIÇÃO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {month.recebimentos.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-8 text-center text-xs text-muted-foreground"
                              >
                                Nenhum recebimento neste mês
                              </td>
                            </tr>
                          ) : (
                            month.recebimentos.map((item) => {
                              const motoNome = getMotoNome(item)
                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
                                >
                                  {/* VALOR */}
                                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    R${' '}
                                    {item.valor.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>

                                  {/* DATA */}
                                  <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                                    {formatDateDisplay(item.data)}
                                  </td>

                                  {/* MOTO (3ª coluna) */}
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {motoNome !== '—' ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                        {motoNome}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </td>

                                  {/* DESCRIÇÃO */}
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                      {item.descricao}
                                    </div>
                                    {item.categoria && item.categoria !== 'Aluguel' && (
                                      <span className="text-[10px] text-muted-foreground">
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
                    <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md">
                          <ArrowDownRight className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-red-800 dark:text-red-300">
                            DESPESAS
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            {month.despesas.length} lançamento(s)
                          </span>
                        </div>
                      </div>

                      {/* SOMATÓRIO EM CIMA */}
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 dark:text-red-400 block">
                          Total Despesas
                        </span>
                        <span className="text-base sm:text-lg font-black text-red-600 dark:text-red-400">
                          R${' '}
                          {month.totalDespesas.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Despesas: VALOR, DATA, MOTO, DESCRIÇÃO */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs">
                            <th className="py-2.5 px-3 text-right font-bold w-28 text-red-700 dark:text-red-400">
                              VALOR
                            </th>
                            <th className="py-2.5 px-3 text-left font-bold w-24">DATA</th>
                            <th className="py-2.5 px-3 text-left font-bold w-24 text-slate-700 dark:text-slate-300">
                              MOTO
                            </th>
                            <th className="py-2.5 px-3 text-left font-bold">DESCRIÇÃO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {month.despesas.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-8 text-center text-xs text-muted-foreground"
                              >
                                Nenhuma despesa neste mês
                              </td>
                            </tr>
                          ) : (
                            month.despesas.map((item) => {
                              const motoNome = getMotoNome(item)
                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors"
                                >
                                  {/* VALOR */}
                                  <td className="py-2.5 px-3 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                                    R${' '}
                                    {item.valor.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>

                                  {/* DATA */}
                                  <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                                    {formatDateDisplay(item.data)}
                                  </td>

                                  {/* MOTO (3ª coluna) */}
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {motoNome !== '—' ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                        {motoNome}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </td>

                                  {/* DESCRIÇÃO */}
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                      {item.descricao}
                                    </div>
                                    {item.categoria && (
                                      <span className="text-[10px] text-muted-foreground">
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
          })}
        </div>
      )}
    </div>
  )
}
