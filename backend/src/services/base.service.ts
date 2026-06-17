import { db } from '../firebase/admin'
import { v4 as uuid } from 'uuid'

export class BaseService {
  protected collection: string

  constructor(collection: string) {
    this.collection = collection
  }

  protected ref() {
    return db.collection(this.collection)
  }

  protected notFound(entidade = 'Registro') {
    return Object.assign(new Error(`${entidade} não encontrado`), { statusCode: 404 })
  }

  async listar(filtros: Record<string, unknown> = {}) {
    let query: FirebaseFirestore.Query = this.ref()
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        query = query.where(campo, '==', valor)
      }
    }
    query = query.orderBy('criadoEm', 'desc')
    const snap = await query.get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  async buscar(id: string) {
    const doc = await this.ref().doc(id).get()
    if (!doc.exists) throw this.notFound()
    return { id: doc.id, ...doc.data() }
  }

  async criar(data: Record<string, unknown>) {
    const agora = new Date().toISOString()
    const id = uuid()
    const docData = { ...data, criadoEm: agora, atualizadoEm: agora }
    await this.ref().doc(id).set(docData)
    return { id, ...docData }
  }

  async atualizar(id: string, data: Record<string, unknown>) {
    const doc = await this.ref().doc(id).get()
    if (!doc.exists) throw this.notFound()
    const updated = { ...data, atualizadoEm: new Date().toISOString() }
    await this.ref().doc(id).update(updated)
    return { id, ...doc.data(), ...updated }
  }

  async deletar(id: string) {
    const doc = await this.ref().doc(id).get()
    if (!doc.exists) throw this.notFound()
    await this.ref().doc(id).delete()
  }
}
