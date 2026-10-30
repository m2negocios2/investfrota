migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('motos')

    // 1. Adicionar campo data_fim_locacao (DateField) se ainda não existir
    if (!col.fields.getByName('data_fim_locacao')) {
      col.fields.add(
        new DateField({
          name: 'data_fim_locacao',
          required: false,
        }),
      )
      app.save(col)
    }

    // 2. Registrar na TITAN a data fim da locação: 2026-03-20 (20/03/2026 às 12:00 UTC)
    // Aplica apenas à TITAN (por placa RZH8H41 ou nome/modelo TITAN), sem tocar nas outras motos
    try {
      const titan = app.findFirstRecordByData('motos', 'placa', 'RZH8H41')
      titan.set('data_fim_locacao', '2026-03-20 12:00:00.000Z')
      app.save(titan)
    } catch (_) {
      try {
        const titan = app.findFirstRecordByData('motos', 'nome', 'TITAN')
        titan.set('data_fim_locacao', '2026-03-20 12:00:00.000Z')
        app.save(titan)
      } catch (__) {
        // Nada a fazer se a moto não existir (ex: banco vazio em novo ambiente)
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('motos')
    if (col.fields.getByName('data_fim_locacao')) {
      col.fields.removeByName('data_fim_locacao')
      app.save(col)
    }
  },
)
