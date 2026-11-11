import React, { useState } from 'react'
import { Database, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { exportarBancoJson, exportarColecaoCsv, listarNomesColecoes } from '@/lib/exportBanco'

export function ExportarBancoDialog() {
  const [open, setOpen] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [mensagem, setMensagem] = useState('Gerando arquivo...')
  const [colecoes, setColecoes] = useState<string[]>([])
  const [csvAtual, setCsvAtual] = useState<string | null>(null)

  const handleOpenChange = async (value: boolean) => {
    setOpen(value)
    if (value && colecoes.length === 0) {
      try {
        setColecoes(await listarNomesColecoes())
      } catch (err) {
        console.error('Erro ao listar coleções:', err)
        toast.error('Não foi possível listar as coleções')
      }
    }
  }

  const handleExportarJson = async () => {
    if (exportando) return
    setExportando(true)
    setMensagem('Gerando arquivo...')
    try {
      const resultado = await exportarBancoJson((nome, indice, total) => {
        setMensagem(`Gerando arquivo... (${indice}/${total}: ${nome})`)
      })
      if (resultado.puladas.length > 0) {
        toast.warning(
          `Backup gerado com ${resultado.totalRegistros} registros. Coleções puladas (sem permissão ou erro): ${resultado.puladas
            .map((p) => p.colecao)
            .join(', ')}`,
        )
      } else {
        toast.success(
          `Backup exportado: ${resultado.totalRegistros} registros em ${resultado.totalColecoes} coleções.`,
        )
      }
    } catch (err) {
      console.error('Erro ao exportar banco:', err)
      toast.error('Erro ao exportar o banco de dados')
    } finally {
      setExportando(false)
    }
  }

  const handleExportarCsv = async (nome: string) => {
    if (csvAtual || exportando) return
    setCsvAtual(nome)
    try {
      const total = await exportarColecaoCsv(nome)
      toast.success(`CSV de "${nome}" exportado: ${total} registros.`)
    } catch (err) {
      console.error('Erro ao exportar CSV:', err)
      toast.error(`Erro ao exportar a coleção "${nome}"`)
    } finally {
      setCsvAtual(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Database className="w-4 h-4" />
          Exportar Banco de Dados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Banco de Dados</DialogTitle>
          <DialogDescription>
            Baixa um arquivo JSON com a estrutura e todos os registros do sistema. Também é possível
            baixar cada coleção separadamente em CSV. A operação é somente leitura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button className="w-full gap-2" onClick={handleExportarJson} disabled={exportando}>
            {exportando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mensagem}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Baixar backup completo (.json)
              </>
            )}
          </Button>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Baixar coleção em CSV
            </p>
            {colecoes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Carregando coleções...</p>
            ) : (
              <div className="max-h-72 overflow-y-auto grid grid-cols-1 gap-1">
                {colecoes.map((nome) => (
                  <Button
                    key={nome}
                    variant="ghost"
                    size="sm"
                    className="justify-start gap-2 font-mono text-xs"
                    disabled={exportando || csvAtual !== null}
                    onClick={() => handleExportarCsv(nome)}
                  >
                    {csvAtual === nome ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    )}
                    {nome}.csv
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ExportarBancoDialog
