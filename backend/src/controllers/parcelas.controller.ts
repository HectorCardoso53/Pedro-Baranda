import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../lib/prisma'
import { gerarPDF } from '../utils/pdf'
import { gerarPixCopiaECola, gerarQRCodeBase64 } from '../utils/pix'
import { successResponse } from '../utils/response'
import { format } from 'date-fns'

export class ParcelasController {
  async listar(req: AuthRequest, res: Response) {
    const where: Record<string, any> = {}
    const { vendaId, clienteId, status, projetoId } = req.query
    if (vendaId) where.vendaId = vendaId
    if (clienteId) where.clienteId = clienteId
    if (status) where.status = status
    if (projetoId) where.projetoId = projetoId
    const parcelas = await prisma.parcela.findMany({ where, orderBy: { vencimento: 'asc' } })
    return successResponse(res, parcelas)
  }

  async vencidas(_req: AuthRequest, res: Response) {
    const parcelas = await prisma.parcela.findMany({
      where: { status: 'vencida' },
      orderBy: { vencimento: 'asc' },
    })
    return successResponse(res, parcelas)
  }

  async buscar(req: AuthRequest, res: Response) {
    const parcela = await prisma.parcela.findUnique({ where: { id: req.params.id } })
    return successResponse(res, parcela)
  }

  async atualizar(req: AuthRequest, res: Response) {
    const parcela = await prisma.parcela.update({
      where: { id: req.params.id },
      data: req.body,
    })
    return successResponse(res, parcela)
  }

  async gerarPromissoria(req: AuthRequest, res: Response) {
    const parcela = await prisma.parcela.findUnique({ where: { id: req.params.id } })
    if (!parcela) throw Object.assign(new Error('Parcela não encontrada'), { statusCode: 404 })

    const [venda, cliente] = await Promise.all([
      prisma.venda.findUnique({ where: { id: parcela.vendaId } }),
      parcela.clienteId ? prisma.cliente.findUnique({ where: { id: parcela.clienteId } }) : null,
    ])

    let pixQrCode = null
    let pixCopiaECola = null

    if (parcela.proprietarioId) {
      const proprietario = await prisma.proprietario.findUnique({ where: { id: parcela.proprietarioId } })
      if (proprietario?.pixChave) {
        pixCopiaECola = gerarPixCopiaECola({
          chave: proprietario.pixChave,
          nome: proprietario.nome,
          cidade: process.env.PIX_CIDADE || 'Cidade',
          valor: parcela.valor,
          txid: req.params.id.substring(0, 25),
          descricao: `Parcela ${parcela.numero}`,
        })
        pixQrCode = await gerarQRCodeBase64(pixCopiaECola)
      }
    }

    const pdfUrl = await gerarPDF('promissoria', {
      parcela: { ...parcela, id: req.params.id },
      venda: { ...venda, id: parcela.vendaId },
      cliente,
      pixQrCode,
      pixCopiaECola,
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
      vencimentoFormatado: format(new Date(parcela.vencimento + 'T00:00:00'), 'dd/MM/yyyy'),
    }, `promissoria-${req.params.id}.pdf`)

    const agora = new Date()
    await prisma.parcela.update({
      where: { id: req.params.id },
      data: { promissoriaUrl: pdfUrl },
    })

    // Criar ou atualizar promissória
    const existente = await prisma.promissoria.findFirst({ where: { parcelaId: req.params.id } })
    if (!existente) {
      await prisma.promissoria.create({
        data: {
          parcelaId: req.params.id,
          vendaId: parcela.vendaId,
          clienteId: parcela.clienteId,
          proprietarioId: parcela.proprietarioId,
          numero: parcela.numero,
          valor: parcela.valor,
          vencimento: parcela.vencimento,
          status: 'ativa',
          pdfUrl,
          pixQrCode,
          pixCopiaECola,
        },
      })
    } else {
      await prisma.promissoria.update({
        where: { id: existente.id },
        data: { pdfUrl, pixQrCode, pixCopiaECola },
      })
    }

    return successResponse(res, { url: pdfUrl, pixQrCode, pixCopiaECola }, 'Promissória gerada com sucesso')
  }
}
