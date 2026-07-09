'use client'

import { useState, useMemo } from 'react'
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
import { Users, Plus, Search, Pencil, Trash2, Home, Phone, MapPin, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import { formatTanggal } from '@/lib/format'

interface WargaItem {
  id: string
  nik: string
  nama: string
  telepon: string | null
  alamat: string | null
  pekerjaan: string | null
  rumah: { id: string; blok: string; nomor: string; alamat: string } | null
  user: { email: string; phone: string | null; isActive: boolean; role?: string }
  userId: string
}

interface RumahItem {
  id: string
  nomor: string
  blok: string
  alamat: string
  tipe: string | null
  warga: Array<{ id: string; nama: string; nik: string; telepon: string | null }>
}

export function WargaView() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [blokFilter, setBlokFilter] = useState('all')
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<WargaItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<WargaItem | null>(null)

  const { data, isLoading } = useQuery<{ data: WargaItem[] }>({
    queryKey: ['warga', search, blokFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (blokFilter !== 'all') params.set('blok', blokFilter)
      const res = await fetch(`/api/warga?${params}`)
      if (!res.ok) throw new Error('Gagal memuat data warga')
      return res.json()
    },
  })

  const { data: rumahData } = useQuery<{ data: RumahItem[] }>({
    queryKey: ['rumah'],
    queryFn: async () => {
      const res = await fetch('/api/rumah')
      if (!res.ok) throw new Error('Gagal memuat rumah')
      return res.json()
    },
  })

  const blokOptions = useMemo(() => {
    const set = new Set(rumahData?.data?.map((r) => r.blok) || [])
    return Array.from(set).sort()
  }, [rumahData])

  const createMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/warga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal menambah')
      return d
    },
    onSuccess: () => {
      toast.success('Warga berhasil ditambahkan')
      qc.invalidateQueries({ queryKey: ['warga'] })
      qc.invalidateQueries({ queryKey: ['rumah'] })
      setOpenForm(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/warga', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal update')
      return d
    },
    onSuccess: () => {
      toast.success('Data warga diperbarui')
      qc.invalidateQueries({ queryKey: ['warga'] })
      setOpenForm(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/warga?id=${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal hapus')
      return d
    },
    onSuccess: () => {
      toast.success('Warga dihapus')
      qc.invalidateQueries({ queryKey: ['warga'] })
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const isAdmin = session?.user?.role === 'ADMIN'

  const onSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    const body: Record<string, unknown> = {
      nama: fd.get('nama'),
      nik: fd.get('nik'),
      email: fd.get('email'),
      telepon: fd.get('telepon'),
      alamat: fd.get('alamat'),
      pekerjaan: fd.get('pekerjaan'),
      rumahId: fd.get('rumahId') || null,
      blok: fd.get('blok'),
      nomor: fd.get('nomor'),
    }
    if (editing) {
      body.id = editing.id
      body.phone = fd.get('telepon')
      body.isActive = fd.get('isActive') === 'on'
      updateMut.mutate(body)
    } else {
      body.password = fd.get('password')
      createMut.mutate(body)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Warga"
        description="Kelola data warga perumahan"
        actions={
          isAdmin && (
            <Button
              onClick={() => {
                setEditing(null)
                setOpenForm(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Warga
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIK, atau telepon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={blokFilter} onValueChange={setBlokFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter blok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Blok</SelectItem>
                {blokOptions.map((b) => (
                  <SelectItem key={b} value={b}>Blok {b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <EmptyState
              title="Belum ada warga"
              description="Tambahkan data warga untuk mulai mengelola iuran."
              icon={Users}
            />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden md:table-cell">NIK</TableHead>
                    <TableHead>Rumah</TableHead>
                    <TableHead className="hidden lg:table-cell">Telepon</TableHead>
                    <TableHead className="hidden xl:table-cell">Email</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-medium">{w.nama}</div>
                        <div className="text-xs text-muted-foreground">{w.pekerjaan || '-'}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">{w.nik}</TableCell>
                      <TableCell>
                        {w.rumah ? (
                          <Badge variant="outline" className="font-normal">
                            <Home className="w-3 h-3 mr-1" /> Blok {w.rumah.blok} / {w.rumah.nomor}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Belum ada rumah</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{w.telepon || '-'}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{w.user.email}</TableCell>
                      <TableCell>
                        {w.user.isActive ? (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditing(w)
                                setOpenForm(true)
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(w)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <WargaFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        rumahList={rumahData?.data || []}
        submitting={createMut.isPending || updateMut.isPending}
        onSubmit={onSubmit}
      />

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Warga</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus <strong>{confirmDelete?.nama}</strong>? Tindakan ini juga menghapus akun login dan semua data iuran terkait. Tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WargaFormDialog({
  open,
  onOpenChange,
  editing,
  rumahList,
  submitting,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: WargaItem | null
  rumahList: RumahItem[]
  submitting: boolean
  onSubmit: (form: HTMLFormElement) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Warga' : 'Tambah Warga Baru'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Perbarui informasi warga' : 'Daftarkan warga baru beserta akun login'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(e.currentTarget)
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap *</Label>
              <Input id="nama" name="nama" defaultValue={editing?.nama} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nik">NIK *</Label>
              <Input id="nik" name="nik" defaultValue={editing?.nik} maxLength={16} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" defaultValue={editing?.user.email} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telepon">Telepon (WA)</Label>
              <Input id="telepon" name="telepon" placeholder="62812..." defaultValue={editing?.telepon || editing?.user.phone || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pekerjaan">Pekerjaan</Label>
              <Input id="pekerjaan" name="pekerjaan" defaultValue={editing?.pekerjaan || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rumahId">Rumah</Label>
              <Select name="rumahId" defaultValue={editing?.rumah?.id || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rumah atau buat baru" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">(Buat rumah baru)</SelectItem>
                  {rumahList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Blok {r.blok} / No. {r.nomor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blok">Blok Rumah Baru</Label>
              <Input id="blok" name="blok" placeholder="A, B, C..." />
              <p className="text-xs text-muted-foreground">Hanya jika membuat rumah baru</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomor">Nomor Rumah Baru</Label>
              <Input id="nomor" name="nomor" placeholder="A1, A2..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alamat">Alamat</Label>
            <Input id="alamat" name="alamat" defaultValue={editing?.alamat || ''} />
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="password">Password Awal *</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
              <p className="text-xs text-muted-foreground">Min. 6 karakter. Warga dapat login dengan email + password ini.</p>
            </div>
          )}
          {editing && (
            <div className="flex items-center space-x-2">
              <Checkbox id="isActive" name="isActive" defaultChecked={editing.user.isActive} />
              <Label htmlFor="isActive" className="cursor-pointer">Akun aktif</Label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Warga'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RumahView() {
  const qc = useQueryClient()
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<RumahItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<RumahItem | null>(null)

  const { data, isLoading } = useQuery<{ data: RumahItem[] }>({
    queryKey: ['rumah'],
    queryFn: async () => {
      const res = await fetch('/api/rumah')
      if (!res.ok) throw new Error('Gagal memuat rumah')
      return res.json()
    },
  })

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, unknown> & { id?: string }) => {
      const isEdit = !!body.id
      const res = await fetch('/api/rumah', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal menyimpan')
      return d
    },
    onSuccess: () => {
      toast.success('Rumah disimpan')
      qc.invalidateQueries({ queryKey: ['rumah'] })
      setOpenForm(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rumah?id=${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal hapus')
      return d
    },
    onSuccess: () => {
      toast.success('Rumah dihapus')
      qc.invalidateQueries({ queryKey: ['rumah'] })
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSubmit = (form: HTMLFormElement) => {
    const fd = new FormData(form)
    const body: Record<string, unknown> = {
      nomor: fd.get('nomor'),
      blok: fd.get('blok'),
      alamat: fd.get('alamat'),
      tipe: fd.get('tipe'),
    }
    if (editing) body.id = editing.id
    saveMut.mutate(body)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Rumah"
        description="Daftar unit rumah di perumahan"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setOpenForm(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Rumah
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState title="Belum ada rumah" description="Tambahkan unit rumah untuk mulai." icon={Home} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Home className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditing(r)
                        setOpenForm(true)
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(r)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold">Blok {r.blok} / No. {r.nomor}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {r.alamat || 'Tanpa alamat'}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Penghuni ({r.warga.length})</div>
                  {r.warga.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">Belum dihuni</div>
                  ) : (
                    <div className="space-y-1">
                      {r.warga.slice(0, 2).map((w) => (
                        <div key={w.id} className="text-xs flex items-center gap-1.5">
                          <UserPlus className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate">{w.nama}</span>
                        </div>
                      ))}
                      {r.warga.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{r.warga.length - 2} lainnya</div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rumah' : 'Tambah Rumah Baru'}</DialogTitle>
            <DialogDescription>{editing ? 'Perbarui informasi rumah' : 'Daftarkan unit rumah baru'}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit(e.currentTarget)
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blok">Blok *</Label>
                <Input id="blok" name="blok" defaultValue={editing?.blok} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomor">Nomor *</Label>
                <Input id="nomor" name="nomor" defaultValue={editing?.nomor} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipe">Tipe Rumah</Label>
              <Input id="tipe" name="tipe" placeholder="36/90, 45/100..." defaultValue={editing?.tipe || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat Lengkap</Label>
              <Input id="alamat" name="alamat" defaultValue={editing?.alamat || ''} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Rumah</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus <strong>Blok {confirmDelete?.blok} / No. {confirmDelete?.nomor}</strong>?
              {confirmDelete && confirmDelete.warga.length > 0 && (
                <span className="block mt-2 text-destructive">Rumah ini masih dihuni {confirmDelete.warga.length} warga dan tidak bisa dihapus.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending || (confirmDelete?.warga.length || 0) > 0}
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
            >
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
