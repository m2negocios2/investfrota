import React, { useState, useEffect } from 'react'
import {
  FileUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Upload,
  RefreshCw,
  Bike,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { motosService } from '@/services/motos'
import { contratosService } from '@/services/contratos'
import { infracoesService } from '@/services/infracoes'
import { caixaService } from '@/services/caixa'
import { categoriasService } from '@/services/categorias'
import { Moto, Contrato, Infracao, CaixaLancamento, CategoriaGasto } from '@/types/database'
import {
  readExcelFile,
  parseControleMotosWorkbook,
  parseControleInfracoesWorkbook,
  MotosPreviewResult,
  InfracoesPreviewResult,
  normalizePlaca,
  normalizeMotoName,
} from '@/lib/importerUtils'
import { formatDateDisplay } from '@/lib/dateUtils'

export default function Importar() {
  const { isProprietario } = useAuth()

  // Base de dados existente para detecção de duplicidade
  const [existingMotos, setExistingMotos] = useState<Moto[]>([])
  const [existingContratos, setExistingContratos] = useState<Contrato[]>([])
  const [existingInfracoes, setExistingInfracoes] = useState<Infracao[]>([])
  const [existingCaixa, setExistingCaixa] = useState<CaixaLancamento[]>([])
  const [existingCategorias, setExistingCategorias] = useState<CategoriaGasto[]>([])
  const [loadingBase, setLoadingBase] = useState(true)

  // Estado do Arquivo 1: CONTROLE Motos
  const [motosFile, setMotosFile] = useState<File | null>(null)
  const [analyzingMotos, setAnalyzingMotos] = useState(false)
  const [motosPreview, setMotosPreview] = useState<MotosPreviewResult | null>(null)
  const [importingMotos, setImportingMotos] = useState(false)
  const [motosImportProgress, setMotosImportProgress] = useState(0)
  const [motosSummary, setMotosSummary] = useState<{
    motosCriadas: number
    motosAtualizadas: number
    contratosCriados: number
    contratosPulados: number
    caixaCriados: number
    caixaPulados: number
  } | null>(null)

  // Estado do Arquivo 2: CONTROLE INFRAÇÕES
  const [infracoesFile, setInfracoesFile] = useState<File | null>(null)
  const [analyzingInfracoes, setAnalyzingInfracoes] = useState(false)
  const [infracoesPreview, setInfracoesPreview] = useState<InfracoesPreviewResult | null>(null)
  const [importingInfracoes, setImportingInfracoes] = useState(false)
  const [infracoesImportProgress, setInfracoesImportProgress] = useState(0)
  const [infracoesSummary, setInfracoesSummary] = useState<{
    criadas: number
    puladas: number
  } | null>(null)

  // Carrega base de dados para reconciliação
  const loadDatabase = async () => {
    setLoadingBase(true)
    try {
      const [m, ct, inf, cx, cat] = await Promise.all([
        motosService.getAll(),
        contratosService.getAll(),
        infracoesService.getAll(),
        caixaService.getAll(),
        categoriasService.getAll(),
      ])
      setExistingMotos(m)
      setExistingContratos(ct)
      setExistingInfracoes(inf)
      setExistingCaixa(cx)
      setExistingCategorias(cat)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao consultar dados atuais do sistema')
    } finally {
      setLoadingBase(false)
    }
  }

  useEffect(() => {
    loadDatabase()
  }, [])

  // Apenas proprietário tem acesso
  if (!isProprietario) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Acesso Restrito</h2>
        <p className="text-sm text-muted-foreground">
          Apenas a Proprietária do sistema pode acessar o importador de planilhas.
        </p>
      </div>
    )
  }

  // =========================================================================
  // ANALISAR CONTROLE Motos
  // =========================================================================
  const handleAnalyzeMotos = async () => {
    if (!motosFile) {
      toast.error('Selecione o arquivo da planilha CONTROLE Motos (.xlsx)')
      return
    }
    setAnalyzingMotos(true)
    setMotosSummary(null)
    try {
      const wb = await readExcelFile(motosFile)
      const preview = parseControleMotosWorkbook(
        wb,
        existingMotos,
        existingContratos,
        existingCaixa,
      )
      setMotosPreview(preview)
      toast.success(
        `Análise concluída: ${preview.motos.length} motos e ${preview.caixaLancamentos.length} lançamentos identificados.`,
      )
    } catch (err) {
      console.error(err)
      toast.error('Erro ao ler a planilha CONTROLE Motos. Verifique o formato do arquivo.')
    } finally {
      setAnalyzingMotos(false)
    }
  }

  // =========================================================================
  // IMPORTAR CONTROLE Motos
  // =========================================================================
  const handleImportMotos = async () => {
    if (!motosPreview) return
    setImportingMotos(true)
    setMotosImportProgress(0)

    let motosCriadas = 0
    let motosAtualizadas = 0
    let contratosCriados = 0
    let contratosPulados = 0
    let caixaCriados = 0
    let caixaPulados = 0

    try {
      // 1. Processar Motos
      const mapMotoIdPorNomeOuPlaca: Record<string, string> = {}
      // Mapeia motos já existentes
      existingMotos.forEach((m) => {
        if (m.placa) mapMotoIdPorNomeOuPlaca[normalizePlaca(m.placa)] = m.id
        if (m.nome) mapMotoIdPorNomeOuPlaca[normalizeMotoName(m.nome)] = m.id
      })

      const totalItems =
        motosPreview.motos.length +
        motosPreview.contratos.length +
        motosPreview.caixaLancamentos.length
      let processedCount = 0

      for (const mItem of motosPreview.motos) {
        try {
          if (mItem.existingId) {
            // Moto já existe: NÃO sobrescrever o que o usuário já preencheu (ex: caso da FAN)
            // Preenche apenas campos vazios/zerados
            const cur = existingMotos.find((x) => x.id === mItem.existingId)
            const patch: Partial<Moto> = {}
            if (cur) {
              if (!cur.valor_compra && mItem.valor_compra) patch.valor_compra = mItem.valor_compra
              if (!cur.data_compra && mItem.data_compra) patch.data_compra = mItem.data_compra
              if (!cur.km_atual && mItem.km_atual) patch.km_atual = mItem.km_atual
              if (!cur.valor_semanal && mItem.valor_semanal) {
                patch.valor_semanal = mItem.valor_semanal
                patch.valor_diario = Math.round((mItem.valor_semanal / 7) * 100) / 100
              }
              if (Object.keys(patch).length > 0) {
                await motosService.update(cur.id, patch)
                motosAtualizadas++
              }
            }
            if (mItem.placa) mapMotoIdPorNomeOuPlaca[normalizePlaca(mItem.placa)] = mItem.existingId
            if (mItem.nome)
              mapMotoIdPorNomeOuPlaca[normalizeMotoName(mItem.nome)] = mItem.existingId
          } else {
            // Moto nova: criar no PocketBase
            const valorSemanalFinal = mItem.valor_semanal || 250
            const created = await motosService.create({
              nome: mItem.nome,
              placa: mItem.placa || `SEM-PLACA-${Date.now().toString().slice(-4)}`,
              modelo: mItem.modelo || mItem.nome,
              ano: mItem.ano || 2026,
              cor: mItem.cor || 'PRETA',
              tipo_locacao_padrao: 'normal',
              status: 'disponivel',
              valor_semanal: valorSemanalFinal,
              valor_diario: Math.round((valorSemanalFinal / 7) * 100) / 100,
              valor_compra: mItem.valor_compra,
              data_compra: mItem.data_compra,
              km_atual: mItem.km_atual || 0,
            })
            motosCriadas++
            if (created.placa) mapMotoIdPorNomeOuPlaca[normalizePlaca(created.placa)] = created.id
            if (created.nome) mapMotoIdPorNomeOuPlaca[normalizeMotoName(created.nome)] = created.id
          }
        } catch (mErr) {
          console.warn('Aviso ao processar moto:', mErr)
        }
        processedCount++
        setMotosImportProgress(Math.round((processedCount / totalItems) * 100))
      }

      // 2. Processar Contratos
      for (const cItem of motosPreview.contratos) {
        if (cItem.status !== 'NOVO') {
          contratosPulados++
          processedCount++
          setMotosImportProgress(Math.round((processedCount / totalItems) * 100))
          continue
        }

        const normId =
          normalizePlaca(cItem.motoIdentificador) || normalizeMotoName(cItem.motoIdentificador)
        const targetMotoId = mapMotoIdPorNomeOuPlaca[normId] || existingMotos[0]?.id

        if (targetMotoId) {
          try {
            await contratosService.create({
              moto: targetMotoId,
              locatario_nome: cItem.locatario_nome,
              tipo: cItem.tipo,
              valor_diario: cItem.valor_diario,
              valor_semanal: cItem.valor_semanal,
              data_inicio: cItem.data_inicio || '',
              dia_pagamento_semana: cItem.dia_pagamento_semana || 'SEG',
              status: 'ativo',
              observacoes: `Importado de planilha: ${cItem.sheetName}`,
            })
            contratosCriados++
          } catch (cErr) {
            console.warn('Aviso ao importar contrato:', cErr)
          }
        }
        processedCount++
        setMotosImportProgress(Math.round((processedCount / totalItems) * 100))
      }

      // 3. Processar Lançamentos de Caixa
      for (const cxItem of motosPreview.caixaLancamentos) {
        if (cxItem.status !== 'NOVO') {
          caixaPulados++
          processedCount++
          setMotosImportProgress(Math.round((processedCount / totalItems) * 100))
          continue
        }

        const normId =
          normalizePlaca(cxItem.motoIdentificador) || normalizeMotoName(cxItem.motoIdentificador)
        const targetMotoId = mapMotoIdPorNomeOuPlaca[normId] || existingMotos[0]?.id

        if (targetMotoId) {
          try {
            await caixaService.create({
              moto: targetMotoId,
              tipo: cxItem.tipo,
              descricao: cxItem.descricao,
              categoria: cxItem.categoria,
              valor: cxItem.valor,
              data: cxItem.data,
              forma_pagamento: 'pix',
              observacoes: cxItem.observacoes,
            })
            caixaCriados++
          } catch (cxErr) {
            console.warn('Aviso ao importar caixa:', cxErr)
          }
        }
        processedCount++
        setMotosImportProgress(Math.round((processedCount / totalItems) * 100))
      }

      setMotosSummary({
        motosCriadas,
        motosAtualizadas,
        contratosCriados,
        contratosPulados,
        caixaCriados,
        caixaPulados,
      })
      toast.success('Importação de CONTROLE Motos concluída!')
      await loadDatabase()
    } catch (err) {
      console.error(err)
      toast.error('Erro durante a gravação dos dados')
    } finally {
      setImportingMotos(false)
      setMotosImportProgress(100)
    }
  }

  // =========================================================================
  // ANALISAR CONTROLE INFRAÇÕES
  // =========================================================================
  const handleAnalyzeInfracoes = async () => {
    if (!infracoesFile) {
      toast.error('Selecione o arquivo da planilha CONTROLE INFRAÇÕES (.xlsx)')
      return
    }
    setAnalyzingInfracoes(true)
    setInfracoesSummary(null)
    try {
      const wb = await readExcelFile(infracoesFile)
      const preview = parseControleInfracoesWorkbook(wb, existingMotos, existingInfracoes)
      setInfracoesPreview(preview)
      toast.success(`Análise concluída: ${preview.infracoes.length} infrações encontradas.`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao ler a planilha CONTROLE INFRAÇÕES.')
    } finally {
      setAnalyzingInfracoes(false)
    }
  }

  // =========================================================================
  // IMPORTAR CONTROLE INFRAÇÕES
  // =========================================================================
  const handleImportInfracoes = async () => {
    if (!infracoesPreview) return
    setImportingInfracoes(true)
    setInfracoesImportProgress(0)

    let criadas = 0
    let puladas = 0

    try {
      const total = infracoesPreview.infracoes.length
      let count = 0

      // Mapeia motos por sufixo ou placa normalizada
      const mapMoto = (identificador: string): string => {
        const norm = normalizePlaca(identificador)
        const nameNorm = normalizeMotoName(identificador)
        const found = existingMotos.find((m) => {
          const mPlaca = normalizePlaca(m.placa)
          const mNome = normalizeMotoName(m.nome || m.modelo)
          if (mPlaca.endsWith(norm) || mPlaca === norm) return true
          if (mNome === nameNorm || mNome.includes(nameNorm) || nameNorm.includes(mNome))
            return true
          return false
        })
        return found?.id || existingMotos[0]?.id || ''
      }

      for (const item of infracoesPreview.infracoes) {
        if (item.status !== 'NOVO') {
          puladas++
          count++
          setInfracoesImportProgress(Math.round((count / total) * 100))
          continue
        }

        const motoId = mapMoto(item.motoIdentificador)
        if (motoId) {
          try {
            await infracoesService.create({
              moto: motoId,
              numero: item.numero,
              data: item.data,
              codigo_multa: item.codigo_multa,
              valor: item.valor,
              cliente: item.cliente,
              status_pagamento: item.status_pagamento,
              deu_entrada_detran: item.deu_entrada_detran,
              prazo: item.prazo,
              observacao: item.observacao,
            })
            criadas++
          } catch (infErr) {
            console.warn('Aviso ao gravar infração:', infErr)
          }
        }
        count++
        setInfracoesImportProgress(Math.round((count / total) * 100))
      }

      setInfracoesSummary({ criadas, puladas })
      toast.success('Importação de infrações concluída com sucesso!')
      await loadDatabase()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gravar infrações')
    } finally {
      setImportingInfracoes(false)
      setInfracoesImportProgress(100)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Importador de Planilhas
            </h1>
            <Badge
              variant="outline"
              className="border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300"
            >
              Exclusivo Proprietária
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Puxe os dados de suas planilhas Excel (.xlsx) e preencha o sistema com proteção
            anti-duplicidade.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadDatabase}
          disabled={loadingBase}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loadingBase ? 'animate-spin' : ''}`} />
          Recarregar Base
        </Button>
      </div>

      {/* Regra de Ouro / Banner Informativo */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-950 dark:text-blue-100">
          <p className="font-bold">Proteção Anti-Duplicidade e Preservação de Dados</p>
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
            • <strong>Cuidado especial com a moto FAN e motos já cadastradas:</strong> se a moto já
            existir, o sistema preenche apenas campos que estiverem vazios e{' '}
            <em>nunca sobrescreve</em> o que você já digitou.
            <br />• <strong>Idempotência:</strong> você pode analisar e importar o mesmo arquivo
            quantas vezes precisar; itens repetidos (mesma moto, mesma multa ou mesmo lançamento)
            serão automaticamente detectados e pulados.
          </p>
        </div>
      </div>

      {/* 2 Cartões Principais: CONTROLE Motos e CONTROLE INFRAÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* =================================================================== */}
        {/* CARD 1: CONTROLE Motos */}
        {/* =================================================================== */}
        <Card className="shadow-sm border-t-4 border-t-blue-600 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base font-bold">1. CONTROLE Motos</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Motos (compra, valor, km, ano), contratos de clientes e custos recorrentes / extrato
              da frota.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-2">
              <Upload className="w-8 h-8 mx-auto text-slate-400" />
              <div>
                <label className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700">
                  <span>{motosFile ? motosFile.name : 'Selecionar arquivo .xlsx'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setMotosFile(e.target.files[0])
                        setMotosPreview(null)
                        setMotosSummary(null)
                      }
                    }}
                  />
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Planilha "CONTROLE Motos" com abas por moto (J60, FAN, CROSS, etc.)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleAnalyzeMotos}
                disabled={!motosFile || analyzingMotos || importingMotos}
                variant="outline"
                className="flex-1 text-xs h-9"
              >
                {analyzingMotos ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  'Analisar Planilha'
                )}
              </Button>

              <Button
                onClick={handleImportMotos}
                disabled={!motosPreview || importingMotos}
                className="flex-1 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {importingMotos ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Gravando {motosImportProgress}%
                  </>
                ) : (
                  'Importar Dados'
                )}
              </Button>
            </div>

            {importingMotos && (
              <div className="space-y-1">
                <Progress value={motosImportProgress} className="h-2" />
                <p className="text-[10px] text-right text-muted-foreground">
                  {motosImportProgress}% concluído
                </p>
              </div>
            )}

            {/* Resumo da Análise */}
            {motosPreview && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-xs space-y-2 border">
                <span className="font-bold block text-slate-800 dark:text-slate-200">
                  Prévia da Análise:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Motos</span>
                    <span className="font-bold text-sm text-blue-600">
                      {motosPreview.stats.totalMotosNovas} novas
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({motosPreview.stats.totalMotosExistentes} existentes)
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Contratos</span>
                    <span className="font-bold text-sm text-emerald-600">
                      {motosPreview.stats.totalContratosNovos} novos
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({motosPreview.stats.totalContratosPulados} pulados)
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Lançamentos</span>
                    <span className="font-bold text-sm text-purple-600">
                      {motosPreview.stats.totalCaixaNovos} novos
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({motosPreview.stats.totalCaixaPulados} pulados)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo Final Pós-Importação */}
            {motosSummary && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Importação de Motos Finalizada!
                </p>
                <p>
                  • Motos: <strong>{motosSummary.motosCriadas}</strong> criadas,{' '}
                  <strong>{motosSummary.motosAtualizadas}</strong> atualizadas (campos vazios).
                  <br />• Contratos: <strong>{motosSummary.contratosCriados}</strong> criados,{' '}
                  <strong>{motosSummary.contratosPulados}</strong> pulados por duplicação.
                  <br />• Caixa: <strong>{motosSummary.caixaCriados}</strong> lançamentos
                  registrados, <strong>{motosSummary.caixaPulados}</strong> pulados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* =================================================================== */}
        {/* CARD 2: CONTROLE INFRAÇÕES */}
        {/* =================================================================== */}
        <Card className="shadow-sm border-t-4 border-t-red-600 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-red-600" />
              <CardTitle className="text-base font-bold">2. CONTROLE INFRAÇÕES</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Autos de infração por moto (J60, FAN, CROSSER, A91, B71, G51, G61, G71, G91), valores
              e quitações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-2">
              <Upload className="w-8 h-8 mx-auto text-slate-400" />
              <div>
                <label className="cursor-pointer text-sm font-semibold text-red-600 hover:text-red-700">
                  <span>{infracoesFile ? infracoesFile.name : 'Selecionar arquivo .xlsx'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setInfracoesFile(e.target.files[0])
                        setInfracoesPreview(null)
                        setInfracoesSummary(null)
                      }
                    }}
                  />
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Planilha "CONTROLE INFRAÇÕES" com abas por moto e totais
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleAnalyzeInfracoes}
                disabled={!infracoesFile || analyzingInfracoes || importingInfracoes}
                variant="outline"
                className="flex-1 text-xs h-9"
              >
                {analyzingInfracoes ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  'Analisar Planilha'
                )}
              </Button>

              <Button
                onClick={handleImportInfracoes}
                disabled={!infracoesPreview || importingInfracoes}
                className="flex-1 text-xs h-9 bg-red-600 hover:bg-red-700 text-white"
              >
                {importingInfracoes ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Gravando {infracoesImportProgress}%
                  </>
                ) : (
                  'Importar Infrações'
                )}
              </Button>
            </div>

            {importingInfracoes && (
              <div className="space-y-1">
                <Progress value={infracoesImportProgress} className="h-2" />
                <p className="text-[10px] text-right text-muted-foreground">
                  {infracoesImportProgress}% concluído
                </p>
              </div>
            )}

            {/* Resumo da Análise */}
            {infracoesPreview && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-xs space-y-2 border">
                <span className="font-bold block text-slate-800 dark:text-slate-200">
                  Prévia da Análise:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Novas</span>
                    <span className="font-bold text-sm text-red-600">
                      {infracoesPreview.stats.totalNovas}
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Já Cadastradas</span>
                    <span className="font-bold text-sm text-slate-500">
                      {infracoesPreview.stats.totalPuladas}
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border">
                    <span className="text-[10px] text-muted-foreground block">Situação</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      {infracoesPreview.stats.totalPagas} pagas
                    </span>
                    <span className="text-[10px] text-amber-600 block">
                      {infracoesPreview.stats.totalPendentes} pendentes
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo Final Pós-Importação */}
            {infracoesSummary && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Importação de Infrações Finalizada!
                </p>
                <p>
                  • <strong>{infracoesSummary.criadas}</strong> novas infrações cadastradas.
                  <br />• <strong>{infracoesSummary.puladas}</strong> infrações puladas por já
                  existirem no sistema.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* TABELAS DE PRÉVIA DETALHADAS */}
      {/* ===================================================================== */}
      {(motosPreview || infracoesPreview) && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Detalhamento dos Dados Identificados
            </CardTitle>
            <CardDescription className="text-xs">
              Confira os registros antes de confirmar a importação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={motosPreview ? 'motos_tab' : 'infracoes_tab'}>
              <TabsList className="mb-4">
                {motosPreview && (
                  <>
                    <TabsTrigger value="motos_tab" className="text-xs">
                      Motos ({motosPreview.motos.length})
                    </TabsTrigger>
                    <TabsTrigger value="contratos_tab" className="text-xs">
                      Contratos ({motosPreview.contratos.length})
                    </TabsTrigger>
                    <TabsTrigger value="caixa_tab" className="text-xs">
                      Caixa ({motosPreview.caixaLancamentos.length})
                    </TabsTrigger>
                  </>
                )}
                {infracoesPreview && (
                  <TabsTrigger value="infracoes_tab" className="text-xs">
                    Infrações ({infracoesPreview.infracoes.length})
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Tabela de Motos */}
              {motosPreview && (
                <TabsContent value="motos_tab">
                  <div className="border rounded-lg overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b">
                        <tr>
                          <th className="p-2 text-left font-semibold">Aba</th>
                          <th className="p-2 text-left font-semibold">Nome</th>
                          <th className="p-2 text-left font-semibold">Placa</th>
                          <th className="p-2 text-left font-semibold">Modelo</th>
                          <th className="p-2 text-right font-semibold">Valor Compra</th>
                          <th className="p-2 text-right font-semibold">Aluguel Semanal</th>
                          <th className="p-2 text-center font-semibold">Ano</th>
                          <th className="p-2 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {motosPreview.motos.map((m) => (
                          <tr key={m.key} className="hover:bg-slate-50/50">
                            <td className="p-2 font-mono text-slate-500">{m.sheetName}</td>
                            <td className="p-2 font-bold">{m.nome}</td>
                            <td className="p-2 font-mono font-semibold">{m.placa || '-'}</td>
                            <td className="p-2 text-muted-foreground">{m.modelo}</td>
                            <td className="p-2 text-right font-mono">
                              {m.valor_compra
                                ? `R$ ${m.valor_compra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-blue-600">
                              {m.valor_semanal
                                ? `R$ ${m.valor_semanal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                            <td className="p-2 text-center">{m.ano}</td>
                            <td className="p-2 text-center">
                              {m.status === 'NOVO' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                  NOVO
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-blue-700 border-blue-300"
                                >
                                  JÁ EXISTE — PREENCHER VAZIOS
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              )}

              {/* Tabela de Contratos */}
              {motosPreview && (
                <TabsContent value="contratos_tab">
                  <div className="border rounded-lg overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b">
                        <tr>
                          <th className="p-2 text-left font-semibold">Aba</th>
                          <th className="p-2 text-left font-semibold">Moto</th>
                          <th className="p-2 text-left font-semibold">Locatário</th>
                          <th className="p-2 text-right font-semibold">Valor Semanal</th>
                          <th className="p-2 text-center font-semibold">Tipo</th>
                          <th className="p-2 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {motosPreview.contratos.map((ct) => (
                          <tr key={ct.key} className="hover:bg-slate-50/50">
                            <td className="p-2 font-mono text-slate-500">{ct.sheetName}</td>
                            <td className="p-2 font-semibold">{ct.motoIdentificador}</td>
                            <td className="p-2">{ct.locatario_nome}</td>
                            <td className="p-2 text-right font-mono font-bold">
                              R${' '}
                              {ct.valor_semanal.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2 text-center capitalize">
                              {ct.tipo.replace('_', ' ')}
                            </td>
                            <td className="p-2 text-center">
                              {ct.status === 'NOVO' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                  NOVO
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  JÁ EXISTE — PULADO
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              )}

              {/* Tabela de Caixa */}
              {motosPreview && (
                <TabsContent value="caixa_tab">
                  <div className="border rounded-lg overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b">
                        <tr>
                          <th className="p-2 text-left font-semibold">Aba</th>
                          <th className="p-2 text-left font-semibold">Moto</th>
                          <th className="p-2 text-center font-semibold">Data</th>
                          <th className="p-2 text-left font-semibold">Descrição</th>
                          <th className="p-2 text-left font-semibold">Categoria</th>
                          <th className="p-2 text-right font-semibold">Valor</th>
                          <th className="p-2 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {motosPreview.caixaLancamentos.map((cx) => (
                          <tr key={cx.key} className="hover:bg-slate-50/50">
                            <td className="p-2 font-mono text-slate-500">{cx.sheetName}</td>
                            <td className="p-2 font-semibold">{cx.motoIdentificador}</td>
                            <td className="p-2 text-center">{formatDateDisplay(cx.data)}</td>
                            <td className="p-2">{cx.descricao}</td>
                            <td className="p-2 text-muted-foreground">{cx.categoria}</td>
                            <td
                              className={`p-2 text-right font-mono font-bold ${
                                cx.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {cx.tipo === 'entrada' ? '+' : '-'} R${' '}
                              {cx.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-center">
                              {cx.status === 'NOVO' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                  NOVO
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  JÁ EXISTE — PULADO
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              )}

              {/* Tabela de Infrações */}
              {infracoesPreview && (
                <TabsContent value="infracoes_tab">
                  <div className="border rounded-lg overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b">
                        <tr>
                          <th className="p-2 text-left font-semibold">Aba</th>
                          <th className="p-2 text-left font-semibold">Moto</th>
                          <th className="p-2 text-center font-semibold">#</th>
                          <th className="p-2 text-left font-semibold">Código Auto</th>
                          <th className="p-2 text-center font-semibold">Data</th>
                          <th className="p-2 text-right font-semibold">Valor</th>
                          <th className="p-2 text-left font-semibold">Cliente</th>
                          <th className="p-2 text-center font-semibold">Situação</th>
                          <th className="p-2 text-center font-semibold">Status Importação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {infracoesPreview.infracoes.map((inf) => (
                          <tr key={inf.key} className="hover:bg-slate-50/50">
                            <td className="p-2 font-mono text-slate-500">{inf.sheetName}</td>
                            <td className="p-2 font-semibold">{inf.motoIdentificador}</td>
                            <td className="p-2 text-center">{inf.numero || '-'}</td>
                            <td className="p-2 font-mono">{inf.codigo_multa || '-'}</td>
                            <td className="p-2 text-center">
                              {inf.data ? formatDateDisplay(inf.data) : '-'}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-red-600">
                              R$ {inf.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-muted-foreground">{inf.cliente || '-'}</td>
                            <td className="p-2 text-center">
                              <Badge
                                variant={inf.status_pagamento === 'paga' ? 'default' : 'outline'}
                                className={`text-[10px] ${
                                  inf.status_pagamento === 'paga'
                                    ? 'bg-emerald-600 hover:bg-emerald-600'
                                    : 'border-amber-400 text-amber-700'
                                }`}
                              >
                                {inf.status_pagamento === 'paga' ? 'Paga' : 'Pendente'}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              {inf.status === 'NOVO' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                  NOVO
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  JÁ EXISTE — PULADO
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
