import pb from '@/lib/pocketbase/client'
import { Moto } from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'

export const motosService = {
  async getAll(): Promise<Moto[]> {
    return await pb.collection('motos').getFullList<Moto>({
      sort: '-created',
    })
  },

  async getById(id: string): Promise<Moto> {
    return await pb.collection('motos').getOne<Moto>(id)
  },

  async create(data: Omit<Moto, 'id' | 'created' | 'updated'>): Promise<Moto> {
    const payload = { ...data }
    if (payload.data_compra) {
      payload.data_compra = dateToApiMidday(payload.data_compra)
    }
    return await pb.collection('motos').create<Moto>(payload)
  },

  async update(id: string, data: Partial<Moto>): Promise<Moto> {
    const payload = { ...data }
    if (payload.data_compra !== undefined && payload.data_compra) {
      payload.data_compra = dateToApiMidday(payload.data_compra)
    }
    return await pb.collection('motos').update<Moto>(id, payload)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('motos').delete(id)
  },

  /**
   * Registra a VENDA de uma moto.
   * Se pago_agora: cria entrada no caixa imediatamente.
   * Se aguardando_recebimento: cria conta_a_receber e NÃO lança no caixa.
   */
  async registrarVenda(params: {
    motoId: string
    data: string
    dataFimLocacao?: string
    valor: number
    comprador: string
    formaRecebimento: 'pago_agora' | 'aguardando_recebimento'
    formaPagamento?: 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'outro'
    observacao?: string
  }): Promise<Moto> {
    const moto = await pb.collection('motos').getOne<Moto>(params.motoId)
    const safeDate = dateToApiMidday(params.data)
    const safeDateFimLocacao = params.dataFimLocacao?.trim()
      ? dateToApiMidday(params.dataFimLocacao)
      : null
    const desc = `Venda da moto ${moto.nome || moto.modelo} — placa ${moto.placa}`

    let caixaId = ''
    let contaAReceberId = ''

    if (params.formaRecebimento === 'pago_agora') {
      const lancamento = await pb.collection('caixa_lancamentos').create({
        moto: moto.id,
        tipo: 'entrada',
        descricao: desc,
        categoria: 'Venda de Moto',
        valor: Number(params.valor),
        data: safeDate,
        forma_pagamento: params.formaPagamento || 'pix',
        observacoes: params.observacao
          ? `Venda para ${params.comprador}. Obs: ${params.observacao}`
          : `Venda para ${params.comprador}`,
      })
      caixaId = lancamento.id
    } else {
      const conta = await pb.collection('contas_a_receber').create({
        moto: moto.id,
        descricao: desc,
        devedor: params.comprador,
        valor: Number(params.valor),
        data_vencimento: safeDate,
        status: 'em_aberto',
        origem: 'venda_moto',
        observacao: params.observacao || '',
      })
      contaAReceberId = conta.id
    }

    // Finalizar contratos ativos da moto (se houver)
    const contratosAtivos = await pb.collection('contratos').getFullList({
      filter: `moto = "${moto.id}" && status = "ativo"`,
    })
    for (const c of contratosAtivos) {
      await pb.collection('contratos').update(c.id, {
        status: 'finalizado',
        data_entrega: safeDate,
      })
    }

    return await pb.collection('motos').update<Moto>(moto.id, {
      status: 'vendida',
      data_saida: safeDate,
      data_fim_locacao: safeDateFimLocacao,
      tipo_operacao_saida: 'venda',
      valor_venda: Number(params.valor),
      destinatario_saida: params.comprador,
      forma_recebimento_venda: params.formaRecebimento,
      caixa_lancamento_saida: caixaId,
      conta_a_receber_saida: contaAReceberId,
    })
  },

  /**
   * Registra a CESSÃO da moto no fim do contrato Plano Conquista.
   * Não gera receita no caixa.
   */
  async registrarCessao(params: {
    motoId: string
    data: string
    locatarioNome: string
    contratoId?: string
    observacao?: string
  }): Promise<Moto> {
    const moto = await pb.collection('motos').getOne<Moto>(params.motoId)
    const safeDate = dateToApiMidday(params.data)

    // Finalizar contrato Plano Conquista ativo
    if (params.contratoId) {
      await pb.collection('contratos').update(params.contratoId, {
        status: 'finalizado',
        data_entrega: safeDate,
      })
    } else {
      const contratosAtivos = await pb.collection('contratos').getFullList({
        filter: `moto = "${moto.id}" && status = "ativo"`,
      })
      for (const c of contratosAtivos) {
        await pb.collection('contratos').update(c.id, {
          status: 'finalizado',
          data_entrega: safeDate,
        })
      }
    }

    return await pb.collection('motos').update<Moto>(moto.id, {
      status: 'disponivel', // fallback inicial se necessário, mas marcamos como cedida
      ...{
        status: 'cedida',
        data_saida: safeDate,
        tipo_operacao_saida: 'cessao',
        valor_venda: 0,
        destinatario_saida: params.locatarioNome,
        forma_recebimento_venda: '',
        caixa_lancamento_saida: '',
        conta_a_receber_saida: '',
      },
    })
  },

  /**
   * Desfaz a operação de saída (Venda ou Cessão), revertendo o status para 'disponivel'
   * e estornando/apagando o lançamento de caixa ou conta a receber gerado.
   */
  async desfazerOperacaoSaida(motoId: string): Promise<Moto> {
    const moto = await pb.collection('motos').getOne<Moto>(motoId)

    // 1. Se gerou lançamento de caixa de venda, apagar
    if (moto.caixa_lancamento_saida) {
      try {
        await pb.collection('caixa_lancamentos').delete(moto.caixa_lancamento_saida)
      } catch (errCaixa) {
        console.warn('Lançamento de caixa de venda já não existia:', errCaixa)
      }
    }

    // 2. Se gerou conta a receber, verificar se gerou recebimento no caixa e remover
    if (moto.conta_a_receber_saida) {
      try {
        const conta = await pb.collection('contas_a_receber').getOne(moto.conta_a_receber_saida)
        if (conta.caixa_lancamento) {
          try {
            await pb.collection('caixa_lancamentos').delete(conta.caixa_lancamento)
          } catch {
            /* intentionally ignored */
          }
        }
        await pb.collection('contas_a_receber').delete(moto.conta_a_receber_saida)
      } catch (errConta) {
        console.warn('Conta a receber de venda já não existia:', errConta)
      }
    }

    // 3. Reverter status da moto para 'disponivel' e limpar metadados de saída
    return await pb.collection('motos').update<Moto>(moto.id, {
      status: 'disponivel',
      data_saida: null,
      data_fim_locacao: null,
      tipo_operacao_saida: null,
      valor_venda: 0,
      destinatario_saida: '',
      forma_recebimento_venda: null,
      caixa_lancamento_saida: '',
      conta_a_receber_saida: '',
    })
  },
}
