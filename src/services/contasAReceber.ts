import pb from '@/lib/pocketbase/client'
import { ContaAReceber, CaixaLancamento } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const contasAReceberService = {
  async getAll(): Promise<ContaAReceber[]> {
    return await pb.collection('contas_a_receber').getFullList<ContaAReceber>({
      sort: '-created',
      expand: 'moto,caixa_lancamento',
    })
  },

  async getEmAberto(): Promise<ContaAReceber[]> {
    return await pb.collection('contas_a_receber').getFullList<ContaAReceber>({
      filter: 'status = "em_aberto"',
      sort: 'data_vencimento',
      expand: 'moto',
    })
  },

  async getById(id: string): Promise<ContaAReceber> {
    return await pb.collection('contas_a_receber').getOne<ContaAReceber>(id, {
      expand: 'moto,caixa_lancamento',
    })
  },

  async create(data: {
    moto?: string
    descricao: string
    devedor: string
    valor: number
    data_vencimento: string
    origem?: string
    observacao?: string
  }): Promise<ContaAReceber> {
    const payload = {
      ...data,
      data_vencimento: dateToApiMidday(data.data_vencimento),
      status: 'em_aberto',
    }
    return await pb.collection('contas_a_receber').create<ContaAReceber>(payload)
  },

  /**
   * Registra o recebimento de uma conta a receber, lançando a ENTRADA no Fluxo de Caixa
   */
  async registrarRecebimento(params: {
    contaId: string
    data?: string
    formaPagamento?: 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'
    observacao?: string
  }): Promise<{ conta: ContaAReceber; lancamento: CaixaLancamento }> {
    const conta = await pb.collection('contas_a_receber').getOne<ContaAReceber>(params.contaId)

    const dataRec = params.data || new Date().toISOString().split('T')[0]
    const safeDate = dateToApiMidday(dataRec)

    // 1. Criar lançamento de ENTRADA no caixa (associado à moto, se houver)
    // Se a conta tem origem venda_moto, usa 'Venda de Moto'; para contas manuais/avulsas, usa 'Outras Receitas' ou 'Venda de Moto'
    const categoriaEntrada = conta.origem === 'venda_moto' ? 'Venda de Moto' : 'Outras Receitas'

    const lancamento = await pb.collection('caixa_lancamentos').create<CaixaLancamento>({
      moto: conta.moto || '',
      tipo: 'entrada',
      descricao: `Recebimento: ${conta.descricao}`,
      categoria: categoriaEntrada,
      valor: Number(conta.valor),
      data: safeDate,
      forma_pagamento: params.formaPagamento || 'pix',
      observacoes: params.observacao
        ? `Recebimento da conta a receber ref: ${conta.devedor}. Obs: ${params.observacao}`
        : `Recebimento da conta a receber ref: ${conta.devedor}`,
    })

    // 2. Atualizar conta a receber para 'recebida'
    const contaAtualizada = await pb
      .collection('contas_a_receber')
      .update<ContaAReceber>(conta.id, {
        status: 'recebida',
        data_recebimento: safeDate,
        caixa_lancamento: lancamento.id,
      })

    return { conta: contaAtualizada, lancamento }
  },

  async cancelar(id: string): Promise<ContaAReceber> {
    return await pb.collection('contas_a_receber').update<ContaAReceber>(id, {
      status: 'cancelada',
    })
  },

  async delete(id: string): Promise<void> {
    const conta = await pb.collection('contas_a_receber').getOne<ContaAReceber>(id)
    if (conta.caixa_lancamento) {
      try {
        await pb.collection('caixa_lancamentos').delete(conta.caixa_lancamento)
      } catch (errCaixa) {
        console.warn('Lançamento de caixa já não existia:', errCaixa)
      }
    }
    await pb.collection('contas_a_receber').delete(id)
  },
}
