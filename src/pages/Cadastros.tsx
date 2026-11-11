import React, { useState, useEffect } from 'react'
import {
  Building2,
  Users,
  Tags,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  FolderPlus,
  Info,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ExportarBancoDialog } from '@/components/ExportarBancoDialog'
import { empresaService, sociosService } from '@/services/cadastros'
import { categoriasService } from '@/services/categorias'
import { EmpresaConfig, Socio, CategoriaGasto } from '@/types/database'

export default function Cadastros() {
  const [activeTab, setActiveTab] = useState('empresa')

  // ---------------------------------------------------------
  // 1. ESTADO: EMPRESA
  // ---------------------------------------------------------
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState('M2 Gestão de Motos')
  const [empresaDocumento, setEmpresaDocumento] = useState('')
  const [empresaTelefone, setEmpresaTelefone] = useState('')
  const [empresaEmail, setEmpresaEmail] = useState('')
  const [empresaObs, setEmpresaObs] = useState('')
  const [savingEmpresa, setSavingEmpresa] = useState(false)

  // ---------------------------------------------------------
  // 2. ESTADO: SÓCIOS
  // ---------------------------------------------------------
  const [socios, setSocios] = useState<Socio[]>([])
  const [loadingSocios, setLoadingSocios] = useState(true)
  const [socioModalOpen, setSocioModalOpen] = useState(false)
  const [editingSocioId, setEditingSocioId] = useState<string | null>(null)
  const [socioNome, setSocioNome] = useState('')
  const [socioFuncao, setSocioFuncao] = useState('')
  const [socioParticipacao, setSocioParticipacao] = useState('')
  const [socioTelefone, setSocioTelefone] = useState('')
  const [socioEmail, setSocioEmail] = useState('')
  const [socioObs, setSocioObs] = useState('')
  const [submittingSocio, setSubmittingSocio] = useState(false)
  const [deleteSocioModalOpen, setDeleteSocioModalOpen] = useState(false)
  const [socioToDelete, setSocioToDelete] = useState<Socio | null>(null)

  // ---------------------------------------------------------
  // 3. ESTADO: CATEGORIAS DE GASTOS (TRANSFERIDAS PARA CÁ)
  // ---------------------------------------------------------
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catDescricao, setCatDescricao] = useState('')
  const [submittingCat, setSubmittingCat] = useState(false)
  const [deleteCatModalOpen, setDeleteCatModalOpen] = useState(false)
  const [catToDelete, setCatToDelete] = useState<CategoriaGasto | null>(null)

  // Carregamento inicial
  useEffect(() => {
    loadEmpresa()
    loadSocios()
    loadCategorias()
  }, [])

  const loadEmpresa = async () => {
    try {
      const data = await empresaService.get()
      if (data) {
        setEmpresa(data)
        setNomeEmpresa(data.nome_empresa || 'M2 Gestão de Motos')
        setEmpresaDocumento(data.documento || '')
        setEmpresaTelefone(data.telefone || '')
        setEmpresaEmail(data.email || '')
        setEmpresaObs(data.observacoes || '')
      }
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err)
    }
  }

  const loadSocios = async () => {
    setLoadingSocios(true)
    try {
      const data = await sociosService.getAll()
      setSocios(data)
    } catch (err) {
      console.error('Erro ao carregar sócios:', err)
      toast.error('Erro ao carregar lista de sócios')
    } finally {
      setLoadingSocios(false)
    }
  }

  const loadCategorias = async () => {
    setLoadingCategorias(true)
    try {
      const data = await categoriasService.getAll()
      setCategorias(data)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
      toast.error('Erro ao carregar categorias de gastos')
    } finally {
      setLoadingCategorias(false)
    }
  }

  // ---------------------------------------------------------
  // HANDLERS: EMPRESA
  // ---------------------------------------------------------
  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeEmpresa.trim()) {
      toast.error('Informe o nome da empresa')
      return
    }

    setSavingEmpresa(true)
    try {
      const updated = await empresaService.updateOrCreate(empresa?.id, {
        nome_empresa: nomeEmpresa.trim(),
        documento: empresaDocumento.trim(),
        telefone: empresaTelefone.trim(),
        email: empresaEmail.trim(),
        observacoes: empresaObs.trim(),
      })
      setEmpresa(updated)
      toast.success('Dados da empresa salvos com sucesso!')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar dados da empresa')
    } finally {
      setSavingEmpresa(false)
    }
  }

  // ---------------------------------------------------------
  // HANDLERS: SÓCIOS
  // ---------------------------------------------------------
  const handleOpenCreateSocio = () => {
    setEditingSocioId(null)
    setSocioNome('')
    setSocioFuncao('')
    setSocioParticipacao('')
    setSocioTelefone('')
    setSocioEmail('')
    setSocioObs('')
    setSocioModalOpen(true)
  }

  const handleOpenEditSocio = (s: Socio) => {
    setEditingSocioId(s.id)
    setSocioNome(s.nome)
    setSocioFuncao(s.funcao || '')
    setSocioParticipacao(
      s.participacao_percentual !== undefined ? String(s.participacao_percentual) : '',
    )
    setSocioTelefone(s.telefone || '')
    setSocioEmail(s.email || '')
    setSocioObs(s.observacao || '')
    setSocioModalOpen(true)
  }

  const handleSaveSocio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!socioNome.trim()) {
      toast.error('Informe o nome do sócio')
      return
    }

    setSubmittingSocio(true)
    try {
      const partNum = socioParticipacao.trim()
        ? parseFloat(socioParticipacao.replace(',', '.'))
        : undefined
      const payload = {
        nome: socioNome.trim(),
        funcao: socioFuncao.trim() || undefined,
        participacao_percentual: !isNaN(partNum as number) ? partNum : undefined,
        telefone: socioTelefone.trim() || undefined,
        email: socioEmail.trim() || undefined,
        observacao: socioObs.trim() || undefined,
      }

      if (editingSocioId) {
        await sociosService.update(editingSocioId, payload)
        toast.success('Sócio atualizado com sucesso!')
      } else {
        await sociosService.create(payload)
        toast.success('Sócio cadastrado com sucesso!')
      }
      setSocioModalOpen(false)
      loadSocios()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar sócio')
    } finally {
      setSubmittingSocio(false)
    }
  }

  const handleDeleteSocio = async () => {
    if (!socioToDelete) return
    try {
      await sociosService.delete(socioToDelete.id)
      toast.success('Sócio removido com sucesso!')
      setSocios(socios.filter((s) => s.id !== socioToDelete.id))
      setDeleteSocioModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir sócio')
    }
  }

  // ---------------------------------------------------------
  // HANDLERS: CATEGORIAS DE GASTOS
  // ---------------------------------------------------------
  const handleOpenCreateCat = () => {
    setEditingCatId(null)
    setCatNome('')
    setCatDescricao('')
    setCatModalOpen(true)
  }

  const handleOpenEditCat = (cat: CategoriaGasto) => {
    setEditingCatId(cat.id)
    setCatNome(cat.nome)
    setCatDescricao(cat.descricao || '')
    setCatModalOpen(true)
  }

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catNome.trim()) {
      toast.error('Informe o nome da categoria')
      return
    }

    setSubmittingCat(true)
    try {
      if (editingCatId) {
        await categoriasService.update(editingCatId, {
          nome: catNome.trim(),
          descricao: catDescricao.trim(),
        })
        toast.success('Categoria atualizada com sucesso!')
      } else {
        await categoriasService.create({
          nome: catNome.trim(),
          descricao: catDescricao.trim(),
        })
        toast.success('Categoria cadastrada com sucesso!')
      }
      setCatModalOpen(false)
      loadCategorias()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar categoria. Verifique se o nome já não existe.')
    } finally {
      setSubmittingCat(false)
    }
  }

  const handleDeleteCat = async () => {
    if (!catToDelete) return
    try {
      await categoriasService.delete(catToDelete.id)
      toast.success('Categoria excluída com sucesso!')
      setCategorias(categorias.filter((c) => c.id !== catToDelete.id))
      setDeleteCatModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir categoria.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Cadastros
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastros gerais da empresa, lista de sócios e categorias de gastos utilizadas no Fluxo
            de Caixa.
          </p>
        </div>
        <ExportarBancoDialog />
      </div>

      {/* Navegação por Abas em Cadastros */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger value="empresa" className="gap-2 font-semibold">
            <Building2 className="w-4 h-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="socios" className="gap-2 font-semibold">
            <Users className="w-4 h-4" />
            Sócios ({socios.length})
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-2 font-semibold">
            <Tags className="w-4 h-4" />
            Categorias ({categorias.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: DADOS DA EMPRESA */}
        {/* ========================================================================= */}
        <TabsContent value="empresa" className="space-y-4">
          <Card className="shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Nome e Identificação da Empresa
              </CardTitle>
              <CardDescription>
                Atualize o nome oficial da empresa e os dados cadastrais gerais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEmpresa} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="nomeEmpresa"
                    className="font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Nome da Empresa *
                  </Label>
                  <Input
                    id="nomeEmpresa"
                    placeholder="Ex: M2 Gestão de Motos"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    required
                    className="text-base font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome exibido nos relatórios e no sistema de controle.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empresaDoc">CNPJ / CPF</Label>
                    <Input
                      id="empresaDoc"
                      placeholder="00.000.000/0000-00"
                      value={empresaDocumento}
                      onChange={(e) => setEmpresaDocumento(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresaTel">Telefone / WhatsApp</Label>
                    <Input
                      id="empresaTel"
                      placeholder="(00) 00000-0000"
                      value={empresaTelefone}
                      onChange={(e) => setEmpresaTelefone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresaEmail">E-mail de Contato</Label>
                  <Input
                    id="empresaEmail"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={empresaEmail}
                    onChange={(e) => setEmpresaEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresaObs">Observações / Ramo de Atividade</Label>
                  <Input
                    id="empresaObs"
                    placeholder="Ex: Controle de Frotas e Locação de Motos"
                    value={empresaObs}
                    onChange={(e) => setEmpresaObs(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={savingEmpresa} className="gap-2">
                    <Save className="w-4 h-4" />
                    {savingEmpresa ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: NOMES DOS SÓCIOS */}
        {/* ========================================================================= */}
        <TabsContent value="socios" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Quadro de Sócios
              </h2>
              <p className="text-xs text-muted-foreground">
                Cadastre e gerencie os sócios da empresa com percentuais e funções.
              </p>
            </div>
            <Button onClick={handleOpenCreateSocio} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Adicionar Sócio
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Sócios Cadastrados</CardTitle>
              <CardDescription>{socios.length} sócio(s) cadastrado(s) na empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSocios ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : socios.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Users className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Nenhum sócio cadastrado ainda
                  </p>
                  <p className="text-xs">Cadastre os nomes dos sócios da M2 Gestão de Motos.</p>
                  <Button size="sm" onClick={handleOpenCreateSocio} className="mt-2">
                    Adicionar Primeiro Sócio
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {socios.map((s) => (
                    <Card
                      key={s.id}
                      className="shadow-none border border-slate-200 dark:border-slate-800 hover:border-primary/40 transition-colors"
                    >
                      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-base text-slate-900 dark:text-white">
                              {s.nome}
                            </span>
                            {s.participacao_percentual !== undefined &&
                              s.participacao_percentual > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200"
                                >
                                  {s.participacao_percentual}%
                                </Badge>
                              )}
                          </div>

                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {s.funcao && (
                              <p className="font-medium text-slate-700 dark:text-slate-300">
                                Função: {s.funcao}
                              </p>
                            )}
                            {s.telefone && <p>Tel: {s.telefone}</p>}
                            {s.email && <p>E-mail: {s.email}</p>}
                            {s.observacao && (
                              <p className="italic text-slate-500 pt-1 line-clamp-2">
                                {s.observacao}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditSocio(s)}
                            className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSocioToDelete(s)
                              setDeleteSocioModalOpen(true)
                            }}
                            className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: CATEGORIAS DE GASTOS (TRANSFERIDAS PARA DENTRO DE CADASTROS) */}
        {/* ========================================================================= */}
        <TabsContent value="categorias" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tags className="w-5 h-5 text-primary" />
                Categorias de Gastos
              </h2>
              <p className="text-xs text-muted-foreground">
                Classificação de despesas utilizadas nos lançamentos rápidos e no Fluxo de Caixa.
              </p>
            </div>
            <Button onClick={handleOpenCreateCat} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Categoria
            </Button>
          </div>

          <Card className="shadow-sm border-blue-100 dark:border-blue-950 bg-blue-50/30 dark:bg-blue-950/20">
            <CardContent className="pt-4 pb-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Categorias ativas no M2 Gestão de Motos:</p>
                <p>
                  As categorias cadastradas aqui aparecem como opções ao registrar saídas no Fluxo
                  de Caixa e nos Lançamentos Rápidos (ex.: Manutenção, GOVERNO, Seguro, Rastreador
                  GPS, Multas, Comissão, etc.). Todas as categorias continuam 100% integradas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Categorias Cadastradas</CardTitle>
              <CardDescription>
                {categorias.length} categoria(s) disponível(is) para classificação de despesas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCategorias ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : categorias.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <FolderPlus className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Nenhuma categoria cadastrada
                  </p>
                  <Button size="sm" onClick={handleOpenCreateCat} className="mt-2">
                    Cadastrar Primeira Categoria
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorias.map((cat) => (
                    <Card
                      key={cat.id}
                      className="shadow-none border border-slate-200 dark:border-slate-800 hover:border-primary/40 transition-colors"
                    >
                      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-base text-slate-900 dark:text-white">
                              {cat.nome}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-50 dark:bg-slate-800"
                            >
                              Ativa
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {cat.descricao || 'Sem descrição cadastrada'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditCat(cat)}
                            className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCatToDelete(cat)
                              setDeleteCatModalOpen(true)
                            }}
                            className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: SÓCIO (Criar/Editar) */}
      {/* ========================================================================= */}
      <Dialog open={socioModalOpen} onOpenChange={setSocioModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSocioId ? 'Editar Sócio' : 'Cadastrar Novo Sócio'}</DialogTitle>
            <DialogDescription>Informe o nome e os dados do sócio da empresa.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSocio} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="socioNome">Nome Completo do Sócio *</Label>
              <Input
                id="socioNome"
                placeholder="Ex: Maria Silva"
                value={socioNome}
                onChange={(e) => setSocioNome(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="socioFuncao">Função / Cargo</Label>
                <Input
                  id="socioFuncao"
                  placeholder="Ex: Sócia Proprietária, Diretor..."
                  value={socioFuncao}
                  onChange={(e) => setSocioFuncao(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socioPart">Participação (%)</Label>
                <Input
                  id="socioPart"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Ex: 50"
                  value={socioParticipacao}
                  onChange={(e) => setSocioParticipacao(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="socioTel">Telefone / Celular</Label>
                <Input
                  id="socioTel"
                  placeholder="(00) 00000-0000"
                  value={socioTelefone}
                  onChange={(e) => setSocioTelefone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socioEmail">E-mail</Label>
                <Input
                  id="socioEmail"
                  type="email"
                  placeholder="socio@email.com"
                  value={socioEmail}
                  onChange={(e) => setSocioEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="socioObs">Observações</Label>
              <Input
                id="socioObs"
                placeholder="Ex: Responsável financeiro e operacional"
                value={socioObs}
                onChange={(e) => setSocioObs(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSocioModalOpen(false)}
                disabled={submittingSocio}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingSocio}>
                {submittingSocio
                  ? 'Salvando...'
                  : editingSocioId
                    ? 'Salvar Alterações'
                    : 'Cadastrar Sócio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Excluir Sócio */}
      <Dialog open={deleteSocioModalOpen} onOpenChange={setDeleteSocioModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Sócio</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o sócio <strong>{socioToDelete?.nome}</strong> do
              quadro da empresa?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSocioModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteSocio}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CATEGORIA (Criar/Editar) */}
      {/* ========================================================================= */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCatId ? 'Editar Categoria de Gasto' : 'Nova Categoria de Gasto'}
            </DialogTitle>
            <DialogDescription>
              Defina o nome da categoria para padronizar as saídas e relatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCat} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catNome">Nome da Categoria *</Label>
              <Input
                id="catNome"
                placeholder="Ex: Manutenção, Combustível, Seguro, Peças..."
                value={catNome}
                onChange={(e) => setCatNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catDesc">Descrição / Observação</Label>
              <Input
                id="catDesc"
                placeholder="Ex: Gastos com oficina mecânica e revisões"
                value={catDescricao}
                onChange={(e) => setCatDescricao(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCatModalOpen(false)}
                disabled={submittingCat}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingCat}>
                {submittingCat
                  ? 'Salvando...'
                  : editingCatId
                    ? 'Salvar Alterações'
                    : 'Cadastrar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Excluir Categoria */}
      <Dialog open={deleteCatModalOpen} onOpenChange={setDeleteCatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Categoria</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a categoria <strong>{catToDelete?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCatModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCat}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
