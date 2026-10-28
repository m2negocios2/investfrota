import React from 'react'
import { Bike, CheckCircle2 } from 'lucide-react'
import { Moto } from '@/types/database'

export interface MotoColorStyle {
  color: string
  label: string
  bgSoft: string
  borderSoft: string
}

// Mapeamento e normalização de cores cadastradas para estilização do ícone da moto
export function getMotoColorStyle(corCadastrada?: string): MotoColorStyle {
  if (!corCadastrada || !corCadastrada.trim()) {
    return {
      color: '#64748b', // slate-500 neutro
      label: 'Não informada',
      bgSoft: 'bg-slate-100 dark:bg-slate-800',
      borderSoft: 'border-slate-300 dark:border-slate-700',
    }
  }

  const clean = corCadastrada.trim().toLowerCase()

  // Se já for código hex ou rgb/hsl válido
  if (clean.startsWith('#') || clean.startsWith('rgb')) {
    return {
      color: clean,
      label: corCadastrada,
      bgSoft: 'bg-slate-50 dark:bg-slate-900',
      borderSoft: 'border-slate-200 dark:border-slate-700',
    }
  }

  // Vermelha / Rubro / Vinho / Bordô
  if (
    clean.includes('verm') ||
    clean.includes('rubro') ||
    clean.includes('vinh') ||
    clean.includes('bordo')
  ) {
    return {
      color: '#dc2626', // red-600
      label: corCadastrada,
      bgSoft: 'bg-red-50/70 dark:bg-red-950/30',
      borderSoft: 'border-red-200 dark:border-red-900',
    }
  }

  // Preta / Preto / Escura / Grafite
  if (clean.includes('pret') || clean.includes('black') || clean.includes('grafite')) {
    return {
      color: '#1e293b', // slate-800 marcante
      label: corCadastrada,
      bgSoft: 'bg-slate-100/90 dark:bg-slate-800/80',
      borderSoft: 'border-slate-300 dark:border-slate-700',
    }
  }

  // Azul / Marinho / Anil / Celeste
  if (
    clean.includes('azul') ||
    clean.includes('blue') ||
    clean.includes('marinho') ||
    clean.includes('anil')
  ) {
    return {
      color: '#2563eb', // blue-600
      label: corCadastrada,
      bgSoft: 'bg-blue-50/70 dark:bg-blue-950/30',
      borderSoft: 'border-blue-200 dark:border-blue-900',
    }
  }

  // Branca / Branco / Pérola / Prata / Cinza
  if (clean.includes('branc') || clean.includes('white') || clean.includes('perola')) {
    return {
      color: '#94a3b8', // slate-400 com contorno nítido
      label: corCadastrada,
      bgSoft: 'bg-slate-50 dark:bg-slate-900',
      borderSoft: 'border-slate-300 dark:border-slate-700',
    }
  }
  if (
    clean.includes('prat') ||
    clean.includes('cinz') ||
    clean.includes('silver') ||
    clean.includes('grey') ||
    clean.includes('gray')
  ) {
    return {
      color: '#64748b', // slate-500
      label: corCadastrada,
      bgSoft: 'bg-slate-100/70 dark:bg-slate-800/50',
      borderSoft: 'border-slate-300 dark:border-slate-700',
    }
  }

  // Amarela / Amarelo / Ouro / Dourada
  if (
    clean.includes('amar') ||
    clean.includes('dourad') ||
    clean.includes('ouro') ||
    clean.includes('yellow')
  ) {
    return {
      color: '#d97706', // amber-600
      label: corCadastrada,
      bgSoft: 'bg-amber-50/70 dark:bg-amber-950/30',
      borderSoft: 'border-amber-200 dark:border-amber-900',
    }
  }

  // Verde
  if (
    clean.includes('verd') ||
    clean.includes('green') ||
    clean.includes('musgo') ||
    clean.includes('oliva')
  ) {
    return {
      color: '#16a34a', // green-600
      label: corCadastrada,
      bgSoft: 'bg-green-50/70 dark:bg-green-950/30',
      borderSoft: 'border-green-200 dark:border-green-900',
    }
  }

  // Laranja / Tangerina
  if (clean.includes('laranj') || clean.includes('orange')) {
    return {
      color: '#ea580c', // orange-600
      label: corCadastrada,
      bgSoft: 'bg-orange-50/70 dark:bg-orange-950/30',
      borderSoft: 'border-orange-200 dark:border-orange-900',
    }
  }

  // Roxa / Violeta / Lilás
  if (
    clean.includes('rox') ||
    clean.includes('purp') ||
    clean.includes('viol') ||
    clean.includes('lilas')
  ) {
    return {
      color: '#9333ea', // purple-600
      label: corCadastrada,
      bgSoft: 'bg-purple-50/70 dark:bg-purple-950/30',
      borderSoft: 'border-purple-200 dark:border-purple-900',
    }
  }

  // Rosa / Pink
  if (clean.includes('ros') || clean.includes('pink')) {
    return {
      color: '#db2777', // pink-600
      label: corCadastrada,
      bgSoft: 'bg-pink-50/70 dark:bg-pink-950/30',
      borderSoft: 'border-pink-200 dark:border-pink-900',
    }
  }

  // Marrom / Bege
  if (clean.includes('marr') || clean.includes('beg') || clean.includes('brown')) {
    return {
      color: '#854d0e', // yellow-800
      label: corCadastrada,
      bgSoft: 'bg-amber-50/50 dark:bg-amber-950/20',
      borderSoft: 'border-amber-200 dark:border-amber-900',
    }
  }

  // Padrão neutro caso seja um nome não mapeado diretamente
  return {
    color: '#64748b',
    label: corCadastrada,
    bgSoft: 'bg-slate-100 dark:bg-slate-800',
    borderSoft: 'border-slate-300 dark:border-slate-700',
  }
}

