import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
  Bike,
  CreditCard,
  Edit3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { recebimentosService } from '@/services/recebimentos'
import { Moto, Contrato, Recebimento, DiaSemana } from '@/types/database'
import { getTodayLocalDate, formatDateDisplay } from '@/lib/dateUtils'

// Days order SEG to DOM
const DIAS_SEMANA: { key: DiaSemana; label: string; short: string; dayIndex: number }[] = [
  { key: 'SEG', label: 'Segunda-feira', short: 'SEG', dayIndex: 1 },
  { key: 'TER', label: 'Terça-feira', short: 'TER', dayIndex: 2 },
  { key: 'QUA', label: 'Quarta-feira', short: 'QUA', dayIndex: 3 },
  { key: 'QUI', label: 'Quinta-feira', short: 'QUI', dayIndex: 4 },
  { key: 'SEX', label: 'Sexta-feira', short: 'SEX', dayIndex: 5 },
  { key: 'SAB', label: 'Sábado', short: 'SAB', dayIndex: 6 },
  { key: 'DOM', label: 'Domingo', short: 'DOM', dayIndex: 0 },
]

// Helper: ISO 8601 Week Number
function getISOWeekNumber(d: Date): { year: number; week: number; code: string } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return {
    year: date.getUTCFullYear(),
    week: weekNo,
    code: `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
  }
}

// Get dates for a given ISO week
function getWeekDates(
  year: number,
  week: number,
): { [key in DiaSemana]: { date: Date; dateStr: string } } {
  // 4th of January is always in week 1
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dow = simple.getUTCDay()
  const ISOweekStart = new Date(simple)
  if (dow <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1)
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay())
  }

  const result: any = {}
  DIAS_SEMANA.forEach((d, idx) => {
    const cur = new Date(ISOweekStart)
    cur.setUTCDate(ISOweekStart.getUTCDate() + idx)
    result[d.key] = {
      date: cur,
      dateStr: cur.toISOString().split('T')[0],
    }
  })
  return result
}

export default function Semana() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [loading, setLoading] = useState(true)

  // Current ISO Week state
  const todayInfo = useMemo(() => getISOWeekNumber(new Date()), [])
  const [selectedYear, setSelectedYear] = useState<number>(todayInfo.year)
  const [selectedWeek, setSelectedWeek] = useState<number>(todayInfo.week)

  // Configurable percent (default 70% matching owner's spreadsheet)
  const [percentualLiquido, setPercentualLiquido] = useState<number>(70)
  const [showConfigPercentual, setShowConfigPercentual] = useState(false)

  // Payment Confirmation Dialog (when clicking neutral or overdue cell)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [cellTarget, setCellTarget] = useState<{
    moto: Moto
    contrato: Contrato
    dia: DiaSemana
    dateStr: string
    valor: number
    recebimento?: Recebimento
  } | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<
    'pix' | 'dinheiro' | 'cartao' | 'transferencia'
  >('pix')

  // Change Day Modal
  const [changeDayModalOpen, setChangeDayModalOpen] = useState(false)
  const [changeDayTarget, setChangeDayTarget] = useState<Contrato | null>(null)
  const [newDay, setNewDay] = useState<DiaSemana>('SEG')
  const [savingDay, setSavingDay] = useState(false)

  // History stack count (number of previous weeks to show stacked above)
  const [historyCount, setHistoryCount] = useState<number>(3)

  const loadData = async () => {
    try {
      const [mList, cList, rList] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        recebimentosService.getAll(),
      ])
      setMotos(mList)
      setContratos(cList)
      setRecebimentos(rList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados da semana')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Selected week date boundaries (Monday 00:00:00 to Sunday 23:59:59 pure date string comparison)
  const selectedWeekDates = useMemo(() => {
    return getWeekDates(selectedYear, selectedWeek)
  }, [selectedYear, selectedWeek])

  const selectedWeekStartStr = selectedWeekDates['SEG'].dateStr
  const selectedWeekEndStr = selectedWeekDates['DOM'].dateStr

  // Active contracts with their moto for the currently selected week.
  // Regra de negócio: contratos ativos cuja data_inicio <= fim da semana E
  // (se tiver data_entrega/término definida, data_entrega >= início da semana).
  // Contratos que já foram finalizados (status === 'finalizado') antes desta semana NÃO entram.
  // Contratos ativos continuam aparecendo a partir de sua data_inicio.
  const activeContratos = useMemo(() => {
    return contratos.filter((c) => {
      if (c.status !== 'ativo') return false
      const inicio = c.data_inicio ? c.data_inicio.split('T')[0] : ''
      if (inicio && inicio > selectedWeekEndStr) return false
      if (c.data_entrega) {
        const fim = c.data_entrega.split('T')[0]
        if (fim && fim < selectedWeekStartStr) return false
      }
      return true
    })
  }, [contratos, selectedWeekStartStr, selectedWeekEndStr])

  // Motos not rented (disponivel or manutencao or without active contract in this week)
  const unrentedMotos = useMemo(() => {
    const rentedMotoIds = new Set(activeContratos.map((c) => c.moto))
    return motos.filter((m) => !rentedMotoIds.has(m.id))
  }, [motos, activeContratos])

  // Nomes dos meses em português maiúsculo
  const NOMES_MESES = [
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

  // Helper para identificar o Mês e qual Semana do Mês (1 a 5) a semana ISO pertence.
  // Regra de negócio (base segunda-feira):
  // A semana começa na SEGUNDA-FEIRA. O mês da semana é o mês da sua SEGUNDA-FEIRA inicial.
  // A "semana 1" de um mês é a semana que começa (segunda-feira) dentro daquele mês.
  // Dias do mês que caem antes da primeira segunda-feira pertencem à última semana do mês anterior.
  // Semana do mês = índice da segunda-feira que inicia a semana contando apenas as segundas-feiras do próprio mês.
  const getWeekMonthInfo = (year: number, week: number) => {
    const weekDates = getWeekDates(year, week)
    // A segunda-feira inicia a semana e define o mês de referência
    const mondayDate = weekDates['SEG'].date
    const mondayDay = mondayDate.getUTCDate()
    const monthIndex = mondayDate.getUTCMonth()
    const monthYear = mondayDate.getUTCFullYear()
    const monthName = NOMES_MESES[monthIndex]

    // Índice da segunda-feira no mês:
    // Dias 1 a 7: 1ª segunda -> SEMANA 1
    // Dias 8 a 14: 2ª segunda -> SEMANA 2
    // Dias 15 a 21: 3ª segunda -> SEMANA 3
    // Dias 22 a 28: 4ª segunda -> SEMANA 4
    // Dias 29 a 31: 5ª segunda -> SEMANA 5
    const weekOfMonth = Math.floor((mondayDay - 1) / 7) + 1

    return {
      monthName,
      monthYear,
      weekOfMonth,
    }
  }

  // Weeks list to display:
  // Item 1: A semana atual sempre fica no topo e as outras vão descendo em ordem (decrescente: mais recente primeiro)
  const weeksToDisplay = useMemo(() => {
    const list: {
      year: number
      week: number
      code: string
      isCurrent: boolean
      monthName: string
      monthYear: number
      weekOfMonth: number
    }[] = []

    // 1. Semana atual/selecionada no topo
    const currentInfo = getWeekMonthInfo(selectedYear, selectedWeek)
    list.push({
      year: selectedYear,
      week: selectedWeek,
      code: `${selectedYear}-W${String(selectedWeek).padStart(2, '0')}`,
      isCurrent: true,
      monthName: currentInfo.monthName,
      monthYear: currentInfo.monthYear,
      weekOfMonth: currentInfo.weekOfMonth,
    })

    // 2. Histórico de semanas anteriores descendo em ordem decrescente (mais recente primeiro: -1, -2, -3...)
    for (let i = 1; i <= historyCount; i++) {
      let targetWeek = selectedWeek - i
      let targetYear = selectedYear
      if (targetWeek < 1) {
        targetYear -= 1
        targetWeek += 52
      }
      const prevInfo = getWeekMonthInfo(targetYear, targetWeek)
      list.push({
        year: targetYear,
        week: targetWeek,
        code: `${targetYear}-W${String(targetWeek).padStart(2, '0')}`,
        isCurrent: false,
        monthName: prevInfo.monthName,
        monthYear: prevInfo.monthYear,
        weekOfMonth: prevInfo.weekOfMonth,
      })
    }

    return list
  }, [selectedYear, selectedWeek, historyCount])

  // Helper to get contract's weekly payment day
  const getContractDay = (contrato: Contrato): DiaSemana => {
    if (contrato.dia_pagamento_semana) return contrato.dia_pagamento_semana
    if (contrato.data_inicio) {
      const dt = new Date(contrato.data_inicio)
      const map: DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
      return map[dt.getUTCDay()] || 'SEG'
    }
    return 'SEG'
  }

  // Helper to calculate cell status for a contract in a given week
  const getCellStatus = (
    contrato: Contrato,
    weekCode: string,
    cellDateStr: string,
  ): {
    status: 'pago' | 'pendente' | 'atraso'
    recebimento?: Recebimento
  } => {
    // Look for a payment registered for this moto in this week or date
    const found = recebimentos.find(
      (r) =>
        r.moto === contrato.moto &&
        (r.semana_ano === weekCode ||
          (r.data_vencimento && r.data_vencimento.startsWith(cellDateStr))),
    )

    if (found) {
      if (found.status === 'pago') {
        return { status: 'pago', recebimento: found }
      }
      if (found.status === 'em_atraso') {
        return { status: 'atraso', recebimento: found }
      }
      // em_dia: check if overdue compared to today
      const todayStr = getTodayLocalDate()
      if (cellDateStr < todayStr) {
        return { status: 'atraso', recebimento: found }
      }
      return { status: 'pendente', recebimento: found }
    }

    // No recebimento record: if cell date is in the past, consider overdue; otherwise neutral/pending
    const todayStr = getTodayLocalDate()
    if (cellDateStr < todayStr) {
      return { status: 'atraso' }
    }
    return { status: 'pendente' }
  }

  // Handle cell click (Toggle or confirm payment)
  const handleCellClick = (
    contrato: Contrato,
    moto: Moto,
    dia: DiaSemana,
    weekCode: string,
    cellDateStr: string,
    valor: number,
  ) => {
    const cellState = getCellStatus(contrato, weekCode, cellDateStr)

    if (cellState.status === 'pago' && cellState.recebimento) {
      // Estornar / Desmarcar pagamento
      if (
        confirm(
          `A moto ${moto.nome || moto.modelo} já consta como PAGA nesta semana. Deseja estornar/desmarcar o pagamento?`,
        )
      ) {
        recebimentosService
          .estornarPagamento(cellState.recebimento.id, 'em_dia')
          .then(() => {
            toast.success('Pagamento estornado com sucesso!')
            loadData()
          })
          .catch((err) => {
            console.error(err)
            toast.error('Erro ao estornar pagamento')
          })
      }
      return
    }

    // Open confirm payment modal
    setCellTarget({
      moto,
      contrato,
      dia,
      dateStr: cellDateStr,
      valor,
      recebimento: cellState.recebimento,
    })
    setPaymentModalOpen(true)
  }

  // Confirm payment in modal
  const handleConfirmPayment = async () => {
    if (!cellTarget) return
    try {
      const todayStr = getTodayLocalDate()
      const weekCode = `${selectedYear}-W${String(selectedWeek).padStart(2, '0')}`

      if (cellTarget.recebimento) {
        // Update existing recebimento to 'pago' and register in caixa
        await recebimentosService.marcarComoPago(
          cellTarget.recebimento.id,
          cellTarget.moto.id,
          cellTarget.valor,
          cellTarget.contrato.locatario_nome,
          formaPagamento,
          todayStr,
        )
      } else {
        // Create new paid recebimento with semana_ano and register in caixa
        const newRec = await recebimentosService.create({
          moto: cellTarget.moto.id,
          contrato: cellTarget.contrato.id,
          locatario_nome: cellTarget.contrato.locatario_nome,
          data_vencimento: cellTarget.dateStr,
          data_pagamento: todayStr,
          valor: cellTarget.valor,
          status: 'pago',
          forma_pagamento: formaPagamento,
          semana_ano: weekCode,
        })
        await recebimentosService.marcarComoPago(
          newRec.id,
          cellTarget.moto.id,
          cellTarget.valor,
          cellTarget.contrato.locatario_nome,
          formaPagamento,
          todayStr,
        )
      }

      toast.success(`Pagamento de R$ ${cellTarget.valor.toFixed(2)} registrado e lançado no caixa!`)
      setPaymentModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar pagamento')
    }
  }

  // Save adjusted day of week
  const handleSaveNewDay = async () => {
    if (!changeDayTarget) return
    setSavingDay(true)
    try {
      await contratosService.updateDiaSemana(changeDayTarget.id, newDay)
      toast.success(`Dia de pagamento alterado para ${newDay}!`)
      setChangeDayModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar dia da semana')
    } finally {
      setSavingDay(false)
    }
  }

  // Navigation handlers
  const handlePrevWeek = () => {
    if (selectedWeek === 1) {
      setSelectedYear((y) => y - 1)
      setSelectedWeek(52)
    } else {
      setSelectedWeek((w) => w - 1)
    }
  }

  const handleNextWeek = () => {
    if (selectedWeek === 52) {
      setSelectedYear((y) => y + 1)
      setSelectedWeek(1)
    } else {
      setSelectedWeek((w) => w + 1)
    }
  }

  const handleGoToCurrentWeek = () => {
    setSelectedYear(todayInfo.year)
    setSelectedWeek(todayInfo.week)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Painel SEMANA
            </h1>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-bold"
            >
              Semana {selectedWeek} • {selectedYear}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Grade operacional semanal: veja os dias de pagamento de cada moto, dê baixa e ajuste
            datas.
          </p>
        </div>

        {/* Week Selector Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToCurrentWeek}
            className="text-xs font-semibold gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Semana Atual ({todayInfo.week})
          </Button>

          <div className="flex items-center border rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevWeek}
              className="h-8 w-8 rounded-none border-r"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-xs font-bold font-mono">
              SEM {selectedWeek} / {selectedYear}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextWeek}
              className="h-8 w-8 rounded-none border-l"
              title="Próxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigPercentual(!showConfigPercentual)}
            className="text-xs gap-1.5"
          >
            <Percent className="w-3.5 h-3.5 text-blue-600" />
            Líquido ({percentualLiquido}%)
          </Button>
        </div>
      </div>

      {/* Editable Percentage Bar (if toggled) */}
      {showConfigPercentual && (
        <Card className="bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 shadow-sm animate-in fade-in-50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <span className="font-bold block">Configuração da Linha de Líquido:</span>
              <span className="text-blue-700 dark:text-blue-300">
                A segunda linha de totais aplica este percentual sobre a receita bruta semanal (na
                sua planilha: 70% de 11.342 = 7.939,40).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold whitespace-nowrap">
                Percentual Líquido (%):
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={percentualLiquido}
                onChange={(e) => setPercentualLiquido(Number(e.target.value) || 70)}
                className="w-20 h-8 text-xs font-bold"
              />
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowConfigPercentual(false)}
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700 dark:text-slate-300">Cores da Grade:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 inline-block shadow-sm" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Verde: Já Pagou</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Neutro: Pendente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600 inline-block shadow-sm" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Vermelho: Em Atraso
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
          <span>💡 Toque no valor para dar baixa/estornar; toque no nome para ajustar o dia.</span>
          <Select
            value={String(historyCount)}
            onValueChange={(val) => setHistoryCount(Number(val))}
          >
            <SelectTrigger className="h-7 text-[11px] w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 semana abaixo</SelectItem>
              <SelectItem value="2">2 semanas abaixo</SelectItem>
              <SelectItem value="3">3 semanas abaixo</SelectItem>
              <SelectItem value="4">4 semanas abaixo</SelectItem>
              <SelectItem value="5">5 semanas abaixo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* WEEKS ACCORDION / STACK */}
      <div className="space-y-6">
        {weeksToDisplay.map((weekInfo) => {
          const isCurrentBlock = weekInfo.isCurrent
          const weekDates = getWeekDates(weekInfo.year, weekInfo.week)

          // Compute daily totals and grand totals for this week
          const dailyTotals: { [key in DiaSemana]: number } = {
            SEG: 0,
            TER: 0,
            QUA: 0,
            QUI: 0,
            SEX: 0,
            SAB: 0,
            DOM: 0,
          }

          activeContratos.forEach((contrato) => {
            const dia = getContractDay(contrato)
            const valor =
              contrato.valor_semanal || (contrato.valor_diario ? contrato.valor_diario * 7 : 0)
            dailyTotals[dia] += valor
          })

          const totalBrutoSemana = Object.values(dailyTotals).reduce((a, b) => a + b, 0)
          const totalLiquidoSemana = totalBrutoSemana * (percentualLiquido / 100)

          return (
            <Card
              key={weekInfo.code}
              className={`shadow-sm overflow-hidden border-2 transition-all ${
                isCurrentBlock
                  ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Week Block Header:
                  Item 1: Semana atual fica no topo, anteriores descem em ordem
                  Item 2: "MES: SEMANA 1 A 5" (ex.: MAIO: SEMANA 3)
                  Item 3: Em letra pequena a semana do ano (ex.: Semana 21 do ano)
                  Item 4: NÃO colocar dados financeiros no topo do card (deixar apenas embaixo)
              */}
              <div
                className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b ${
                  isCurrentBlock
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* MES: SEMANA 1 A 5 */}
                  <span
                    className={`font-black text-sm tracking-wide px-2.5 py-1 rounded shadow-sm ${
                      isCurrentBlock
                        ? 'bg-blue-900/60 text-white border border-blue-400/30'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {weekInfo.monthName}: SEMANA {weekInfo.weekOfMonth}
                  </span>

                  {/* Badge da semana atual ou histórico */}
                  {isCurrentBlock ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider"
                    >
                      Semana Atual
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0.5 text-muted-foreground border-slate-300 dark:border-slate-600 uppercase"
                    >
                      Histórico Anterior
                    </Badge>
                  )}
                </div>

                {/* Em letra pequena a semana do ano */}
                <div
                  className={`text-[11px] font-medium ${
                    isCurrentBlock ? 'text-blue-100' : 'text-muted-foreground dark:text-slate-400'
                  }`}
                >
                  Semana {weekInfo.week} do ano ({weekInfo.year})
                </div>
              </div>

              {/* TABLE CONTAINER (HORIZONTAL SCROLL ON MOBILE) */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-200 w-44 sticky left-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-10">
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-blue-600 dark:text-blue-400 font-black text-xs">
                            SEM {weekInfo.week}
                          </span>
                          <span className="text-[11px]">MOTO (ALUGADA)</span>
                        </div>
                      </th>
                      {DIAS_SEMANA.map((d) => (
                        <th
                          key={d.key}
                          className="p-2 text-center font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 min-w-[85px]"
                        >
                          <div className="font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            {d.short}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {weekDates[d.key].dateStr.split('-').slice(1).reverse().join('/')}
                          </div>
                        </th>
                      ))}
                      <th className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-200 min-w-[90px] border-r border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40">
                        VALOR TOTAL
                      </th>
                      <th className="p-2.5 text-left font-bold text-slate-700 dark:text-slate-200 min-w-[130px] bg-slate-100/40 dark:bg-slate-900/60">
                        NÃO ALUGADAS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {activeContratos.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted-foreground">
                          Nenhuma moto alugada com contrato ativo nesta semana.
                        </td>
                      </tr>
                    ) : (
                      activeContratos.map((contrato, rowIdx) => {
                        const moto = motos.find((m) => m.id === contrato.moto) || {
                          id: contrato.moto,
                          nome: 'Moto',
                          placa: '---',
                          modelo: 'Moto',
                          ano: 2023,
                          cor: '',
                          valor_diario: 35,
                          tipo_locacao_padrao: 'normal',
                          status: 'locada',
                          created: '',
                          updated: '',
                        }
                        const diaPgto = getContractDay(contrato)
                        const valorSemanal =
                          contrato.valor_semanal ||
                          (contrato.valor_diario ? contrato.valor_diario * 7 : 0)

                        // Unrented moto shown in this row (matching owner's spreadsheet style where unrented are on the right column)
                        const unrentedMotoThisRow = unrentedMotos[rowIdx]

                        return (
                          <tr
                            key={contrato.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            {/* Moto Column (Left, sticky) */}
                            <td className="p-2.5 font-bold sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChangeDayTarget(contrato)
                                    setNewDay(diaPgto)
                                    setChangeDayModalOpen(true)
                                  }}
                                  className="text-left font-extrabold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 group"
                                  title="Clique para ajustar o dia da semana desta moto"
                                >
                                  <span>{moto.nome || moto.modelo}</span>
                                  <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                <span className="font-mono text-[10px] text-muted-foreground px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                                  {diaPgto}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate font-normal">
                                {contrato.locatario_nome}
                              </div>
                            </td>

                            {/* 7 Days Columns (SEG..DOM) */}
                            {DIAS_SEMANA.map((d) => {
                              const isPayDay = diaPgto === d.key
                              if (!isPayDay) {
                                return (
                                  <td
                                    key={d.key}
                                    className="p-1.5 text-center border-r border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-700 bg-slate-50/20"
                                  >
                                    —
                                  </td>
                                )
                              }

                              const cellDateStr = weekDates[d.key].dateStr
                              const cellState = getCellStatus(contrato, weekInfo.code, cellDateStr)

                              // Color classes
                              let cellClasses =
                                'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                              let badgeIcon = <Clock className="w-3 h-3 text-slate-400" />
                              let titleText = 'Pendente (Clique para registrar pagamento)'

                              if (cellState.status === 'pago') {
                                cellClasses =
                                  'bg-emerald-500 hover:bg-emerald-600 text-white font-black border-2 border-emerald-600 shadow-sm'
                                badgeIcon = <CheckCircle className="w-3 h-3 text-white" />
                                titleText = 'Pago! (Clique para estornar se necessário)'
                              } else if (cellState.status === 'atraso') {
                                cellClasses =
                                  'bg-rose-500 hover:bg-rose-600 text-white font-black border-2 border-rose-600 shadow-sm animate-pulse'
                                badgeIcon = <AlertTriangle className="w-3 h-3 text-white" />
                                titleText = 'Em atraso! (Clique para registrar recebimento)'
                              }

                              return (
                                <td
                                  key={d.key}
                                  className="p-1 text-center border-r border-slate-200 dark:border-slate-700"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCellClick(
                                        contrato,
                                        moto as Moto,
                                        d.key,
                                        weekInfo.code,
                                        cellDateStr,
                                        valorSemanal,
                                      )
                                    }
                                    title={titleText}
                                    className={`w-full py-2 px-1 rounded-md text-xs transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none active:scale-95 ${cellClasses}`}
                                  >
                                    <span className="font-extrabold text-sm leading-none">
                                      {valorSemanal.toFixed(0)}
                                    </span>
                                    <span className="text-[9px] opacity-90 flex items-center gap-0.5 leading-none">
                                      {cellState.status === 'pago'
                                        ? 'PAGO'
                                        : cellState.status === 'atraso'
                                          ? 'ATRASO'
                                          : 'A PAGAR'}
                                    </span>
                                  </button>
                                </td>
                              )
                            })}

                            {/* Total Weekly Contract Value */}
                            <td className="p-2.5 text-right font-extrabold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 font-mono">
                              R${' '}
                              {valorSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </td>

                            {/* Unrented Motos Column (Right Column, owner's sheet) */}
                            <td className="p-2.5 text-left text-xs bg-slate-50/30 dark:bg-slate-900/40">
                              {unrentedMotoThisRow ? (
                                <div className="flex items-center justify-between gap-1">
                                  <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                      {unrentedMotoThisRow.nome || unrentedMotoThisRow.modelo}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground ml-1.5">
                                      ({unrentedMotoThisRow.placa})
                                    </span>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 ${
                                      unrentedMotoThisRow.status === 'manutencao'
                                        ? 'border-amber-300 text-amber-700 bg-amber-50'
                                        : 'border-slate-300 text-slate-600'
                                    }`}
                                  >
                                    {unrentedMotoThisRow.status.toUpperCase()}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 text-[10px]">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>

                  {/* FOOTER: TOTALS BRUTO & LÍQUIDO (FIGURE 2 IN OWNER'S SPREADSHEET) */}
                  <tfoot>
                    {/* First Line: Valor Bruto a Receber por Dia */}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                      <td className="p-2.5 text-left sticky left-0 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600 z-10 font-extrabold">
                        TOTAL A RECEBER (BRUTO)
                      </td>
                      {DIAS_SEMANA.map((d) => (
                        <td
                          key={d.key}
                          className="p-2 text-center border-r border-slate-300 dark:border-slate-600 font-extrabold text-sm text-slate-900 dark:text-white font-mono"
                        >
                          {dailyTotals[d.key] > 0
                            ? dailyTotals[d.key].toLocaleString('pt-BR', {
                                minimumFractionDigits: 0,
                              })
                            : '—'}
                        </td>
                      ))}
                      <td className="p-2 text-right border-r border-slate-300 dark:border-slate-600 font-black text-sm text-slate-900 dark:text-white font-mono bg-slate-200/60 dark:bg-slate-700/60">
                        R$ {totalBrutoSemana.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {unrentedMotos.length} moto(s) livres
                      </td>
                    </tr>

                    {/* Second Line: Valor Líquido (70% or configured percent) */}
                    <tr className="bg-blue-50/70 dark:bg-blue-950/40 font-bold border-t border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100">
                      <td className="p-2.5 text-left sticky left-0 bg-blue-50/90 dark:bg-blue-950/90 border-r border-blue-200 dark:border-blue-800 z-10 font-extrabold flex items-center justify-between">
                        <span>LÍQUIDO ({percentualLiquido}%)</span>
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      </td>
                      {DIAS_SEMANA.map((d) => {
                        const liqVal = dailyTotals[d.key] * (percentualLiquido / 100)
                        return (
                          <td
                            key={d.key}
                            className="p-2 text-center border-r border-blue-200 dark:border-blue-800 font-extrabold text-xs font-mono"
                          >
                            {liqVal > 0
                              ? liqVal.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })
                              : '—'}
                          </td>
                        )
                      })}
                      <td className="p-2 text-right border-r border-blue-200 dark:border-blue-800 font-black text-sm font-mono text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/60">
                        R${' '}
                        {totalLiquidoSemana.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-2 text-[11px] text-blue-700 dark:text-blue-300 font-normal">
                        Líquido estimado
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Unrented Motos Section (Detailed card below for quick action) */}
      {unrentedMotos.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Bike className="w-5 h-5 text-slate-500" />
                  <span>Motos Não Alugadas / Disponíveis ({unrentedMotos.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Motos que ainda não geram receita nesta semana.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {unrentedMotos.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-sm block text-slate-900 dark:text-white">
                      {m.nome || m.modelo}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{m.placa}</span>
                    <span className="text-xs block text-slate-600 dark:text-slate-400 mt-0.5">
                      {m.modelo} • R${' '}
                      {(m.valor_semanal !== undefined && m.valor_semanal !== null
                        ? m.valor_semanal
                        : (m.valor_diario || 0) * 7
                      ).toFixed(0)}
                      /sem
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      m.status === 'manutencao'
                        ? 'border-amber-300 text-amber-700 bg-amber-50'
                        : m.status === 'em_loja_detran'
                          ? 'border-purple-300 text-purple-700 bg-purple-50'
                          : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                    }
                  >
                    {m.status === 'em_loja_detran'
                      ? 'LOJA/DETRAN'
                      : m.status === 'manutencao'
                        ? 'MANUTENÇÃO'
                        : 'DISPONÍVEL'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Confirm Payment */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento Semanal</DialogTitle>
            <DialogDescription>
              Dar baixa no valor de R$ {cellTarget?.valor.toFixed(2)} para a moto{' '}
              <strong>{cellTarget?.moto.nome || cellTarget?.moto.modelo}</strong> ({cellTarget?.dia}
              ).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locatário:</span>
                <span className="font-bold">{cellTarget?.contrato.locatario_nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dia da Semana:</span>
                <span className="font-bold">{cellTarget?.dia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Prevista:</span>
                <span className="font-bold">
                  {cellTarget?.dateStr ? formatDateDisplay(cellTarget.dateStr) : '-'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="text-muted-foreground font-semibold">Valor a Baixar:</span>
                <span className="font-black text-emerald-600 text-sm">
                  R$ {cellTarget?.valor.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={(val: any) => setFormaPagamento(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX (Instantâneo)</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                  <SelectItem value="cartao">Cartão de Débito / Crédito</SelectItem>
                  <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Esta confirmação mudará o fundo da célula para <strong>VERDE</strong> e lançará a
              entrada no Livro Caixa automaticamente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Confirmar Pagamento e Pintar de Verde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adjust Payment Day */}
      <Dialog open={changeDayModalOpen} onOpenChange={setChangeDayModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Dia de Pagamento</DialogTitle>
            <DialogDescription>
              Mude o dia da semana em que este cliente realiza os pagamentos semanais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground">
              Locatário: <strong>{changeDayTarget?.locatario_nome}</strong>
            </div>

            <div className="space-y-2">
              <Label>Novo Dia da Semana de Pagamento</Label>
              <Select value={newDay} onValueChange={(val: DiaSemana) => setNewDay(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.short} — {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-[11px] text-muted-foreground">
              A partir de agora, o valor semanal desta moto aparecerá na coluna selecionada na
              grade.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeDayModalOpen(false)}
              disabled={savingDay}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNewDay}
              disabled={savingDay}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingDay ? 'Salvando...' : 'Salvar Novo Dia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
