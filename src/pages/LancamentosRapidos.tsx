import React, { useState, useEffect } from 'react'
import {
  Zap,
  Bike,
  CheckCircle2,
  History,
  AlertCircle,
  Calendar,
  FilePlus2,
  ArrowDownRight,
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
import { caixaService } from '@/services/caixa'
import { motosService } from '@/services/motos'
import { categoriasService } from '@/services/categorias'
import { empresaService, sociosService } from '@/services/cadastros'
import { contasAPagarService } from '@/services/contasAPagar'
import { getTodayLocalDate, formatDateDisplay, dateToApiMidday } from '@/lib/dateUtils'
import {
  Moto,
  CaixaLancamento,
  CategoriaGasto,
  FormaPagamento,
  Socio,
  ContaAPagarComProgresso,
  EmpresaConfig,
} from '@/types/database'
import { MotoCardButton } from '@/components/MotoSelectorGrid'
import { ParticipantSelectorGrid, SelectedParticipant } from '@/components/ParticipantSelectorGrid'
import { Users, Building2, User } from 'lucide-react'

interface QuickButtonConfig {
  id: string
  label: string
  emoji: string
  categoriaNome: string
  descricaoPrefix: string
  colorClasses: string
}

// Item 3 — Botões de custo operacionais (Manutenção e Segurança)
const QUICK_BUTTONS_ITEM3: QuickButtonConfig[] = [
  {
    id: 'oleo',
    label: 'ÓLEO',
    emoji: '🛢️',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Óleo',
    // Tom Âmbar / Dourado intenso
    colorClasses:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white border-amber-600 shadow-amber-500/30',
  },
  {
    id: 'freio',
    label: 'FREIO',
    emoji: '🛑',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Freio',
    // Tom Vermelho vibrante
    colorClasses:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border-rose-700 shadow-rose-600/30',
  },
  {
    id: 'kit_relacao',
    label: 'KIT RELAÇÃO',
    emoji: '⛓️',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Kit Relação',
    // Tom Azul / Índigo marcante
    colorClasses:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-blue-700 shadow-blue-600/30',
  },
  {
    id: 'seguro',
    label: 'SEGURO',
    emoji: '🛡️',
    categoriaNome: 'SEGURANÇA',
    descricaoPrefix: 'Seguro',
    // Tom Verde Esmeralda distinto
    colorClasses:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-700 shadow-emerald-600/30',
  },
  {
    id: 'pneu',
    label: 'PNEU',
    emoji: '🛞',
    categoriaNome: 'Manutenção',
    descricaoPrefix: 'Pneu',
    // Tom Roxo/Violeta marcante
    colorClasses:
      'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white border-violet-700 shadow-violet-600/30',
  },
  {
    id: 'bateria',
    label: 'BATERIA',
    emoji: '🔋',
    categoriaNome: 'BATERIA',
    descricaoPrefix: 'Bateria',
    // Tom Amarelo / Âmbar Dourado com alto contraste (energia/bateria)
    colorClasses:
      'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-slate-950 border-yellow-600 shadow-yellow-500/30',
  },
]

// Item 5 — Novos botões de taxas e impostos anuais/legais
const QUICK_BUTTONS_ITEM5: QuickButtonConfig[] = [
  {
    id: 'licenciamento',
    label: 'LICENCIAMENTO',
    emoji: '📄',
    categoriaNome: 'LICENCIAMENTO',
    descricaoPrefix: 'Licenciamento',
    // Tom Ciano / Azul-petróleo marcante
    colorClasses:
      'bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white border-cyan-700 shadow-cyan-600/30',
  },
  {
    id: 'ipva',
    label: 'IPVA',
    emoji: '🏛️',
    categoriaNome: 'IPVA',
    descricaoPrefix: 'IPVA',
    // Tom Laranja vivo / Terracota
    colorClasses:
      'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white border-orange-700 shadow-orange-600/30',
  },
  {
    id: 'bombeiros',
    label: 'BOMBEIROS',
    emoji: '🚒',
    categoriaNome: 'BOMBEIROS',
    descricaoPrefix: 'Taxa Bombeiros',
    // Tom Vermelho escarlate / Carmesim
    colorClasses:
      'bg-red-700 hover:bg-red-800 active:bg-red-900 text-white border-red-800 shadow-red-700/30',
  },
]

export default function LancamentosRapidos() {
  const [motos, setMotos] = useState<Moto[]>([])
  const [selectedMotoId, setSelectedMotoId] = useState<string>('')
  const [precoInput, setPrecoInput] = useState<string>('')
  const [dataInput, setDataInput] = useState<string>(getTodayLocalDate())
  const [observacaoInput, setObservacaoInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [submittingButton, setSubmittingButton] = useState<string | null>(null)
  const [recentLancamentos, setRecentLancamentos] = useState<CaixaLancamento[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null)
  const [socios, setSocios] = useState<Socio[]>([])
  const [contasAPagar, setContasAPagar] = useState<ContaAPagarComProgresso[]>([])

  // Alternador de Destino: 'moto' | 'participante'
  const [destinoTipo, setDestinoTipo] = useState<'moto' | 'participante'>('moto')
  const [selectedParticipant, setSelectedParticipant] = useState<SelectedParticipant | null>(null)
  const [submittingParticipante, setSubmittingParticipante] = useState<boolean>(false)

  // Estado do Modal do Item 6 (OUTROS LANÇAMENTOS - apenas SAÍDAS)
  const [outrosModalOpen, setOutrosModalOpen] = useState<boolean>(false)
  const [outroDescricao, setOutroDescricao] = useState<string>('')
  const [outroCategoria, setOutroCategoria] = useState<string>('')
  const [outroValor, setOutroValor] = useState<number | ''>('')
  const [outroData, setOutroData] = useState<string>(getTodayLocalDate())
  const [outroFormaPagamento, setOutroFormaPagamento] = useState<FormaPagamento>('pix')
  const [outroObservacoes, setOutroObservacoes] = useState<string>('')
  const [submittingOutro, setSubmittingOutro] = useState<boolean>(false)

  const loadData = async () => {
    try {
      const [mList, cList, allCaixa, emp, socList, contList] = await Promise.all([
        motosService.getAll(),
        categoriasService.getAll(),
        caixaService.getAll(),
        empresaService.get(),
        sociosService.getAll(),
        contasAPagarService.getAllWithProgresso(),
      ])
      setEmpresaConfig(emp)
      setSocios(socList)
      setContasAPagar(contList)

      // Excluir motos vendidas/cedidas dos lançamentos rápidos e ordenar por nome
      const sortedMotos = [...mList]
        .filter((m) => m.status !== 'vendida' && m.status !== 'cedida')
        .sort((a, b) => {
          const nameA = (a.nome || a.modelo || a.placa || '').toUpperCase()
          const nameB = (b.nome || b.modelo || b.placa || '').toUpperCase()
          return nameA.localeCompare(nameB)
        })

      setMotos(sortedMotos)
      setCategorias(cList)

      // Filtrar os 10 últimos lançamentos de saída para feedback visual recente
      const quickRecent = allCaixa.filter((c) => c.tipo === 'saida').slice(0, 10)
      setRecentLancamentos(quickRecent)
    } catch (err) {
      console.error('Erro ao carregar dados dos lançamentos rápidos:', err)
      toast.error('Erro ao carregar dados. Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Resolve o nome da categoria para o lançamento sem NUNCA criar categorias no banco:
  // Se existir na lista de categorias da usuária, usa o nome formatado cadastrado;
  // senão, grava com o nome configurado no botão sem criar nada em categorias_gastos.
  const resolveCategoriaNome = (nomeCategoria: string): string => {
    const existing = categorias.find(
      (c) => c.nome.trim().toLowerCase() === nomeCategoria.trim().toLowerCase(),
    )
    return existing ? existing.nome : nomeCategoria
  }

  // Parse do preço aceitando tanto vírgula quanto ponto
  const parsePreco = (str: string): number => {
    if (!str) return 0
    const clean = str.replace(/[^\d.,]/g, '').replace(',', '.')
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : parsed
  }

  const selectedMoto = motos.find((m) => m.id === selectedMotoId)
  const valorNumerico = parsePreco(precoInput)
  const isFormReady =
    destinoTipo === 'moto'
      ? Boolean(selectedMotoId && valorNumerico > 0)
      : Boolean(selectedParticipant && valorNumerico > 0)

  // Nome da empresa cadastrada
  const nomeEmpresaDisplay = empresaConfig?.nome_empresa?.trim() || 'Empresa'

  // Identificação do participante selecionado
  const selectedSocioObj =
    selectedParticipant?.tipo === 'socia' && selectedParticipant.socioId
      ? socios.find((s) => s.id === selectedParticipant.socioId)
      : null
  const selectedContaObj =
    selectedParticipant?.tipo === 'terceiros' && selectedParticipant.contaAPagarId
      ? contasAPagar.find((c) => c.id === selectedParticipant.contaAPagarId)
      : null

  const getParticipantDisplayName = () => {
    if (!selectedParticipant) return ''
    if (selectedParticipant.tipo === 'empresa') return nomeEmpresaDisplay
    if (selectedParticipant.tipo === 'socia') {
      return selectedSocioObj?.nome ? `Sócio: ${selectedSocioObj.nome}` : 'Sócios (Geral)'
    }
    if (selectedParticipant.tipo === 'terceiros') {
      return selectedContaObj?.credor ? `Terceiro: ${selectedContaObj.credor}` : 'Terceiros (Geral)'
    }
    return ''
  }

  const handleOpenOutrosLancamentos = () => {
    if (destinoTipo === 'moto' && !selectedMotoId) {
      toast.error('Selecione primeiro a Moto (no item 1) antes de abrir Outros Lançamentos!')
      return
    }
    if (destinoTipo === 'participante' && !selectedParticipant) {
      toast.error(
        'Selecione primeiro o Participante (no item 1) antes de abrir Outros Lançamentos!',
      )
      return
    }

    if (destinoTipo === 'moto') {
      setOutroDescricao('')
      setOutroCategoria(categorias[0]?.nome || '')
    } else {
      const pName = getParticipantDisplayName()
      setOutroDescricao(
        observacaoInput.trim() ? `${observacaoInput.trim()} — ${pName}` : `Despesa — ${pName}`,
      )
      // Para outras entidades, seleciona a primeira categoria cadastrada caso exista, ou permite escolher
      setOutroCategoria(categorias[0]?.nome || '')
    }

    setOutroValor(valorNumerico > 0 ? valorNumerico : '')
    setOutroData(dataInput || getTodayLocalDate())
    setOutroFormaPagamento('pix')
    setOutroObservacoes(observacaoInput || '')
    setOutrosModalOpen(true)
  }

  const handleSubmitOutroLancamento = async (e: React.FormEvent) => {
    e.preventDefault()

    if (destinoTipo === 'moto' && !selectedMotoId) {
      toast.error('Nenhuma moto selecionada!')
      return
    }
    if (destinoTipo === 'participante' && !selectedParticipant) {
      toast.error('Nenhum participante selecionado!')
      return
    }

    if (!outroDescricao.trim()) {
      toast.error('Informe a descrição do lançamento!')
      return
    }

    const valorFinal = typeof outroValor === 'number' ? outroValor : parsePreco(String(outroValor))
    if (!valorFinal || valorFinal <= 0) {
      toast.error('Informe um valor válido maior que zero!')
      return
    }

    const catFinal = outroCategoria.trim() === 'Sem categoria' ? '' : outroCategoria.trim()
    const safeData = outroData || getTodayLocalDate()
    const safeDataMidday = dateToApiMidday(safeData)

    setSubmittingOutro(true)
    try {
      const payload: any = {
        tipo: 'saida',
        descricao: outroDescricao.trim(),
        categoria: catFinal,
        valor: valorFinal,
        data: safeDataMidday,
        forma_pagamento: outroFormaPagamento,
      }

      let targetLabel = ''
      if (destinoTipo === 'moto') {
        payload.moto = selectedMotoId
        payload.entidade = ''
        payload.socio = ''
        payload.conta_a_pagar = ''
        payload.observacoes = outroObservacoes.trim() || undefined
        targetLabel = selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'
      } else if (selectedParticipant) {
        payload.moto = ''
        payload.entidade = selectedParticipant.tipo
        payload.socio =
          selectedParticipant.tipo === 'socia' ? selectedParticipant.socioId || '' : ''
        payload.conta_a_pagar =
          selectedParticipant.tipo === 'terceiros' ? selectedParticipant.contaAPagarId || '' : ''

        let obs = outroObservacoes.trim()
          ? `Lançado via Outros Lançamentos: ${outroObservacoes.trim()}`
          : 'Lançado via Outros Lançamentos'
        if (selectedParticipant.tipo === 'socia' && selectedSocioObj?.nome) {
          obs += ` (Sócio: ${selectedSocioObj.nome})`
        } else if (selectedParticipant.tipo === 'terceiros' && selectedContaObj?.credor) {
          obs += ` (Terceiro: ${selectedContaObj.credor})`
        }
        payload.observacoes = obs
        targetLabel = getParticipantDisplayName()
      }

      const createdEntry = await caixaService.create(payload)

      const valorFormatado = valorFinal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      toast.success(`Saída de R$ ${valorFormatado} registrada no caixa de ${targetLabel}!`, {
        duration: 4000,
      })

      // Limpar campos e fechar modal
      setOutroDescricao('')
      setOutroValor('')
      setOutroObservacoes('')
      setOutrosModalOpen(false)

      // Também limpar o preço e observação da tela principal prontos para o próximo
      setPrecoInput('')
      setDataInput(getTodayLocalDate())
      setObservacaoInput('')

      // Atualizar lista rápida de recentes
      setRecentLancamentos((prev) => [
        {
          ...createdEntry,
          expand: {
            moto: destinoTipo === 'moto' ? selectedMoto : undefined,
            socio: selectedSocioObj || undefined,
            conta_a_pagar: selectedContaObj || undefined,
          },
        },
        ...prev.slice(0, 9),
      ])
    } catch (err) {
      console.error('Erro ao registrar outro lançamento de saída:', err)
      toast.error('Não foi possível gravar o lançamento. Tente novamente.')
    } finally {
      setSubmittingOutro(false)
    }
  }

  // Lançamento livre direto para Participante
  const handleLancarParticipante = async () => {
    if (!selectedParticipant) {
      toast.error('Selecione primeiro o participante (Empresa, Sócio ou Terceiro)!')
      return
    }

    if (valorNumerico <= 0) {
      toast.error('Informe o PREÇO/VALOR antes de lançar!')
      return
    }

    const pName = getParticipantDisplayName()
    const safeDataMidday = dateToApiMidday(dataInput || getTodayLocalDate())
    const obsTrimmed = observacaoInput.trim()

    setSubmittingParticipante(true)
    try {
      const descFinal = obsTrimmed
        ? `${obsTrimmed} — ${pName}`
        : selectedParticipant.tipo === 'empresa'
          ? `Despesa Geral — ${pName}`
          : selectedParticipant.tipo === 'socia'
            ? `Retirada / Pró-labore — ${pName}`
            : `Pagamento Dívida — ${pName}`

      const catFinal =
        selectedParticipant.tipo === 'empresa'
          ? 'Despesa Empresa'
          : selectedParticipant.tipo === 'socia'
            ? 'Retirada Sócio'
            : 'Pagamento Terceiro'

      const payload: any = {
        moto: '',
        entidade: selectedParticipant.tipo,
        socio: selectedParticipant.tipo === 'socia' ? selectedParticipant.socioId || '' : '',
        conta_a_pagar:
          selectedParticipant.tipo === 'terceiros' ? selectedParticipant.contaAPagarId || '' : '',
        tipo: 'saida',
        descricao: descFinal,
        categoria: catFinal,
        valor: valorNumerico,
        data: safeDataMidday,
        forma_pagamento: 'pix',
        observacoes: obsTrimmed
          ? `Lançado via Lançamento Saídas: ${obsTrimmed}`
          : `Lançado via Lançamento Saídas (${pName})`,
      }

      const createdEntry = await caixaService.create(payload)

      const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      toast.success(`Saída de R$ ${valorFormatado} lançada no caixa de ${pName}!`, {
        duration: 4000,
      })

      // Limpar campos
      setPrecoInput('')
      setDataInput(getTodayLocalDate())
      setObservacaoInput('')

      // Atualizar lista rápida de recentes
      setRecentLancamentos((prev) => [
        {
          ...createdEntry,
          expand: {
            socio: selectedSocioObj || undefined,
            conta_a_pagar: selectedContaObj || undefined,
          },
        },
        ...prev.slice(0, 9),
      ])
    } catch (err) {
      console.error('Erro ao lançar saída de participante:', err)
      toast.error('Erro ao registrar saída de participante. Tente novamente.')
    } finally {
      setSubmittingParticipante(false)
    }
  }

  const handleQuickLaunch = async (btn: QuickButtonConfig) => {
    if (!selectedMotoId) {
      toast.error('Selecione primeiro a Moto (pelo Nome)!')
      return
    }

    if (valorNumerico <= 0) {
      toast.error('Informe o PREÇO antes de lançar!')
      return
    }

    const motoNomeDisplay = selectedMoto?.nome?.trim() || selectedMoto?.modelo?.trim() || 'Moto'

    setSubmittingButton(btn.id)

    try {
      // 1. Categoria: usa nome existente se houver, ou fallback em texto sem criar nada no banco
      const categoriaFinal = resolveCategoriaNome(btn.categoriaNome)

      // 2. Descrição no padrão pedido: "Óleo — {nome da moto}" ou "Óleo — {nome da moto} — {observação}"
      const obsTrimmed = observacaoInput.trim()
      const descricaoLancamento = obsTrimmed
        ? `${btn.descricaoPrefix} — ${motoNomeDisplay} — ${obsTrimmed}`
        : `${btn.descricaoPrefix} — ${motoNomeDisplay}`

      // 3. Data selecionada (padrão hoje ou outra escolhida)
      const dataLancamento = dataInput || getTodayLocalDate()

      const createdEntry = await caixaService.create({
        moto: selectedMotoId,
        tipo: 'saida',
        descricao: descricaoLancamento,
        categoria: categoriaFinal,
        valor: valorNumerico,
        data: dataLancamento,
        forma_pagamento: 'pix',
        observacoes: obsTrimmed
          ? `Lançado via Lançamentos Rápidos: ${obsTrimmed}`
          : 'Lançado via Lançamentos Rápidos',
      })

      // 4. Feedback imediato ao usuário (toast claro e vibrante)
      const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

      toast.success(`${btn.label} — R$ ${valorFormatado} lançado no caixa da ${motoNomeDisplay}!`, {
        duration: 4000,
      })

      // 5. Limpar campos de preço e observação e redefinir data para 'hoje' prontos para o próximo lançamento
      setPrecoInput('')
      setDataInput(getTodayLocalDate())
      setObservacaoInput('')

      // 6. Atualizar lista rápida de recentes
      setRecentLancamentos((prev) => [
        {
          ...createdEntry,
          expand: { moto: selectedMoto },
        },
        ...prev.slice(0, 9),
      ])
    } catch (err) {
      console.error('Erro ao registrar lançamento rápido:', err)
      toast.error('Não foi possível gravar o lançamento. Tente novamente.')
    } finally {
      setSubmittingButton(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            LANÇAMENTO SAÍDAS
          </h1>
          <p className="text-sm text-muted-foreground">
            Lançamento instantâneo de saídas no Fluxo de Caixa em 1 toque.
          </p>
        </div>
      </div>

      {/* Cartão Principal de Operação */}
      <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                {destinoTipo === 'moto' ? (
                  <>
                    <Bike className="w-5 h-5 text-blue-600" />
                    1. Escolha a Moto (pelo Nome)
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 text-indigo-600" />
                    1. Escolha o Participante
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {destinoTipo === 'moto'
                  ? 'A despesa será vinculada diretamente à moto escolhida no livro caixa.'
                  : 'Despesas vinculadas a Empresa, Sócios (retiradas) ou Terceiros (contas a pagar).'}
              </CardDescription>
            </div>

            {/* Alternador de Destino: Moto vs Outros Participantes */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDestinoTipo('moto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  destinoTipo === 'moto'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                MOTOS
              </button>
              <button
                type="button"
                onClick={() => setDestinoTipo('participante')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  destinoTipo === 'participante'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                OUTROS PARTICIPANTES
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* SEÇÃO 1: Grade de Motos OU Seletor de Participantes */}
          {destinoTipo === 'moto' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Toque na moto desejada *
                </Label>
                {selectedMoto && (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Escolhida:{' '}
                    {selectedMoto.nome?.trim() || selectedMoto.modelo?.trim() || selectedMoto.placa}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  Carregando motos...
                </div>
              ) : motos.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  Nenhuma moto cadastrada.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {motos.map((m) => (
                    <MotoCardButton
                      key={m.id}
                      moto={m}
                      isSelected={selectedMotoId === m.id}
                      onClick={() => setSelectedMotoId(m.id)}
                    />
                  ))}
                </div>
              )}

              {!selectedMotoId && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Toque em uma moto acima para liberar os botões de lançamento.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Escolha o participante vinculado à despesa *
                </Label>
                {selectedParticipant && (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {getParticipantDisplayName()}
                  </span>
                )}
              </div>

              <ParticipantSelectorGrid
                nomeEmpresa={nomeEmpresaDisplay}
                socios={socios}
                contasAPagar={contasAPagar}
                selectedParticipant={selectedParticipant}
                onSelectParticipant={(p) => setSelectedParticipant(p)}
              />
            </div>
          )}

          {/* 2. Bloco PREÇO + DATA (lado a lado na mesma linha) */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campo de PREÇO */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="precoInput"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    2. Preço (R$) *
                  </Label>
                  {valorNumerico > 0 && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      R${' '}
                      {valorNumerico.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">
                    R$
                  </div>
                  <Input
                    id="precoInput"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={precoInput}
                    onChange={(e) => setPrecoInput(e.target.value)}
                    className="pl-12 h-12 sm:h-14 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                {valorNumerico <= 0 && (
                  <p className="text-xs text-muted-foreground">
                    Digite o valor antes de tocar no botão de lançamento.
                  </p>
                )}
              </div>

              {/* Data do Lançamento (ao lado do Preço) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="dataInput"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Data
                  </Label>
                  <div className="flex items-center gap-1.5">
                    {dataInput === getTodayLocalDate() ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                      >
                        Hoje ({formatDateDisplay(getTodayLocalDate())})
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDataInput(getTodayLocalDate())}
                        className="h-6 px-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        Voltar para Hoje
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                  <Button
                    type="button"
                    variant={dataInput === getTodayLocalDate() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDataInput(getTodayLocalDate())}
                    className={`h-12 sm:h-14 px-3 sm:px-4 font-bold text-sm ${
                      dataInput === getTodayLocalDate()
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Hoje
                  </Button>
                  <Input
                    id="dataInput"
                    type="date"
                    value={dataInput}
                    onChange={(e) => setDataInput(e.target.value)}
                    className="h-12 sm:h-14 text-sm sm:text-base font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Padrão <strong>Hoje</strong>. Altere se for data retroativa.
                </p>
              </div>
            </div>
          </div>

          {/* SEÇÃO DE BOTÕES RÁPIDOS (SOMENTE PARA MOTO) OU BOTÃO DE LANÇAMENTO (PARTICIPANTE) */}
          {destinoTipo === 'moto' ? (
            <>
              {/* 3. Os Botões Rápidos (Ação Final para Confirmar o Lançamento) */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    3. Toque no Botão para Lançar
                  </Label>
                  <span className="text-xs text-muted-foreground">Ação de lançamento por moto</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {QUICK_BUTTONS_ITEM3.map((btn) => {
                    const isThisLoading = submittingButton === btn.id
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        disabled={!isFormReady || submittingButton !== null}
                        onClick={() => handleQuickLaunch(btn)}
                        className={`h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center gap-1 p-3 border-2 transition-all select-none ${
                          !isFormReady
                            ? 'opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                            : `${btn.colorClasses} shadow-md hover:shadow-lg active:scale-95 cursor-pointer`
                        }`}
                      >
                        {isThisLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            <span className="text-sm font-bold text-white">Lançando...</span>
                          </div>
                        ) : (
                          <>
                            <span
                              className="text-2xl sm:text-3xl filter drop-shadow-sm leading-none"
                              role="img"
                              aria-label={btn.label}
                            >
                              {btn.emoji}
                            </span>
                            <span className="text-base sm:text-lg font-black uppercase tracking-wide leading-tight">
                              {btn.label}
                            </span>
                            <span
                              className={`text-[11px] font-medium leading-none ${
                                !isFormReady ? 'text-slate-400' : 'text-white/85'
                              }`}
                            >
                              {btn.categoriaNome}
                            </span>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. Campo de OBSERVAÇÃO (item 4, após os botões, raramente usado) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="observacaoInput"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    4. Observação{' '}
                    <span className="font-normal text-muted-foreground">
                      (opcional — também serve para os botões do item 5)
                    </span>
                  </Label>
                  {observacaoInput.trim() && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                      Acrescenta após o nome da moto
                    </span>
                  )}
                </div>

                <Input
                  id="observacaoInput"
                  type="text"
                  placeholder="Ex: troca com filtro, dianteiro, traseiro..."
                  value={observacaoInput}
                  onChange={(e) => setObservacaoInput(e.target.value)}
                  maxLength={100}
                  className="h-10 text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              {/* 5. Novos Botões: LICENCIAMENTO, IPVA e BOMBEIROS */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    5. Licenciamento, IPVA e Bombeiros
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Usa o Preço (item 2), Data (item 2) e Observação (item 4)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {QUICK_BUTTONS_ITEM5.map((btn) => {
                    const isThisLoading = submittingButton === btn.id
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        disabled={!isFormReady || submittingButton !== null}
                        onClick={() => handleQuickLaunch(btn)}
                        className={`h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center gap-1 p-3 border-2 transition-all select-none ${
                          !isFormReady
                            ? 'opacity-35 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                            : `${btn.colorClasses} shadow-md hover:shadow-lg active:scale-95 cursor-pointer`
                        }`}
                      >
                        {isThisLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            <span className="text-sm font-bold text-white">Lançando...</span>
                          </div>
                        ) : (
                          <>
                            <span
                              className="text-2xl sm:text-3xl filter drop-shadow-sm leading-none"
                              role="img"
                              aria-label={btn.label}
                            >
                              {btn.emoji}
                            </span>
                            <span className="text-base sm:text-lg font-black uppercase tracking-wide leading-tight">
                              {btn.label}
                            </span>
                            <span
                              className={`text-[11px] font-medium leading-none ${
                                !isFormReady ? 'text-slate-400' : 'text-white/85'
                              }`}
                            >
                              {btn.categoriaNome}
                            </span>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            /* BLOC O PARA OUTROS PARTICIPANTES: Botão de Lançar Saída Direta */
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Campo de Descrição / Observação para a saída do participante */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="observacaoInputParticipante"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Descrição / Motivo da Saída{' '}
                  <span className="font-normal text-muted-foreground">
                    (ex: Retirada de sócio, Conta de luz, Dívida fornecedor)
                  </span>
                </Label>
                <Input
                  id="observacaoInputParticipante"
                  type="text"
                  placeholder="Ex: Retirada de lucros, Parcela Honda, Material escritório..."
                  value={observacaoInput}
                  onChange={(e) => setObservacaoInput(e.target.value)}
                  maxLength={100}
                  className="h-11 text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              {isFormReady && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                  <span className="font-bold text-indigo-900 dark:text-indigo-100 block">
                    Ao confirmar será gerada no Fluxo de Caixa:
                  </span>
                  <div className="flex items-center justify-between text-red-600 font-bold text-sm">
                    <span>Saída ({getParticipantDisplayName()}):</span>
                    <span>
                      - R${' '}
                      {valorNumerico.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Os botões rápidos de manutenção de moto (óleo, freio etc.) ficam ocultos para
                    participantes.
                  </p>
                </div>
              )}

              <Button
                type="button"
                disabled={!isFormReady || submittingParticipante}
                onClick={handleLancarParticipante}
                className={`w-full h-14 text-lg font-black uppercase tracking-wider shadow-lg transition-all ${
                  !isFormReady || submittingParticipante
                    ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500'
                    : 'bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white shadow-red-500/20'
                }`}
              >
                {submittingParticipante ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>LANÇANDO SAÍDA...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <ArrowDownRight className="w-5 h-5" />
                    <span>LANÇAR SAÍDA NO CAIXA</span>
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* 6. OUTROS LANÇAMENTOS (abre modal tradicional sendo apenas SAÍDAS) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                6. Lançamento Detalhado
              </Label>
              <span className="text-xs text-muted-foreground">Apenas saídas</span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleOpenOutrosLancamentos}
              className="w-full h-14 sm:h-16 text-base font-black tracking-wide uppercase border-2 border-slate-300 dark:border-slate-700 hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-slate-800 dark:text-slate-100 rounded-2xl gap-2.5 shadow-sm transition-all"
            >
              <FilePlus2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              OUTROS LANÇAMENTOS
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Abre as caixas de lançamento tradicionais (descrição, categoria, valor, data etc.)
              sendo apenas <strong>SAÍDAS</strong> vinculadas a{' '}
              {destinoTipo === 'moto' ? 'uma moto' : 'um participante'}.
            </p>
          </div>

          {/* Status / Orientações */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>
              <strong>Data do lançamento:</strong>{' '}
              {formatDateDisplay(dataInput || getTodayLocalDate())}
              {dataInput === getTodayLocalDate() ? ' (Hoje)' : ''}
            </span>
            <span>
              <strong>Tipo:</strong> Saída
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Histórico Recente de Lançamentos Rápidos */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Últimas Saídas Registradas no Caixa
          </CardTitle>
          <CardDescription className="text-xs">
            Mostra os lançamentos mais recentes para conferência rápida. Para editar ou excluir,
            acesse o menu Fluxo de Caixa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLancamentos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma saída recente encontrada no caixa.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLancamentos.slice(0, 5).map((item) => {
                const motoItem = item.expand?.moto || motos.find((m) => m.id === item.moto)
                const socioItem =
                  item.expand?.socio ||
                  (item.socio ? socios.find((s) => s.id === item.socio) : undefined)
                const contaItem =
                  item.expand?.conta_a_pagar ||
                  (item.conta_a_pagar
                    ? contasAPagar.find((c) => c.id === item.conta_a_pagar)
                    : undefined)

                let destinoLabel = 'Geral'
                if (motoItem) {
                  destinoLabel = motoItem.nome || motoItem.modelo || 'Moto'
                  if (motoItem.placa) destinoLabel += ` (${motoItem.placa})`
                } else if (item.entidade === 'empresa') {
                  destinoLabel = nomeEmpresaDisplay
                } else if (item.entidade === 'socia') {
                  destinoLabel = socioItem?.nome ? `Sócio: ${socioItem.nome}` : 'Sócio'
                } else if (item.entidade === 'terceiros') {
                  destinoLabel = contaItem?.credor ? `Terceiro: ${contaItem.credor}` : 'Terceiro'
                }

                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.descricao}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateDisplay(item.data)} • {destinoLabel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className="text-xs font-bold text-red-600 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30"
                      >
                        - R${' '}
                        {Number(item.valor).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Item 6: OUTROS LANÇAMENTOS (Apenas SAÍDAS) */}
      <Dialog open={outrosModalOpen} onOpenChange={setOutrosModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <ArrowDownRight className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">
                  OUTROS LANÇAMENTOS — Nova Saída
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Registro de despesa tradicional no Fluxo de Caixa vinculada ao destino
                  selecionado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {destinoTipo === 'moto' && selectedMoto && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Moto vinculada:
                </span>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {selectedMoto.nome?.trim() || selectedMoto.modelo?.trim() || selectedMoto.placa}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
              >
                Apenas Saída (Custo)
              </Badge>
            </div>
          )}

          {destinoTipo === 'participante' && selectedParticipant && (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Participante vinculado:
                </span>
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                  {getParticipantDisplayName()}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
              >
                Apenas Saída (Custo)
              </Badge>
            </div>
          )}

          <form onSubmit={handleSubmitOutroLancamento} className="space-y-4">
            {/* Descrição do Lançamento */}
            <div className="space-y-2">
              <Label htmlFor="outroDesc">Descrição do Lançamento *</Label>
              <Input
                id="outroDesc"
                placeholder="Ex: Troca de guidão, Guincho, Manete, Lavagem..."
                value={outroDescricao}
                onChange={(e) => setOutroDescricao(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Categoria (posicionado após a Descrição) */}
            <div className="space-y-2">
              <Label htmlFor="outroCategoriaSelect">
                Categoria {categorias.length > 0 ? '*' : '(opcional)'}
              </Label>
              {categorias.length === 0 ? (
                <div className="space-y-1.5">
                  <Input
                    id="outroCategoriaSelect"
                    placeholder="Sem categorias cadastradas (opcional)"
                    value={outroCategoria}
                    onChange={(e) => setOutroCategoria(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Nenhuma categoria cadastrada em Cadastros. Você pode digitar ou seguir sem
                    categorizar.
                  </p>
                </div>
              ) : (
                <Select value={outroCategoria} onValueChange={setOutroCategoria}>
                  <SelectTrigger id="outroCategoriaSelect">
                    <SelectValue placeholder="Selecione a categoria de saída" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="Sem categoria">(Sem categoria)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Valor e Data lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="outroValorInput">Valor (R$) *</Label>
                <Input
                  id="outroValorInput"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={outroValor}
                  onChange={(e) =>
                    setOutroValor(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outroDataInput">Data *</Label>
                <Input
                  id="outroDataInput"
                  type="date"
                  value={outroData}
                  onChange={(e) => setOutroData(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="outroFormaSelect">Forma de Pagamento</Label>
              <Select
                value={outroFormaPagamento}
                onValueChange={(val: FormaPagamento) => setOutroFormaPagamento(val)}
              >
                <SelectTrigger id="outroFormaSelect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="outroObs">Observações / Detalhes (opcional)</Label>
              <Input
                id="outroObs"
                placeholder="Ex: Nota fiscal 1234, fornecedor Oficina Central..."
                value={outroObservacoes}
                onChange={(e) => setOutroObservacoes(e.target.value)}
                maxLength={150}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOutrosModalOpen(false)}
                disabled={submittingOutro}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingOutro}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {submittingOutro ? 'Gravando Saída...' : 'Confirmar Saída no Caixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
