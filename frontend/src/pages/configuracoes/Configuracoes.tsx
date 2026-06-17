import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Users, Shield } from 'lucide-react'
import api from '@/lib/api'
import { ROLE_LABEL } from '@/utils/format'

export default function Configuracoes() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [novoUsuarioOpen, setNovoUsuarioOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'atendimento', proprietarioId: '' })

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/usuarios').then((r) => r.data.data),
  })

  const { data: proprietarios = [] } = useQuery({
    queryKey: ['proprietarios'],
    queryFn: () => api.get('/proprietarios').then((r) => r.data.data),
  })

  const criarUsuario = useMutation({
    mutationFn: () => api.post('/auth/criar-usuario', form),
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setNovoUsuarioOpen(false)
      setForm({ nome: '', email: '', senha: '', role: 'atendimento', proprietarioId: '' })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const toggleAtivo = useMutation({
    mutationFn: (id: string) => api.patch(`/usuarios/${id}/toggle-ativo`),
    onSuccess: () => {
      toast.success('Status alterado!')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })

  if (!isAdmin) return (
    <div className="p-8 text-center">
      <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-500">Acesso restrito a administradores</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gerenciamento de usuários e acessos" />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={16} />Usuários do Sistema
          </CardTitle>
          <Button size="sm" onClick={() => setNovoUsuarioOpen(true)}>
            <Plus size={14} className="mr-1" />Novo Usuário
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usuarios as any[]).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{ROLE_LABEL[u.role] || u.role}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => toggleAtivo.mutate(u.id)}>
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={novoUsuarioOpen} onOpenChange={setNovoUsuarioOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Senha inicial *</Label>
              <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Função *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.role === 'proprietario' && (
              <div className="space-y-1">
                <Label>Vincular ao Proprietário</Label>
                <Select onValueChange={(v) => setForm({ ...form, proprietarioId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o proprietário" /></SelectTrigger>
                  <SelectContent>
                    {proprietarios.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setNovoUsuarioOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarUsuario.mutate()} disabled={criarUsuario.isPending}>
              {criarUsuario.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
