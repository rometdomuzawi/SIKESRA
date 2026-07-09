'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, EmptyState } from '@/components/ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { UserCog, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import { formatTanggal } from '@/lib/format'

interface UserItem {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'BENDAHARA' | 'KETUA' | 'WARGA'
  phone: string | null
  isActive: boolean
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  BENDAHARA: 'Bendahara',
  KETUA: 'Ketua',
  WARGA: 'Warga',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 hover:bg-red-100',
  BENDAHARA: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  KETUA: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  WARGA: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
}

export function UsersView() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserItem | null>(null)

  const { data, isLoading } = useQuery<{ data: UserItem[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Gagal memuat users')
      return res.json()
    },
  })

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, unknown> & { id?: string }) => {
      const isEdit = !!body.id
      const res = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal menyimpan')
      return d
    },
    onSuccess: () => {
      toast.success('User disimpan')
      qc.invalidateQueries({ queryKey: ['users'] })
      setOpenForm(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal hapus')
      return d
    },
    onSuccess: () => {
      toast.success('User dihapus')
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    const body: Record<string, unknown> = {
      email: fd.get('email'),
      name: fd.get('name'),
      role: fd.get('role'),
      phone: fd.get('phone'),
    }
    const password = fd.get('password')
    if (password) body.password = password
    if (editing) {
      body.id = editing.id
      body.isActive = fd.get('isActive') === 'on'
    }
    saveMut.mutate(body)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen User"
        description="Kelola akun pengguna sistem"
        actions={
          <Button onClick={() => { setEditing(null); setOpenForm(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah User
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data?.data?.length ? (
            <EmptyState title="Belum ada user" icon={UserCog} />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Telepon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{u.phone || '-'}</TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatTanggal(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(u); setOpenForm(true) }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {u.id !== session?.user?.id && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(u)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
            <DialogDescription>{editing ? 'Perbarui data user' : 'Daftarkan akun pengguna baru'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(e.currentTarget) }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input name="name" defaultValue={editing?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input name="email" type="email" defaultValue={editing?.email} required />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input name="phone" defaultValue={editing?.phone || ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select name="role" defaultValue={editing?.role || 'WARGA'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="BENDAHARA">Bendahara</SelectItem>
                  <SelectItem value="KETUA">Ketua</SelectItem>
                  <SelectItem value="WARGA">Warga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Password {editing ? '(kosongkan jika tidak diubah)' : '*'}</Label>
              <Input name="password" type="password" minLength={editing ? 0 : 6} required={!editing} placeholder={editing ? '••••••' : 'Min. 6 karakter'} />
            </div>
            {editing && (
              <div className="flex items-center space-x-2">
                <Checkbox id="isActive" name="isActive" defaultChecked={editing.isActive} />
                <Label htmlFor="isActive" className="cursor-pointer">Akun aktif</Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
              <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus User</DialogTitle>
            <DialogDescription>Yakin hapus <strong>{confirmDelete?.name}</strong>? Tindakan ini tidak bisa dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}>
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function PengaturanView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ data: Record<string, string> }>({
    queryKey: ['pengaturan'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan')
      if (!res.ok) throw new Error('Gagal memuat pengaturan')
      return res.json()
    },
  })

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal simpan')
      return d
    },
    onSuccess: () => {
      toast.success('Pengaturan disimpan')
      qc.invalidateQueries({ queryKey: ['pengaturan'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    const body: Record<string, unknown> = {}
    fd.forEach((v, k) => { body[k] = v })
    saveMut.mutate(body)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const d = data?.data || {}

  return (
    <div className="space-y-5">
      <PageHeader title="Pengaturan" description="Konfigurasi sistem dan nilai default iuran" />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(e.currentTarget) }} className="space-y-5">
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Informasi Perumahan
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Perumahan</Label>
                  <Input name="NAMA_PERUMAHAN" defaultValue={d.NAMA_PERUMAHAN} />
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input name="ALAMAT_PERUMAHAN" defaultValue={d.ALAMAT_PERUMAHAN} />
                </div>
                <div className="space-y-2">
                  <Label>Ketua</Label>
                  <Input name="KETUA_KETUA" defaultValue={d.KETUA_KETUA} />
                </div>
                <div className="space-y-2">
                  <Label>Bendahara</Label>
                  <Input name="KETUA_BENDAHARA" defaultValue={d.KETUA_BENDAHARA} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-sm mb-3">Nilai Default Iuran (Rp)</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Iuran Sampah / bulan</Label>
                  <Input name="IURAN_SAMPAH" type="number" defaultValue={d.IURAN_SAMPAH} />
                </div>
                <div className="space-y-2">
                  <Label>Iuran Sosial / bulan</Label>
                  <Input name="IURAN_SOSIAL" type="number" defaultValue={d.IURAN_SOSIAL} />
                </div>
                <div className="space-y-2">
                  <Label>Tabungan Kurban / bulan</Label>
                  <Input name="IURAN_KURBAN" type="number" defaultValue={d.IURAN_KURBAN} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
