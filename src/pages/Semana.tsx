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

  // Referência do dia de hoje para identificar semana atual e mês atual
  const today = useMemo(() => new Date(), [])
  const todayISO = useMemo(() => getISOWeekNumber(today), [today])
  const currentMonth = today.getMonth() // 0-11
  const currentYear = today.getFullYear()

  // Ao entrar na tela aparece sempre o mês atual
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

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
    weekCode: string
  } | null>(null)
  const [formaPagamento, setFormaPagamento] = useState<
    'pix' | 'dinheiro' | 'cartao' | 'transferencia'
  >('pix')

  // Change Day Modal
  const [changeDayModalOpen, setChangeDayModalOpen] = useState(false)
  const [changeDayTarget, setChangeDayTarget] = useState<Contrato | null>(null)
  const [newDay, setNewDay] = useState<DiaSemana>('SEG')
  const [savingDay, setSavingDay] = useState(false)

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

  // Regra de atribuição de uma semana (Segunda a Domingo) a um Mês/Ano:
  // - Uma semana começa sempre na Segunda-feira e termina no Domingo.
  // - A semana pertence ao mês M se o mês M contém a maioria dos seus dias (>= 4 dias),
  //   o que equivale exatamente ao dia de Quinta-feira (4º dia da semana) pertencer ao mês M.
  //   - Se a segunda-feira for 29, 30 ou 31/dezembro:
  //     * 29/12: Seg 29, Ter 30, Qua 31 (3 dias dez), Qui 1, Sex 2, Sab 3, Dom 4 (4 dias jan) -> Qui é jan!
  //       MAS a usuária exigiu explicitamente:
  //       "Dezembro/2025: 5 semanas (segundas 1, 8, 15, 22, 29 — a semana que começa em 29/12 tem 3 dias em dezembro e CONTA como semana de dezembro)."
  //       "Agosto/2026: 4 semanas (a semana que começa em 31/08 tem apenas 1 dia em agosto e NÃO conta como semana de agosto, e deve aparecer como primeira semana de setembro/2026)."
  //   - Portanto, a regra exata e consistente especificada é:
  //     Uma semana (Seg a Dom) pertence ao mês onde ela tem pelo menos 3 dias (ou seja, se começou no mês anterior mas tem >= 4 dias no mês seguinte, passa para o mês seguinte; e se começou no mês mas tem apenas 1 ou 2 dias no mês, passa para o mês seguinte; com 3 ou mais dias no mês, ela é retida como semana daquele mês).
  //     Formalmente para qualquer semana com início em Monday (d_mon):
  //     Quantos dias dessa semana caem no mês de início (M)?
  //     Se d_mon tem >= 3 dias em M (ou seja, d_mon <= último_dia - 2), a semana pertence ao mês de d_mon!
  //     Se d_mon tem apenas 1 ou 2 dias em M (ou seja, d_mon = último_dia ou último_dia - 1), a semana é descartada de M e pertence ao mês seguinte (M+1)!

  // Helper que determina para qual mês/ano operacional uma semana (pela sua segunda-feira) pertence:
  const getAssignedMonthForMonday = (monday: Date): { year: number; month: number } => {
    const y = monday.getUTCFullYear()
    const m = monday.getUTCMonth()
    const d = monday.getUTCDate()
    const daysInM = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
    const daysInThisMonth = daysInM - d + 1 // número de dias da semana (1 a 7) que caem no mês m

    // Se tem menos de 3 dias no mês m (ou seja, 1 ou 2 dias: segunda-feira caiu em dia 30 num mês de 31 dias, ou dia 31, etc.):
    // pertence ao mês seguinte!
    if (daysInThisMonth < 3) {
      if (m === 11) {
        return { year: y + 1, month: 0 }
      }
      return { year: y, month: m + 1 }
    }

    return { year: y, month: m }
  }

  // Calcula TODAS as semanas do mês selecionado.
  // Regra de negócio:
  // - Outubro/2025: 4 semanas (segundas 6, 13, 20, 27).
  // - Novembro/2025: 4 semanas (segundas 3, 10, 17, 24).
  // - Dezembro/2025: 5 semanas (segundas 1, 8, 15, 22, 29).
  // - Agosto/2026: 4 semanas (segundas 3, 10, 17, 24 — a de 31/08 vai para setembro/2026).
  // - Setembro/2026: primeira semana começa em 31/08/2026.
  const monthWeeks = useMemo(() => {
    // Para encontrar todas as semanas atribuídas a (selectedYear, selectedMonth):
    // As semanas possíveis podem ter sua segunda-feira:
    // 1) Nos últimos dias do mês anterior (se essa semana teve < 3 dias no mês anterior, passando para este mês)
    // 2) Durante o próprio selectedMonth (desde que tenha >= 3 dias neste mês)
    const assignedMondays: {
      date: Date
      iso: { year: number; week: number; code: string }
    }[] = []

    // 1) Verificar segundas-feiras no final do mês anterior (últimos 7 dias do mês anterior)
    const prevMonthDate = new Date(Date.UTC(selectedYear, selectedMonth, 0)) // último dia do mês anterior
    const lastDayPrevMonth = prevMonthDate.getUTCDate()
    const prevMonthYear = prevMonthDate.getUTCFullYear()
    const prevMonthIndex = prevMonthDate.getUTCMonth()

    for (let d = Math.max(1, lastDayPrevMonth - 6); d <= lastDayPrevMonth; d++) {
      const cur = new Date(Date.UTC(prevMonthYear, prevMonthIndex, d))
      if (cur.getUTCDay() === 1) {
        // É uma segunda-feira no mês anterior. Verifica se pertence a selectedMonth
        const assigned = getAssignedMonthForMonday(cur)
        if (assigned.year === selectedYear && assigned.month === selectedMonth) {
          assignedMondays.push({
            date: cur,
            iso: getISOWeekNumber(cur),
          })
        }
      }
    }

    // 2) Verificar segundas-feiras no mês atual
    const daysInCurrentMonth = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0)).getUTCDate()
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const cur = new Date(Date.UTC(selectedYear, selectedMonth, d))
      if (cur.getUTCDay() === 1) {
        const assigned = getAssignedMonthForMonday(cur)
        if (assigned.year === selectedYear && assigned.month === selectedMonth) {
          assignedMondays.push({
            date: cur,
            iso: getISOWeekNumber(cur),
          })
        }
      }
    }

    // Ordenar cronologicamente as segundas-feiras atribuídas a este mês
    assignedMondays.sort((a, b) => a.date.getTime() - b.date.getTime())

    const items = assignedMondays.map((m, index) => {
      const isCurrent = m.iso.code === todayISO.code
      return {
        year: m.iso.year,
        week: m.iso.week,
        code: m.iso.code,
        isCurrent,
        monthName: NOMES_MESES[selectedMonth],
        monthYear: selectedYear,
        weekOfMonth: index + 1,
        mondayDate: m.date,
      }
    })

    // Ordenação de exibição: se uma das semanas for a semana atual, ela é destacada no topo;
    // as demais semanas seguem embaixo na ordem cronológica (SEMANA 1, 2, ...).
    const hasCurrent = items.some((item) => item.isCurrent)
    if (hasCurrent) {
      return [...items].sort((a, b) => {
        if (a.isCurrent) return -1
        if (b.isCurrent) return 1
        return a.weekOfMonth - b.weekOfMonth
      })
    }

    return items
  }, [selectedYear, selectedMonth, todayISO.code])

  // Função auxiliar para filtrar contratos ativos para uma semana específica
  const getActiveContratosForWeek = (weekStartStr: string, weekEndStr: string) => {
    return contratos.filter((c) => {
      if (c.status !== 'ativo') return false
      const inicio = c.data_inicio ? c.data_inicio.split('T')[0] : ''
      if (inicio && inicio > weekEndStr) return false
      if (c.data_entrega) {
        const fim = c.data_entrega.split('T')[0]
        if (fim && fim < weekStartStr) return false
      }
      return true
    })
  }

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
      weekCode,
    })
    setPaymentModalOpen(true)
  }

  // Confirm payment in modal
  const handleConfirmPayment = async () => {
    if (!cellTarget) return
    try {
      const todayStr = getTodayLocalDate()
      const weekCode = cellTarget.weekCode

      if (cellTarget.recebimento) {
        // Update existing recebimento to 'pago' and register in caixa
        await recebimentosService.marcarComoPago(
          cellTarget.recebimento.id,
          cellTarget.moto.id,
          cellTarget.valor,
          cellTarget.contrato.locatario_nome,
          formaPagamento,
          todayStr,
          cellTarget.contrato.id,
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
          cellTarget.contrato.id,
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

  // Navigation handlers: MUDAR APENAS O MÊS
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const handleGoToCurrentMonth = () => {
    setSelectedMonth(currentMonth)
    setSelectedYear(currentYear)
  }

  const isCurrentMonthSelected = selectedMonth === currentMonth && selectedYear === currentYear

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Painel SEMANA
            </h1>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-bold text-xs"
            >
              {NOMES_MESES[selectedMonth]} {selectedYear}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Grade operacional semanal: veja os dias de pagamento de cada moto, dê baixa e ajuste
            datas.
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToCurrentMonth}
            disabled={isCurrentMonthSelected}
            className="text-xs font-semibold gap-1 h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mês Atual ({NOMES_MESES[currentMonth].slice(0, 3)}/{currentYear})
          </Button>

          <div className="flex items-center border rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-none border-r"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-xs font-bold font-mono uppercase">
              {NOMES_MESES[selectedMonth]} / {selectedYear}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-none border-l"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigPercentual(!showConfigPercentual)}
            className="text-xs gap-1.5 h-8"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Cores:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              Verde: Já Pagou
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              Neutro: Pendente
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 border border-rose-600 inline-block" />
            <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
              Vermelho: Em Atraso
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
          <span>💡 Toque no valor para dar baixa/estornar; toque no nome para ajustar o dia.</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {monthWeeks.length} semanas em {NOMES_MESES[selectedMonth]}
          </span>
        </div>
      </div>

      {/* TODAS AS SEMANAS DO MÊS */}
      <div className="space-y-4">
        {monthWeeks.map((weekInfo) => {
          const isCurrentBlock = weekInfo.isCurrent
          const weekDates = getWeekDates(weekInfo.year, weekInfo.week)
          const weekStartStr = weekDates['SEG'].dateStr
          const weekEndStr = weekDates['DOM'].dateStr

          // Contratos ativos específicos desta semana
          const activeContratosThisWeek = getActiveContratosForWeek(weekStartStr, weekEndStr)

          // Totais diários e totais gerais da semana
          const dailyTotals: { [key in DiaSemana]: number } = {
            SEG: 0,
            TER: 0,
            QUA: 0,
            QUI: 0,
            SEX: 0,
            SAB: 0,
            DOM: 0,
          }

          activeContratosThisWeek.forEach((contrato) => {
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
              className={`shadow-sm overflow-hidden border transition-all ${
                isCurrentBlock
                  ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Week Block Header:
                  1. "MES: SEMANA 1 A 5" (ex.: MAIO: SEMANA 3)
                  2. Em letra pequena a semana do ano (ex.: Semana 21 do ano)
                  3. Semana atual com selo "SEMANA ATUAL"
                  4. Totais bruto/líquido apenas no rodapé
              */}
              <div
                className={`px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b ${
                  isCurrentBlock
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {/* MES: SEMANA 1 A 5 */}
                  <span
                    className={`font-black text-xs tracking-wide px-2 py-0.5 rounded shadow-sm ${
                      isCurrentBlock
                        ? 'bg-blue-900/60 text-white border border-blue-400/30'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {weekInfo.monthName}: SEMANA {weekInfo.weekOfMonth}
                  </span>

                  {/* Badge da semana atual */}
                  {isCurrentBlock && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[10px] px-1.5 py-0 uppercase tracking-wider"
                    >
                      Semana Atual
                    </Badge>
                  )}
                </div>

                {/* Em letra pequena a semana do ano */}
                <div
                  className={`text-[10px] sm:text-[11px] font-medium ${
                    isCurrentBlock ? 'text-blue-100' : 'text-muted-foreground dark:text-slate-400'
                  }`}
                >
                  Semana {weekInfo.week} do ano ({weekInfo.year}) •{' '}
                  {weekDates['SEG'].dateStr.split('-').slice(1).reverse().join('/')} a{' '}
                  {weekDates['DOM'].dateStr.split('-').slice(1).reverse().join('/')}
                </div>
              </div>

              {/* TABLE CONTAINER: Compacto para caber na tela sem scroll horizontal */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-[11px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px]">
                      <th className="p-1 sm:p-1.5 text-left font-bold text-slate-700 dark:text-slate-200 w-[24%] sm:w-[22%] border-r border-slate-200 dark:border-slate-700">
                        <div className="truncate font-mono">
                          <span className="text-blue-600 dark:text-blue-400 font-black text-[10px] mr-1">
                            S{weekInfo.week}
                          </span>
                          <span>MOTO</span>
                        </div>
                      </th>
                      {DIAS_SEMANA.map((d) => (
                        <th
                          key={d.key}
                          className="p-0.5 sm:p-1 text-center font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 w-[9%] sm:w-[9.5%]"
                        >
                          <div className="font-black text-slate-900 dark:text-white uppercase text-[10px] leading-tight">
                            {d.short}
                          </div>
                          <div className="text-[9px] text-muted-foreground font-normal leading-tight hidden xs:block">
                            {weekDates[d.key].dateStr.split('-')[2]}
                          </div>
                        </th>
                      ))}
                      <th className="p-1 text-right font-bold text-slate-700 dark:text-slate-200 w-[13%] sm:w-[11.5%] bg-slate-100/60 dark:bg-slate-800/40 text-[10px]">
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {activeContratosThisWeek.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-xs text-muted-foreground">
                          Nenhuma moto com contrato ativo nesta semana.
                        </td>
                      </tr>
                    ) : (
                      activeContratosThisWeek.map((contrato) => {
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

                        return (
                          <tr
                            key={contrato.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            {/* Moto Column (Left) */}
                            <td className="p-1 sm:p-1.5 font-bold border-r border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChangeDayTarget(contrato)
                                    setNewDay(diaPgto)
                                    setChangeDayModalOpen(true)
                                  }}
                                  className="text-left font-bold text-blue-700 dark:text-blue-300 hover:underline truncate text-[11px] flex items-center gap-0.5 group"
                                  title="Clique para ajustar o dia da semana desta moto"
                                >
                                  <span className="truncate">{moto.nome || moto.modelo}</span>
                                  <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-60 flex-shrink-0" />
                                </button>
                                <span className="font-mono text-[9px] text-muted-foreground px-1 py-0 bg-slate-100 dark:bg-slate-800 rounded flex-shrink-0">
                                  {diaPgto}
                                </span>
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate font-normal leading-tight">
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
                                    className="p-0.5 text-center border-r border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-700 bg-slate-50/20 text-[10px]"
                                  >
                                    —
                                  </td>
                                )
                              }

                              const cellDateStr = weekDates[d.key].dateStr
                              const cellState = getCellStatus(contrato, weekInfo.code, cellDateStr)

                              // Cores compactas e legíveis
                              let cellClasses =
                                'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:border-blue-400'
                              let titleText = 'Pendente (Clique para registrar pagamento)'

                              if (cellState.status === 'pago') {
                                cellClasses =
                                  'bg-emerald-500 hover:bg-emerald-600 text-white font-black border border-emerald-600 shadow-sm'
                                titleText = 'Pago! (Clique para estornar se necessário)'
                              } else if (cellState.status === 'atraso') {
                                cellClasses =
                                  'bg-rose-500 hover:bg-rose-600 text-white font-black border border-rose-600 shadow-sm animate-pulse'
                                titleText = 'Em atraso! (Clique para registrar recebimento)'
                              }

                              return (
                                <td
                                  key={d.key}
                                  className="p-0.5 text-center border-r border-slate-200 dark:border-slate-700"
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
                                    className={`w-full py-1 px-0.5 rounded text-[11px] transition-all flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 leading-none ${cellClasses}`}
                                  >
                                    <span className="font-extrabold text-[11px] sm:text-xs leading-none">
                                      {valorSemanal.toFixed(0)}
                                    </span>
                                    <span className="text-[8px] opacity-90 leading-tight tracking-tighter">
                                      {cellState.status === 'pago'
                                        ? 'PAGO'
                                        : cellState.status === 'atraso'
                                          ? 'ATRASO'
                                          : 'PEND'}
                                    </span>
                                  </button>
                                </td>
                              )
                            })}

                            {/* Total Weekly Contract Value */}
                            <td className="p-1 sm:p-1.5 text-right font-extrabold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/20 font-mono text-[11px]">
                              {valorSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>

                  {/* FOOTER: TOTALS BRUTO & LÍQUIDO */}
                  <tfoot>
                    {/* First Line: Valor Bruto a Receber por Dia */}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                      <td className="p-1 sm:p-1.5 text-left border-r border-slate-300 dark:border-slate-600 font-extrabold text-[10px] sm:text-[11px] truncate">
                        TOTAL (BRUTO)
                      </td>
                      {DIAS_SEMANA.map((d) => (
                        <td
                          key={d.key}
                          className="p-0.5 sm:p-1 text-center border-r border-slate-300 dark:border-slate-600 font-extrabold text-[10px] sm:text-[11px] text-slate-900 dark:text-white font-mono"
                        >
                          {dailyTotals[d.key] > 0
                            ? dailyTotals[d.key].toLocaleString('pt-BR', {
                                minimumFractionDigits: 0,
                              })
                            : '—'}
                        </td>
                      ))}
                      <td className="p-1 sm:p-1.5 text-right font-black text-[11px] sm:text-xs text-slate-900 dark:text-white font-mono bg-slate-200/60 dark:bg-slate-700/60">
                        R$ {totalBrutoSemana.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </td>
                    </tr>

                    {/* Second Line: Valor Líquido (70% ou configurado) */}
                    <tr className="bg-blue-50/70 dark:bg-blue-950/40 font-bold border-t border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100">
                      <td className="p-1 sm:p-1.5 text-left border-r border-blue-200 dark:border-blue-800 font-extrabold text-[10px] sm:text-[11px] truncate flex items-center justify-between">
                        <span className="truncate">LÍQUIDO ({percentualLiquido}%)</span>
                        <TrendingUp className="w-2.5 h-2.5 text-blue-600 flex-shrink-0 ml-0.5" />
                      </td>
                      {DIAS_SEMANA.map((d) => {
                        const liqVal = dailyTotals[d.key] * (percentualLiquido / 100)
                        return (
                          <td
                            key={d.key}
                            className="p-0.5 sm:p-1 text-center border-r border-blue-200 dark:border-blue-800 font-extrabold text-[9px] sm:text-[10px] font-mono"
                          >
                            {liqVal > 0
                              ? liqVal.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                              : '—'}
                          </td>
                        )
                      })}
                      <td className="p-1 sm:p-1.5 text-right font-black text-[11px] sm:text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/60">
                        R${' '}
                        {totalLiquidoSemana.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )
        })}
      </div>

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
