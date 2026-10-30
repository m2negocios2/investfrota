migrate(
  (app) => {
    // A moto TITAN foi vendida em maio de 2026.
    // Atualiza a data_saida da moto TITAN (e conta a receber correspondente, se houver) para 2026-05-19.
    const motosCol = app.findCollectionByNameOrId('motos')
    try {
      const titan = app.findFirstRecordByData('motos', 'placa', 'RZH8H41')
      titan.set('data_saida', '2026-05-19 12:00:00.000Z')
      app.save(titan)
    } catch (_) {
      // Se não encontrar por placa, tenta por nome
      try {
        const titan = app.findFirstRecordByData('motos', 'nome', 'TITAN')
        titan.set('data_saida', '2026-05-19 12:00:00.000Z')
        app.save(titan)
      } catch (__) {
        // Nada a fazer se a moto não existir (ex: banco zerado)
      }
    }

    try {
      const contasCol = app.findCollectionByNameOrId('contas_a_receber')
      const contas = app.findRecordsByFilter('contas_a_receber', 'descricao ~ "TITAN"', '', 10, 0)
      for (const c of contas) {
        c.set('data_vencimento', '2026-05-19 12:00:00.000Z')
        app.save(c)
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão (opcional)
  },
)
