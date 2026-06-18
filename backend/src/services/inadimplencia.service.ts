import prisma from '../lib/prisma'
import { format, isBefore, parseISO } from 'date-fns'
import logger from '../utils/logger'

export class InadimplenciaService {
  async processar() {
    const hoje = format(new Date(), 'yyyy-MM-dd')
    let count = 0

    const parcelas = await prisma.parcela.findMany({ where: { status: 'pendente' } })

    const agora = new Date()
    const aAtualizar: string[] = []

    for (const parcela of parcelas) {
      if (isBefore(parseISO(parcela.vencimento), parseISO(hoje))) {
        aAtualizar.push(parcela.id)
        count++
      }
    }

    if (aAtualizar.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.parcela.updateMany({
          where: { id: { in: aAtualizar } },
          data: { status: 'vencida' },
        })
        await tx.promissoria.updateMany({
          where: { parcelaId: { in: aAtualizar }, status: 'ativa' },
          data: { status: 'vencida' },
        })
      })
    }

    logger.info(`Inadimplência processada: ${count} parcelas marcadas como vencidas`)
    return { processadas: count }
  }

  async listar(filtros: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = { status: 'vencida' }
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') where[k] = v
    }

    const parcelas = await prisma.parcela.findMany({
      where,
      orderBy: { vencimento: 'asc' },
    })

    const clienteIds = [...new Set(parcelas.map((p) => p.clienteId).filter(Boolean))] as string[]
    const clientes = await prisma.cliente.findMany({ where: { id: { in: clienteIds } } })
    const clienteMap: Record<string, any> = {}
    for (const c of clientes) clienteMap[c.id] = c

    return parcelas.map((p) => ({
      ...p,
      cliente: p.clienteId && clienteMap[p.clienteId]
        ? { nome: clienteMap[p.clienteId].nome, celular: clienteMap[p.clienteId].celular }
        : null,
    }))
  }

  async resumo() {
    const parcelas = await prisma.parcela.findMany({ where: { status: 'vencida' } })
    const totalParcelas = parcelas.length
    const valorTotal = parcelas.reduce((acc, p) => acc + (p.valor || 0), 0)

    const porProjeto: Record<string, { count: number; valor: number; projetoId: string }> = {}
    for (const p of parcelas) {
      if (!p.projetoId) continue
      if (!porProjeto[p.projetoId]) porProjeto[p.projetoId] = { count: 0, valor: 0, projetoId: p.projetoId }
      porProjeto[p.projetoId].count++
      porProjeto[p.projetoId].valor += p.valor || 0
    }

    return { totalParcelas, valorTotal, porProjeto: Object.values(porProjeto) }
  }

  async porProjeto() {
    const parcelas = await prisma.parcela.findMany({ where: { status: 'vencida' } })

    const agrupado: Record<string, any> = {}
    for (const p of parcelas) {
      if (!p.projetoId) continue
      if (!agrupado[p.projetoId]) {
        agrupado[p.projetoId] = { projetoId: p.projetoId, total: 0, valor: 0, clientes: new Set() }
      }
      agrupado[p.projetoId].total++
      agrupado[p.projetoId].valor += p.valor || 0
      if (p.clienteId) agrupado[p.projetoId].clientes.add(p.clienteId)
    }

    return Object.values(agrupado).map((g: any) => ({
      projetoId: g.projetoId,
      total: g.total,
      valor: g.valor,
      clientesUnicos: g.clientes.size,
    }))
  }
}
