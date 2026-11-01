migrate(
  (app) => {
    // Atualizar no caixa_lancamentos onde a descrição contém ou inicia por 'Recebimento de aluguel' (case-insensitive)
    // para apenas 'Aluguel', garantindo que não altera valores, datas, categorias, vínculos ou comissões.
    try {
      app
        .db()
        .newQuery(`
        UPDATE caixa_lancamentos
        SET descricao = 'Aluguel'
        WHERE (
          LOWER(TRIM(descricao)) LIKE 'recebimento de aluguel%'
          OR LOWER(TRIM(descricao)) = 'recebimento de aluguel'
        )
      `)
        .execute()
    } catch (e) {
      console.log('Erro ao atualizar descricoes Recebimento de aluguel no caixa_lancamentos:', e)
    }
  },
  (app) => {
    // Reversão não necessária para correção de descrições
  },
)
