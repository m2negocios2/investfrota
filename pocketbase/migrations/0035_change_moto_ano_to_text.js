migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('motos')
    const existingField = col.fields.getByName('ano')

    // Se já for TextField, nada a fazer
    if (existingField && existingField.type === 'text') {
      return
    }

    // 1. Criar novo campo de texto temporário ano_txt
    if (!col.fields.getByName('ano_txt')) {
      col.fields.add(new TextField({ name: 'ano_txt', required: false }))
      app.save(col)
    }

    // 2. Copiar os dados existentes da coluna ano (number) para ano_txt (text)
    app
      .db()
      .newQuery(`
      UPDATE motos 
      SET ano_txt = CAST(ano AS TEXT)
      WHERE ano IS NOT NULL AND (ano_txt IS NULL OR ano_txt = '')
    `)
      .execute()

    // 3. Remover o campo ano antigo e salvar
    col.fields.removeByName('ano')
    app.save(col)

    // 4. Recriar o campo ano como TextField
    col.fields.add(new TextField({ name: 'ano', required: false }))
    app.save(col)

    // 5. Copiar os dados de ano_txt de volta para ano
    app
      .db()
      .newQuery(`
      UPDATE motos 
      SET ano = ano_txt
      WHERE ano_txt IS NOT NULL AND ano_txt != ''
    `)
      .execute()

    // 6. Remover o campo temporário ano_txt
    col.fields.removeByName('ano_txt')
    app.save(col)

    // 7. Atualizar moto FAN para "2023/2024", conforme solicitado na tarefa
    app
      .db()
      .newQuery(`
      UPDATE motos
      SET ano = '2023/2024'
      WHERE UPPER(nome) = 'FAN' OR UPPER(modelo) LIKE '%FAN%'
    `)
      .execute()
  },
  (app) => {
    // Down migration: reverter para number (apenas para integridade da migração)
    const col = app.findCollectionByNameOrId('motos')
    col.fields.removeByName('ano')
    col.fields.add(new NumberField({ name: 'ano', required: false }))
    app.save(col)
  },
)
