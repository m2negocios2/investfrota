migrate(
  (app) => {
    // 1. Atualizar descrições no caixa_lancamentos onde a categoria é SEGURANÇA (ou variações)
    // e a descrição contém a palavra 'Segurança', substituindo 'Segurança' por 'Seguro'
    // Preserva o sufixo (ex: "Segurança — FAN" -> "Seguro — FAN", "Segurança — J60" -> "Seguro — J60")
    try {
      app
        .db()
        .newQuery(`
        UPDATE caixa_lancamentos
        SET descricao = 'Seguro' || SUBSTR(descricao, 10)
        WHERE UPPER(TRIM(categoria)) = 'SEGURANÇA'
          AND (descricao LIKE 'Segurança%' OR descricao LIKE 'segurança%' OR descricao LIKE 'SEGURANÇA%')
      `)
        .execute()
    } catch (e) {
      console.log('Erro ao atualizar prefixo Segurança no caixa_lancamentos:', e)
    }

    // Caso haja algum registro no meio do texto ou com outro padrão de caixa
    try {
      app
        .db()
        .newQuery(`
        UPDATE caixa_lancamentos
        SET descricao = REPLACE(REPLACE(REPLACE(descricao, 'Segurança', 'Seguro'), 'SEGURANÇA', 'Seguro'), 'segurança', 'seguro')
        WHERE UPPER(TRIM(categoria)) = 'SEGURANÇA'
          AND (descricao LIKE '%Segurança%' OR descricao LIKE '%segurança%' OR descricao LIKE '%SEGURANÇA%')
      `)
        .execute()
    } catch (e) {
      console.log('Erro ao substituir Segurança no caixa_lancamentos:', e)
    }

    // 2. Mesma verificação defensiva para a tabela pagamentos caso haja algo registrado
    try {
      app
        .db()
        .newQuery(`
        UPDATE pagamentos
        SET descricao = REPLACE(REPLACE(REPLACE(descricao, 'Segurança', 'Seguro'), 'SEGURANÇA', 'Seguro'), 'segurança', 'seguro')
        WHERE UPPER(TRIM(categoria_nome)) = 'SEGURANÇA'
          AND (descricao LIKE '%Segurança%' OR descricao LIKE '%segurança%' OR descricao LIKE '%SEGURANÇA%')
      `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    // Reversão opcional (não estritamente necessária pois era correção de dados)
  },
)
