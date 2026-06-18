import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

export class AuthService {
  async login(email: string, senha: string) {
    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario) {
      throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 })
    }
    if (!usuario.ativo) {
      throw Object.assign(new Error('Usuário inativo'), { statusCode: 403 })
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha)
    if (!senhaValida) {
      throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 })
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    })

    const secret = process.env.JWT_SECRET!
    const token = jwt.sign(
      {
        sub: usuario.id,
        email: usuario.email,
        role: usuario.role,
        nome: usuario.nome,
        proprietarioId: usuario.proprietarioId,
      },
      secret,
      { expiresIn: '7d' }
    )

    const { senha: _senha, ...perfil } = usuario
    return { token, usuario: perfil }
  }

  async buscarPerfil(uid: string) {
    const usuario = await prisma.usuario.findUnique({ where: { id: uid } })
    if (!usuario) throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
    const { senha: _senha, ...perfil } = usuario
    return perfil
  }

  async criarUsuario(data: {
    nome: string
    email: string
    senha: string
    role: string
    proprietarioId?: string
  }) {
    const existe = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existe) {
      throw Object.assign(new Error('E-mail já cadastrado'), { statusCode: 409 })
    }

    const senhaHash = await bcrypt.hash(data.senha, 10)
    const usuario = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        role: data.role as any,
        ativo: true,
        proprietarioId: data.proprietarioId || null,
      },
    })

    const { senha: _senha, ...perfil } = usuario
    return perfil
  }

  async alterarSenha(uid: string, novaSenha: string) {
    const senhaHash = await bcrypt.hash(novaSenha, 10)
    await prisma.usuario.update({
      where: { id: uid },
      data: { senha: senhaHash },
    })
  }
}
