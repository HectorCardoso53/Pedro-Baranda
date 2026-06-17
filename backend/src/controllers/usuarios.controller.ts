import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { db, auth } from '../firebase/admin'
import { successResponse } from '../utils/response'

export class UsuariosController {
  async listar(_req: AuthRequest, res: Response) {
    const snap = await db.collection('usuarios').orderBy('criadoEm', 'desc').get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async buscar(req: AuthRequest, res: Response) {
    const doc = await db.collection('usuarios').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
    return successResponse(res, { id: doc.id, ...doc.data() })
  }

  async atualizar(req: AuthRequest, res: Response) {
    const agora = new Date().toISOString()
    await db.collection('usuarios').doc(req.params.id).update({ ...req.body, atualizadoEm: agora })
    const doc = await db.collection('usuarios').doc(req.params.id).get()
    return successResponse(res, { id: doc.id, ...doc.data() })
  }

  async toggleAtivo(req: AuthRequest, res: Response) {
    const doc = await db.collection('usuarios').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
    const novoAtivo = !doc.data()!.ativo
    await Promise.all([
      db.collection('usuarios').doc(req.params.id).update({ ativo: novoAtivo, atualizadoEm: new Date().toISOString() }),
      auth.updateUser(req.params.id, { disabled: !novoAtivo }),
    ])
    return successResponse(res, { ativo: novoAtivo })
  }

  async alterarRole(req: AuthRequest, res: Response) {
    await db.collection('usuarios').doc(req.params.id).update({
      role: req.body.role,
      atualizadoEm: new Date().toISOString(),
    })
    return successResponse(res, null, 'Role atualizada com sucesso')
  }
}
