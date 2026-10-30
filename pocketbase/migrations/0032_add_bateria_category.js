migrate(
  (app) => {
    let catCol
    try {
      catCol = app.findCollectionByNameOrId('categorias_gastos')
    } catch (_) {
      // Se não existir a coleção (banco vazio ou ambiente novo sem 0008), encerra sem erro
      return
    }

    const catBateria = {
      nome: 'BATERIA',
      descricao: 'Bateria para motos, substituições, recargas e manutenção elétrica',
    }

    try {
      // Busca se já existe pelo nome exato ou maiúsculo
      const existing = app.findRecordsByFilter(
        'categorias_gastos',
        `nome ~ "${catBateria.nome}"`,
        '',
        1,
        0,
      )
      if (existing && existing.length > 0) {
        return
      }
    } catch (_) {}

    try {
      const rec = new Record(catCol)
      rec.set('nome', catBateria.nome)
      rec.set('descricao', catBateria.descricao)
      app.save(rec)
    } catch (_) {}
  },
  (app) => {
    // Reversão opcional (não estritamente necessária)
    try {
      const recs = app.findRecordsByFilter('categorias_gastos', 'nome = "BATERIA"', '', 1, 0)
      if (recs && recs[0]) {
        app.delete(recs[0])
      }
    } catch (_) {}
  },
)
