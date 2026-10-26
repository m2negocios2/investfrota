import React, { useState, useEffect } from 'react'
import { Calendar, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Contrato, Moto } from '@/types/database'

interface FinalizeContractModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato: Contrato | null
  moto?: Moto | null
  onConfirm: (contrato: Contrato, dataFim: string) => Promise<void>
}

// Extrai YYYY-MM-DD com segurança a partir de string de data (ISO ou simples)
function toDateInputValue(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) {
      return dateStr.split('T')[0]
    }
    return d.toISOString().split('T')[0]
  } catch {
    return dateStr.split('T')[0] || ''
  }
}

export function FinalizeContractModal({
  open,
  onOpenChange,
  contrato,
  moto,
  onConfirm,
}: FinalizeContractModalProps) {
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dataInicioStr = contrato?.data_inicio ? toDateInputValue(contrato.data_inicio) : ''

  useEffect(() => {
    if (open && contrato) {
      // Pré-preenche com a data_entrega existente se houver, ou a data de hoje como fallback inicial editável
      const initialDate = contrato.data_entrega
        ? toDateInputValue(contrato.data_entrega)
        : new Date().toISOString().split('T')[0]
      setDataFim(initialDate)
      setErrorMessage(null)
      setLoading(false)
    }
  }, [open, contrato])

  if (!contrato) return null

  const handleDateChange = (val: string) => {
    setDataFim(val)
    if (dataInicioStr && val && val < dataInicioStr) {
      setErrorMessage(
        `A data de término não pode ser anterior à data de início do contrato (${new Date(
          contrato.data_inicio,
        ).toLocaleDateString('pt-BR')}).`,
      )
    } else {
      setErrorMessage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataFim) {
      setErrorMessage('Informe a data de término do contrato.')
      return
    }

    if (dataInicioStr && dataFim < dataInicioStr) {
      setErrorMessage(
        `A data de término não pode ser anterior à data de início (${new Date(
          contrato.data_inicio,
        ).toLocaleDateString('pt-BR')}).`,
      )
      return
    }

    setLoading(true)
    try {
      await onConfirm(contrato, dataFim)
      onOpenChange(false)
    } catch {
      // Erro tratado pelo caller via toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Calendar className="w-5 h-5 text-red-600" />
            <span>Finalizar Contrato de Locação</span>
          </DialogTitle>
          <DialogDescription>
            Informe a data real em que a locação foi encerrada. O contrato será arquivado e a moto
            ficará disponível a partir dessa data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Resumo do Contrato */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locatário:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {contrato.locatario_nome}
              </span>
            </div>
            {moto && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moto:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {moto.nome || moto.modelo} ({moto.placa})
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Início da locação:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {contrato.valor_semanal && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor semanal:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  R$ {contrato.valor_semanal.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Campo da Data de Fim */}
          <div className="space-y-2">
            <Label
              htmlFor="dataFimContratoInput"
              className="text-xs font-bold text-slate-900 dark:text-white"
            >
              Data em que a locação finalizou *
            </Label>
            <Input
              id="dataFimContratoInput"
              type="date"
              value={dataFim}
              onChange={(e) => handleDateChange(e.target.value)}
              required
              className={errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            <p className="text-[11px] text-muted-foreground">
              Você pode registrar contratos antigos informando a data real em que a moto foi
              devolvida.
            </p>
          </div>

          {/* Aviso de validação */}
          {errorMessage && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || Boolean(errorMessage)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Finalizando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