interface MotoCardButtonProps {
  moto: Moto
  isSelected: boolean
  onClick: () => void
  compact?: boolean
}

export function MotoCardButton({
  moto,
  isSelected,
  onClick,
  compact = false,
}: MotoCardButtonProps) {
  const nomePrincipal = moto.nome?.trim() || moto.modelo?.trim() || moto.placa
  const colorInfo = getMotoColorStyle(moto.cor)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border-2 transition-all text-left flex items-center cursor-pointer select-none active:scale-[0.98] ${
        compact
          ? 'min-h-[58px] sm:min-h-[64px] p-2 gap-2'
          : 'min-h-[72px] sm:min-h-[78px] p-2.5 sm:p-3 gap-2.5 sm:gap-3'
      } ${
        isSelected
          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-blue-600/30 shadow-md shadow-blue-500/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm'
      }`}
    >
      {/* Ícone da moto pintado na cor cadastrada */}
      <div
        className={`shrink-0 rounded-xl flex items-center justify-center border transition-colors ${
          compact ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-11 h-11 sm:w-12 sm:h-12'
        } ${
          isSelected
            ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700 shadow-sm'
            : `${colorInfo.bgSoft} ${colorInfo.borderSoft}`
        }`}
      >
        <Bike
          className={`transition-transform group-hover:scale-105 ${
            compact ? 'w-5 h-5 sm:w-5 sm:h-5' : 'w-6 h-6 sm:w-7 sm:h-7'
          }`}
          style={{ color: colorInfo.color }}
          strokeWidth={2.4}
        />
      </div>

      {/* Nome da moto dentro do botão e detalhes */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p
            className={`font-black leading-tight truncate ${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } ${
              isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-white'
            }`}
          >
            {nomePrincipal}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0 border border-black/10"
            style={{ backgroundColor: colorInfo.color }}
            title={`Cor: ${moto.cor || 'Não informada'}`}
          />
          <span className="text-[11px] text-muted-foreground truncate leading-none">
            {moto.cor || 'Sem cor'}
            {moto.placa ? ` • ${moto.placa}` : ''}
          </span>
        </div>
      </div>

      {/* Indicador de Seleção no Canto */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
  )
}

interface MotoGridSelectorProps {
  motos: Moto[]
  selectedMotoId: string
  onSelectMotoId: (id: string) => void
  compact?: boolean
  emptyMessage?: string
  loading?: boolean
  columnsClassName?: string
}

export function MotoGridSelector({
  motos,
  selectedMotoId,
  onSelectMotoId,
  compact = false,
  emptyMessage = 'Nenhuma moto cadastrada.',
  loading = false,
  columnsClassName = 'grid-cols-2 sm:grid-cols-3',
}: MotoGridSelectorProps) {
  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        Carregando motos...
      </div>
    )
  }

  if (motos.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`grid gap-2.5 sm:gap-3 ${columnsClassName}`}>
      {motos.map((m) => (
        <MotoCardButton
          key={m.id}
          moto={m}
          isSelected={selectedMotoId === m.id}
          onClick={() => onSelectMotoId(m.id)}
          compact={compact}
        />
      ))}
    </div>
  )
}
