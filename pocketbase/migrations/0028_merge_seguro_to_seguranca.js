migrate(
  (app) => {
    // 1. Garantir que a categoria SEGURANÇA exista em categorias_gastos
    let catCol
    try {
      catCol = app.findCollectionByNameOrId('categorias_gastos')
    } catch (_) {
      // Se não existir a coleção, nada a fazer
      return
    }

    let segurancaRec
    try {
      segurancaRec = app.findFirstRecordByData('categorias_gastos', 'nome', 'SEGURANÇA')
    } catch (_) {
      // Tentar com case insensitive ou Segurança
      try {
        const existing = app.findRecordsByFilter(
          'categorias_gastos',
          'nome ~ "SEGURANÇA" || nome ~ "Segurança" || nome ~ "segurança"',
          '',
          1,
          0,
        )
        if (existing && existing.length > 0) {
          segurancaRec = existing[0]
        }
      } catch (_) {}
    }

    if (!segurancaRec) {
      segurancaRec = new Record(catCol)
      segurancaRec.set('nome', 'SEGURANÇA')
      segurancaRec.set('descricao', 'Seguro contra terceiros, furto e roubo')
      app.save(segurancaRec)
    }

    // 2. Mover todos os lançamentos do Fluxo de Caixa com categoria SEGURO (qualquer variação de maiúsculas/minúsculas) para SEGURANÇA
    app
      .db()
      .newQuery(`
      UPDATE caixa_lancamentos
      SET categoria = 'SEGURANÇA'
      WHERE LOWER(TRIM(categoria)) = 'seguro'
    `)
      .execute()

    // Atualizar também na tabela pagamentos caso haja alguma referência com categoria ou categoria_nome = 'Seguro'
    try {
      app
        .db()
        .newQuery(`
        UPDATE pagamentos
        SET categoria_nome = 'SEGURANÇA'
        WHERE LOWER(TRIM(categoria_nome)) = 'seguro'
      `)
        .execute()
    } catch (_) {}

    // 3. Excluir os registros de categoria 'Seguro' / 'SEGURO' da coleção categorias_gastos
    try {
      app
        .db()
        .newQuery(`
        DELETE FROM categorias_gastos
        WHERE LOWER(TRIM(nome)) = 'seguro'
      `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    // Reversão opcional (não estritamente necessária, mas recria Seguro se aplicável)
    try {
      const catCol = app.findCollectionByNameOrId('categorias_gastos')
      const rec = new Record(catCol)
      rec.set('nome', 'Seguro')
      rec.set('descricao', 'Proteção veicular')
      app.save(rec)
    } catch (_) {}
  },
)
