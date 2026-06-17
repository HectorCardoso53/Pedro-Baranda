import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { db } from '../firebase/admin'
import { gerarPDF } from '../utils/pdf'
import { gerarPixCopiaECola, gerarQRCodeBase64 } from '../utils/pix'
import { successResponse } from '../utils/response'
import { format } from 'date-fns'

export class ParcelasController {
  async listar(req: AuthRequest, res: Response) {
    let query: FirebaseFirestore.Query = db.collection('parcelas')
    const { vendaId, clienteId, status, projetoId } = req.query
    if (vendaId) query = query.where('vendaId', '==', vendaId)
    if (clienteId) query = query.where('clienteId', '==', clienteId)
    if (status) query = query.where('status', '==', status)
    if (projetoId) query = query.where('projetoId', '==', projetoId)
    const snap = await query.orderBy('vencimento').get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async vencidas(_req: AuthRequest, res: Response) {
    const snap = await db.collection('parcelas').where('status', '==', 'vencida').orderBy('vencimento').get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async buscar(req: AuthRequest, res: Response) {
    const doc = await db.collection('parcelas').doc(req.params.id).get()
    if (!doc.exists) return successResponse(res, null)
    return successResponse(res, { id: doc.id, ...doc.data() })
  }

  async atualizar(req: AuthRequest, res: Response) {
    await db.collection('parcelas').doc(req.params.id).update({
      ...req.body,
      atualizadoEm: new Date().toISOString(),
    })
    const doc = await db.collection('parcelas').doc(req.params.id).get()
    return successResponse(res, { id: doc.id, ...doc.data() })
  }

  async gerarPromissoria(req: AuthRequest, res: Response) {
    const parcelaDoc = await db.collection('parcelas').doc(req.params.id).get()
    if (!parcelaDoc.exists) throw Object.assign(new Error('Parcela não encontrada'), { statusCode: 404 })

    const parcela = parcelaDoc.data()!
    const [vendaDoc, clienteDoc] = await Promise.all([
      db.collection('vendas').doc(parcela.vendaId).get(),
      db.collection('clientes').doc(parcela.clienteId).get(),
    ])

    const venda = vendaDoc.data()!
    const cliente = clienteDoc.data()!

    // Gerar PIX
    let pixQrCode = null
    let pixCopiaECola = null
    const proprietarioDoc = await db.collection('proprietarios').doc(parcela.proprietarioId).get()
    if (proprietarioDoc.exists) {
      const prop = proprietarioDoc.data()!
      if (prop.pixChave) {
        pixCopiaECola = gerarPixCopiaECola({
          chave: prop.pixChave,
          nome: prop.nome,
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

    const agora = new Date().toISOString()
    await db.collection('parcelas').doc(req.params.id).update({ promissoriaUrl: pdfUrl, atualizadoEm: agora })

    // Criar/atualizar promissória
    const promSnap = await db.collection('promissorias').where('parcelaId', '==', req.params.id).get()
    if (promSnap.empty) {
      await db.collection('promissorias').add({
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
        criadoEm: agora,
        atualizadoEm: agora,
      })
    } else {
      await promSnap.docs[0].ref.update({ pdfUrl, pixQrCode, pixCopiaECola, atualizadoEm: agora })
    }

    return successResponse(res, { url: pdfUrl, pixQrCode, pixCopiaECola }, 'Promissória gerada com sucesso')
  }
}
