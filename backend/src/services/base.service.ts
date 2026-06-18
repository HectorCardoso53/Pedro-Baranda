import prisma from '../lib/prisma'

type ModelName = keyof typeof prisma

// Map collection names to Prisma model delegates
function getDelegate(collection: string): any {
  const map: Record<string, any> = {
    proprietarios: (prisma as any).proprietario,
    regioes: (prisma as any).regiao,
    projetos: (prisma as any).projeto,
    areas: (prisma as any).area,
    quadras: (prisma as any).quadra,
    lotes: (prisma as any).lote,
    clientes: (prisma as any).cliente,
    vendas: (prisma as any).venda,
    parcelas: (prisma as any).parcela,
    pagamentos: (prisma as any).pagamento,
    contratos: (prisma as any).contrato,
    promissorias: (prisma as any).promissoria,
    movimentacoesFinanceiras: (prisma as any).movimentacaoFinanceira,
    repasses: (prisma as any).repasse,
    usuarios: (prisma as any).usuario,
  }
  return map[collection]
}

export class BaseService {
  protected collection: string

  constructor(collection: string) {
    this.collection = collection
  }

  protected delegate() {
    const d = getDelegate(this.collection)
    if (!d) throw new Error(`Model não encontrado para collection: ${this.collection}`)
    return d
  }

  protected notFound(entidade = 'Registro') {
    return Object.assign(new Error(`${entidade} não encontrado`), { statusCode: 404 })
  }

  async listar(filtros: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = {}
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        where[campo] = valor
      }
    }
    const records = await this.delegate().findMany({
      where,
      orderBy: { criadoEm: 'desc' },
    })
    return records
  }

  async buscar(id: string) {
    const record = await this.delegate().findUnique({ where: { id } })
    if (!record) throw this.notFound()
    return record
  }

  async criar(data: Record<string, unknown>) {
    // Remove undefined values
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) clean[k] = v
    }
    const record = await this.delegate().create({ data: clean })
    return record
  }

  async atualizar(id: string, data: Record<string, unknown>) {
    const exists = await this.delegate().findUnique({ where: { id } })
    if (!exists) throw this.notFound()

    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) clean[k] = v
    }

    const record = await this.delegate().update({ where: { id }, data: clean })
    return record
  }

  async deletar(id: string) {
    const exists = await this.delegate().findUnique({ where: { id } })
    if (!exists) throw this.notFound()
    await this.delegate().delete({ where: { id } })
  }
}
