import { db, auth } from '../firebase/admin'
import { v4 as uuid } from 'uuid'

export class AuthService {
  async login(idToken: string) {
    const decoded = await auth.verifyIdToken(idToken)
    const userDoc = await db.collection('usuarios').doc(decoded.uid).get()

    if (!userDoc.exists) {
      throw Object.assign(new Error('Usuário não cadastrado no sistema'), { statusCode: 403 })
    }

    const user = userDoc.data()!
    if (!user.ativo) {
      throw Object.assign(new Error('Usuário inativo'), { statusCode: 403 })
    }

    await db.collection('usuarios').doc(decoded.uid).update({ ultimoLogin: new Date().toISOString() })
    return { uid: decoded.uid, ...user }
  }

  async buscarPerfil(uid: string) {
    const doc = await db.collection('usuarios').doc(uid).get()
    if (!doc.exists) throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
    return { id: doc.id, ...doc.data() }
  }

  async criarUsuario(data: {
    nome: string; email: string; senha: string; role: string; proprietarioId?: string
  }) {
    const userRecord = await auth.createUser({
      email: data.email,
      password: data.senha,
      displayName: data.nome,
    })

    const usuarioData = {
      id: userRecord.uid,
      nome: data.nome,
      email: data.email,
      role: data.role,
      ativo: true,
      proprietarioId: data.proprietarioId || null,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }

    await db.collection('usuarios').doc(userRecord.uid).set(usuarioData)
    return usuarioData
  }

  async alterarSenha(uid: string, novaSenha: string) {
    await auth.updateUser(uid, { password: novaSenha })
  }
}
