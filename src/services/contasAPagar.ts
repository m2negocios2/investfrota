import pb from '@/lib/pocketbase/client'
import {
  ContaAPagar,
  ContaAPagarPagamento,
  ContaAPagarComProgresso,
  CaixaLancamento,
  ItemParcela,
} from '@/types/database'
import { dateToApiMidday } from '@/lib/dateUtils'
import {
  resolverParcelasConta,
  obterValorSugeridoParcela,
  gerarParcelasIguais,
  round2,
} from '@/lib/parcelasUtils'

export const contasAPagarService = {
  /**
   * Retorna todas as contas com seus pagamentos associados e totais calculados
   */
  async getAllWithProgresso(): Promise<ContaAPagarComProgresso[]> {
    const [contas, todosPagamentos] = await Promise.all([
      pb.collection('contas_a_pagar').getFullList<ContaAPagar>({
        sort: 'concluida,-created',
      }),
      pb.collection('contas_a_pagar_pagamentos').getFullList<ContaAPagarPagamento>({
        sort: '-data,-created',
      }),
    ])

    // Agrupar pagamentos por conta
    const pagamentosPorConta = new Map<string, ContaAPagarPagamento[]>()
    todosPagamentos.forEach((pag) => {
      if (!pagamentosPorConta.has(pag.conta)) {
        pagamentosPorConta.set(pag.conta, [])
      }
      pagamentosPorConta.get(pag.conta)!.push(pag)
    })

    const resultado: ContaAPagarComProgresso[] = []

    for (const conta of contas) {
      const pagamentos = pagamentosPorConta.get(conta.id) || []
      const totalPago = round2(pagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0))
      const saldoRestante = round2(Math.max(0, conta.valor_total - totalPago))
      const quantidadePaga = pagamentos.length
      const percentualPago =
        conta.valor_total > 0 ? Math.min(100, Math.round((totalPago / conta.valor_total) * 100)) : 0

      // Resolver lista de parcelas calculadas/customizadas
      const parcelasCalculadas = resolverParcelasConta(conta)

      // Identificar o próximo número de parcela a pagar
      const proximaParcelaNumero = quantidadePaga + 1
      const proximaParcelaValorSugerido = obterValorSugeridoParcela(
        parcelasCalculadas,
        proximaParcelaNumero,
        saldoRestante,
        conta.valor_parcela,
      )

      // Se pagou tudo ou mais, e ainda não está marcada como concluída, sincronizar flag
      const quitadaAuto = totalPago >= conta.valor_total && conta.valor_total > 0
      if (quitadaAuto !== !!conta.concluida) {
        try {
          await pb.collection('contas_a_pagar').update(conta.id, {
            concluida: quitadaAuto,
          })
          conta.concluida = quitadaAuto
        } catch (errSync) {
          console.warn('Erro ao sincronizar status concluida da conta:', errSync)
        }
      }

      resultado.push({
        ...conta,
        totalPago,
        saldoRestante,
        quantidadePaga,
        percentualPago,
        pagamentos,
        parcelasCalculadas,
        proximaParcelaNumero,
        proximaParcelaValorSugerido,
      })
    }

    return resultado
  },

  async getById(id: string): Promise<ContaAPagar> {
    return await pb.collection('contas_a_pagar').getOne<ContaAPagar>(id)
  },

  async create(data: {
    descricao: string
    credor: string
    tipo: ContaAPagar['tipo']
    valor_total: number
    quantidade_parcelas: number
    valor_parcela: number
    data_inicio: string
    dia_vencimento?: number
    observacao?: string
    parcelas_customizadas?: ItemParcela[]
  }): Promise<ContaAPagar> {
    // Se parcelas_customizadas não for passada, gera a divisão igual padrão
    const parcelas =
      data.parcelas_customizadas && data.parcelas_customizadas.length === data.quantidade_parcelas
        ? data.parcelas_customizadas
        : gerarParcelasIguais({
            valorTotal: data.valor_total,
            quantidadeParcelas: data.quantidade_parcelas,
            dataInicio: data.data_inicio,
            diaVencimento: data.dia_vencimento,
          })

    const payload = {
      ...data,
      data_inicio: dateToApiMidday(data.data_inicio),
      concluida: false,
      parcelas_customizadas: parcelas,
    }
    return await pb.collection('contas_a_pagar').create<ContaAPagar>(payload)
  },

  async update(
    id: string,
    data: Partial<Omit<ContaAPagar, 'id' | 'created' | 'updated'>>,
  ): Promise<ContaAPagar> {
    const payload: any = {
      ...data,
      ...(data.data_inicio ? { data_inicio: dateToApiMidday(data.data_inicio) } : {}),
    }
    return await pb.collection('contas_a_pagar').update<ContaAPagar>(id, payload)
  },

  /**
   * Exclui uma conta a pagar, todos os seus pagamentos E os lançamentos de caixa correspondentes
   */
  async delete(id: string): Promise<void> {
    // 1. Buscar todos os pagamentos vinculados a esta conta
    const pagamentos = await pb
      .collection('contas_a_pagar_pagamentos')
      .getFullList<ContaAPagarPagamento>({
        filter: `conta = "${id}"`,
      })

    // 2. Apagar lançamentos no caixa que foram gerados por esses pagamentos
    for (const pag of pagamentos) {
      if (pag.caixa_lancamento) {
        try {
          await pb.collection('caixa_lancamentos').delete(pag.caixa_lancamento)
        } catch (errCaixa) {
          console.warn('Lançamento de caixa já não existia ou não pôde ser apagado:', errCaixa)
        }
      }
      try {
        await pb.collection('contas_a_pagar_pagamentos').delete(pag.id)
      } catch (errPag) {
        console.warn('Erro ao apagar pagamento da conta:', errPag)
      }
    }

    // 3. Apagar a conta
    await pb.collection('contas_a_pagar').delete(id)
  },

  /**
   * Registra um pagamento de parcela, vinculando e gerando saída no caixa com entidade='terceiros'
   */
  async registrarPagamento(params: {
    contaId: string
    data: string
    valor: number
    observacao?: string
    numeroParcela?: number
  }): Promise<ContaAPagarPagamento> {
    const conta = await pb.collection('contas_a_pagar').getOne<ContaAPagar>(params.contaId)

    // Contar pagamentos anteriores para saber o número da parcela (ex: parcela 3 de 12)
    const pagamentosExistentes = await pb
      .collection('contas_a_pagar_pagamentos')
      .getFullList<ContaAPagarPagamento>({
        filter: `conta = "${conta.id}"`,
      })
    const numeroParcela = params.numeroParcela || pagamentosExistentes.length + 1

    const safeDate = dateToApiMidday(params.data)

    // 1. Criar lançamento de SAÍDA no caixa: entidade='terceiros', sem moto
    const descCaixa = `${conta.descricao} — parcela ${numeroParcela} de ${conta.quantidade_parcelas}`
    const caixaLancamento = await pb.collection('caixa_lancamentos').create<CaixaLancamento>({
      moto: '',
      entidade: 'terceiros',
      tipo: 'saida',
      descricao: descCaixa,
      categoria: 'Terceiros',
      valor: Number(params.valor),
      data: safeDate,
      forma_pagamento: 'pix',
      observacoes: params.observacao
        ? `Pagamento de conta a pagar: ${conta.credor}. Obs: ${params.observacao}`
        : `Pagamento de conta a pagar: ${conta.credor}`,
    })

    // 2. Criar registro do pagamento com vínculo ao caixa
    const pagamento = await pb
      .collection('contas_a_pagar_pagamentos')
      .create<ContaAPagarPagamento>({
        conta: conta.id,
        data: safeDate,
        valor: Number(params.valor),
        numero_parcela: numeroParcela,
        caixa_lancamento: caixaLancamento.id,
        observacao: params.observacao || '',
      })

    // 3. Atualizar status de concluída da conta se atingiu ou superou o valor_total
    const novoTotalPago =
      pagamentosExistentes.reduce((acc, p) => acc + (Number(p.valor) || 0), 0) +
      Number(params.valor)
    if (novoTotalPago >= conta.valor_total && conta.valor_total > 0 && !conta.concluida) {
      try {
        await pb.collection('contas_a_pagar').update(conta.id, {
          concluida: true,
        })
      } catch (errSync) {
        console.warn('Erro ao marcar conta como concluida após pagamento:', errSync)
      }
    }

    return pagamento
  },

  /**
   * Exclui um pagamento e remove o lançamento de caixa criado por ele
   */
  async excluirPagamento(pagamentoId: string): Promise<void> {
    const pag = await pb
      .collection('contas_a_pagar_pagamentos')
      .getOne<ContaAPagarPagamento>(pagamentoId)

    // 1. Remover lançamento correspondente no caixa (se houver)
    if (pag.caixa_lancamento) {
      try {
        await pb.collection('caixa_lancamentos').delete(pag.caixa_lancamento)
      } catch (errCaixa) {
        console.warn('Lançamento de caixa já não existe ou falhou ao excluir:', errCaixa)
      }
    }

    // 2. Excluir o pagamento
    await pb.collection('contas_a_pagar_pagamentos').delete(pagamentoId)

    // 3. Atualizar status de concluída da conta (se ficou menor que valor_total, desmarcar concluida)
    try {
      const conta = await pb.collection('contas_a_pagar').getOne<ContaAPagar>(pag.conta)
      const restantes = await pb
        .collection('contas_a_pagar_pagamentos')
        .getFullList<ContaAPagarPagamento>({
          filter: `conta = "${conta.id}"`,
        })
      const totalAtual = restantes.reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
      const quitada = totalAtual >= conta.valor_total && conta.valor_total > 0

      if (quitada !== !!conta.concluida) {
        await pb.collection('contas_a_pagar').update(conta.id, {
          concluida: quitada,
        })
      }
    } catch (errRecalc) {
      console.warn('Erro ao recalcular status da conta após exclusão de pagamento:', errRecalc)
    }
  },
}
