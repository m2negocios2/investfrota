migrate(
  (app) => {
    // Vincular lançamentos de caixa que já foram criados por pagamentos de contas a pagar
    // mas que estavam com o campo conta_a_pagar vazio
    app
      .db()
      .newQuery(`
      UPDATE caixa_lancamentos
      SET conta_a_pagar = (
        SELECT conta FROM contas_a_pagar_pagamentos
        WHERE contas_a_pagar_pagamentos.caixa_lancamento = caixa_lancamentos.id
        LIMIT 1
      )
      WHERE (conta_a_pagar IS NULL OR conta_a_pagar = '')
        AND id IN (
          SELECT caixa_lancamento FROM contas_a_pagar_pagamentos
          WHERE caixa_lancamento IS NOT NULL AND caixa_lancamento != ''
        )
    `)
      .execute()
  },
  (app) => {
    // Reversão não é necessária / sem efeito adverso
  },
)
