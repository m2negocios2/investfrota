migrate(
  (app) => {
    // Relato de bug: no início do mês aparecem 2 registros como pagos indevidamente na tela /semana.
    // Investigação identificou dois registros de recebimentos com status 'pago' para semanas futuras/atuais (W44 e W45):
    // 1) id '2npmp569qn97nmn' (observacoes: 'apenas_colorido', semana_ano: '2026-W44', vencimento 2026-10-31)
    // 2) id 'ugpsvabp171zi4v' (semana_ano: '2026-W45', vencimento 2026-11-07, com caixa_lancamento 'fd6vm2xt9398taf')
    // A usuária relatou: "o mes começou hoje, ainda não tem nada pago, nada registrado, portanto, todos os campos em neutro".
    // Esta migração remove os lançamentos indevidos no caixa e exclui os registros de recebimento indevidamente pagos.

    const targetRecIds = ['2npmp569qn97nmn', 'ugpsvabp171zi4v']

    for (const recId of targetRecIds) {
      // 1. Remover lançamentos de caixa vinculados (se houver)
      try {
        const caixas = app.findRecordsByFilter(
          'caixa_lancamentos',
          `recebimento = "${recId}" || comissao_de = "${recId}"`,
          '',
          50,
          0,
        )
        for (const c of caixas) {
          try {
            app.delete(c)
          } catch (_) {}
        }
      } catch (_) {}

      // 2. Remover o recebimento indevido
      try {
        const rec = app.findRecordById('recebimentos', recId)
        app.delete(rec)
      } catch (_) {}
    }

    // Limpeza defensiva de qualquer caixa_lancamento 'fd6vm2xt9398taf' residual
    try {
      const specificCaixa = app.findRecordById('caixa_lancamentos', 'fd6vm2xt9398taf')
      app.delete(specificCaixa)
    } catch (_) {}
  },
  (app) => {
    // Reversão não necessária para limpeza de dados corrompidos/indevidos
  },
)
