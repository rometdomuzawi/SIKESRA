'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Settings, MessageCircle, FileText, ShieldCheck, Bot, CheckCircle2, XCircle, Loader2, TestTube, Save, AlertCircle, Send,
} from 'lucide-react'
import { toast } from 'sonner'

// ===================== MAIN =====================
export function PengaturanView() {
  return (
    <div className="space-y-5">
      <PageHeader title="Pengaturan" description="Konfigurasi sistem, WhatsApp, dan template pesan" />
      <Tabs defaultValue="umum">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="umum"><Settings className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Umum</span></TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageCircle className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">WhatsApp</span></TabsTrigger>
          <TabsTrigger value="template"><FileText className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Template</span></TabsTrigger>
        </TabsList>
        <TabsContent value="umum" className="mt-4"><PengaturanUmum /></TabsContent>
        <TabsContent value="whatsapp" className="mt-4"><WhatsAppConfig /></TabsContent>
        <TabsContent value="template" className="mt-4"><TemplateEditor /></TabsContent>
      </Tabs>
    </div>
  )
}

// ===================== PENGATURAN UMUM =====================
function PengaturanUmum() {
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

  if (isLoading) return <Skeleton className="h-96 w-full" />

  const d = data?.data || {}

  return (
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
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Iuran Sampah / bulan</Label>
                <Input name="IURAN_SAMPAH" type="number" defaultValue={d.IURAN_SAMPAH} />
              </div>
              <div className="space-y-2">
                <Label>Iuran Sosial / bulan</Label>
                <Input name="IURAN_SOSIAL" type="number" defaultValue={d.IURAN_SOSIAL} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={saveMut.isPending}>
              <Save className="w-4 h-4 mr-2" /> {saveMut.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ===================== WHATSAPP CONFIG =====================
interface WaConfigResponse {
  configured: boolean
  provider: string
  fonnteTokenSet: boolean
  fonnteTokenMasked: string | null
  twilioSidSet: boolean
  twilioFrom: string | null
}

function WhatsAppConfig() {
  const qc = useQueryClient()
  const [provider, setProvider] = useState('fonnte')
  const [fonnteToken, setFonnteToken] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; device?: { name: string; status: string; quota?: string; expired?: string }; error?: string } | null>(null)

  const { data, isLoading } = useQuery<WaConfigResponse>({
    queryKey: ['wa-config'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/wa')
      if (!res.ok) throw new Error('Gagal memuat config WA')
      return res.json()
    },
  })

  // Sync state dari server
  useState(() => {
    if (data) setProvider(data.provider)
  })

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/pengaturan/wa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal simpan')
      return d
    },
    onSuccess: () => {
      toast.success('Konfigurasi WhatsApp disimpan')
      qc.invalidateQueries({ queryKey: ['wa-config'] })
      qc.invalidateQueries({ queryKey: ['wa-status'] })
      setFonnteToken('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const testMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/pengaturan/wa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, fonnteToken, action: 'test' }),
      })
      const d = await res.json()
      if (!res.ok && !d.ok) throw new Error(d.error || 'Test gagal')
      return d
    },
    onSuccess: (d) => {
      setTestResult(d)
      if (d.ok) {
        toast.success('Koneksi Fonnte berhasil!')
      } else {
        toast.error(d.error || 'Test gagal')
      }
    },
    onError: (e: Error) => {
      toast.error(e.message)
      setTestResult({ ok: false, error: e.message })
    },
  })

  const [testPhone, setTestPhone] = useState('')
  const sendTestMut = useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch('/api/notifikasi/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal kirim test')
      return d
    },
    onSuccess: () => toast.success('Pesan test terkirim! Cek WhatsApp Anda.'),
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card className={data?.configured ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10'}>
        <CardContent className="p-5 flex items-start gap-3 flex-wrap">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${data?.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {data?.configured ? <Bot className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {data?.configured ? 'WhatsApp Otomatis Aktif' : 'Belum Dikonfigurasi'}
              </span>
              {data?.configured && (
                <Badge className="bg-emerald-100 text-emerald-700">{data.provider.toUpperCase()}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {data?.configured
                ? `Provider: ${data.provider}. Cron Vercel berjalan setiap hari jam 08:00 WIB untuk kirim pengingat otomatis.`
                : 'Pilih provider dan masukkan token untuk mengaktifkan kirim WhatsApp otomatis.'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              saveMut.mutate({
                provider,
                fonnteToken: fd.get('fonnteToken'),
                twilioSid: fd.get('twilioSid'),
                twilioToken: fd.get('twilioToken'),
                twilioFrom: fd.get('twilioFrom'),
              })
            }}
            className="space-y-5"
          >
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Provider WhatsApp
              </h3>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fonnte">Fonnte (Indonesia — Recommended)</SelectItem>
                    <SelectItem value="twilio">Twilio WhatsApp API (International)</SelectItem>
                    <SelectItem value="manual">Manual (wa.me link saja)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {provider === 'fonnte' && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h4 className="font-medium text-sm mb-2">Konfigurasi Fonnte</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Daftar di <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-primary underline">fonnte.com</a>, top-up credit, dan dapatkan token API di dashboard.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Token API Fonnte</Label>
                  <div className="flex gap-2">
                    <Input
                      name="fonnteToken"
                      type="password"
                      placeholder={data?.fonnteTokenSet ? `Token tersimpan (${data.fonnteTokenMasked})` : 'Masukkan token Fonnte'}
                      value={fonnteToken}
                      onChange={(e) => setFonnteToken(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testMut.mutate()}
                      disabled={testMut.isPending || (!fonnteToken && !data?.fonnteTokenSet)}
                    >
                      {testMut.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4 mr-2" />
                      )}
                      Test
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Token disimpan di database. Kosongkan jika tidak ingin mengubah.
                  </p>
                </div>

                {/* Test result */}
                {testResult && (
                  <div className={`rounded-md border p-4 text-sm ${testResult.ok ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-200 bg-rose-50 dark:bg-rose-900/20'}`}>
                    {testResult.ok ? (
                      <>
                        <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                          <CheckCircle2 className="w-4 h-4" /> Koneksi Berhasil
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>Device: <strong>{testResult.device?.name}</strong></div>
                          <div>Status: <Badge variant="outline" className="text-xs">{testResult.device?.status}</Badge></div>
                          {testResult.device?.quota && <div>Quota: <strong>{testResult.device.quota}</strong></div>}
                          {testResult.device?.expired && <div>Expired: <strong>{testResult.device.expired}</strong></div>}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                        <XCircle className="w-4 h-4" /> {testResult.error}
                      </div>
                    )}
                  </div>
                )}

                {/* Webhook info */}
                <div className="rounded-md bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-3 text-xs text-sky-800 dark:text-sky-300">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <strong>Webhook URL (opsional):</strong>
                      <code className="block mt-1 bg-white dark:bg-sky-900/30 px-2 py-1 rounded text-[11px] break-all">
                        {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/webhook/fonnte
                      </code>
                      <div className="mt-1">
                        Set URL ini di dashboard Fonnte → Webhook untuk menerima update status delivery (sampai, dibaca, gagal).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {provider === 'twilio' && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h4 className="font-medium text-sm mb-2">Konfigurasi Twilio</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Daftar di <a href="https://twilio.com/whatsapp" target="_blank" rel="noreferrer" className="text-primary underline">twilio.com/whatsapp</a> dan aktifkan WhatsApp Business API.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account SID</Label>
                    <Input name="twilioSid" placeholder={data?.twilioSidSet ? 'Tersimpan' : 'ACxxxx...'} defaultValue="" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp From</Label>
                    <Input name="twilioFrom" placeholder="whatsapp:+14155238886" defaultValue={data?.twilioFrom || ''} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Auth Token</Label>
                    <Input name="twilioToken" type="password" placeholder={data?.twilioSidSet ? 'Tersimpan' : 'Masukkan auth token'} />
                  </div>
                </div>
              </div>
            )}

            {provider === 'manual' && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                Mode manual: sistem hanya generate link wa.me. Bendahara harus klik "Buka WhatsApp" untuk mengirim pesan satu per satu.
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={saveMut.isPending}>
                <Save className="w-4 h-4 mr-2" /> {saveMut.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Kirim pesan test */}
      {data?.configured && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TestTube className="w-4 h-4" /> Kirim Pesan Test
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Kirim pesan WhatsApp test ke nomor tertentu untuk memastikan konfigurasi berfungsi.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="62812xxxxxxx"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button
                onClick={() => sendTestMut.mutate(testPhone)}
                disabled={sendTestMut.isPending || !testPhone}
              >
                {sendTestMut.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Kirim Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===================== TEMPLATE EDITOR =====================
interface TemplateResponse {
  templates: Record<string, string>
  defaults: Record<string, string>
  variables: Array<{ key: string; desc: string }>
}

function TemplateEditor() {
  const qc = useQueryClient()
  const [templates, setTemplates] = useState<Record<string, string>>({})
  const [activeJenis, setActiveJenis] = useState<'SAMPAH' | 'SOSIAL' | 'UMUM'>('SAMPAH')

  const { data, isLoading } = useQuery<TemplateResponse>({
    queryKey: ['template'],
    queryFn: async () => {
      const res = await fetch('/api/pengaturan/template')
      if (!res.ok) throw new Error('Gagal memuat template')
      return res.json()
    },
  })

  // Sync state
  useState(() => {
    if (data?.templates) setTemplates(data.templates)
  })

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await fetch('/api/pengaturan/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal simpan')
      return d
    },
    onSuccess: () => {
      toast.success('Template disimpan')
      qc.invalidateQueries({ queryKey: ['template'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />

  const currentTemplate = templates[activeJenis] || data?.templates[activeJenis] || ''
  const setCurrent = (val: string) => {
    setTemplates({ ...templates, [activeJenis]: val })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-sm mb-3">Template Pesan WhatsApp</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Kustomisasi pesan pengingat untuk masing-masing jenis iuran. Gunakan variabel <code className="bg-muted px-1 rounded">{'{{nama}}'}</code>, <code className="bg-muted px-1 rounded">{'{{bulan}}'}</code>, dll.
          </p>

          {/* Variabel tersedia */}
          <div className="rounded-md bg-muted/50 p-3 mb-4">
            <div className="text-xs font-semibold mb-2">Variabel yang tersedia:</div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {data?.variables.map((v) => (
                <div key={v.key} className="text-xs">
                  <code className="bg-background px-1.5 py-0.5 rounded text-primary">{v.key}</code>
                  <span className="text-muted-foreground ml-2">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab jenis */}
          <div className="flex gap-1 mb-3 border-b">
            {(['SAMPAH', 'SOSIAL', 'UMUM'] as const).map((j) => (
              <button
                key={j}
                onClick={() => setActiveJenis(j)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeJenis === j
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {j === 'SAMPAH' ? 'Iuran Sampah' : j === 'SOSIAL' ? 'Iuran Sosial' : 'Umum'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Template {activeJenis}</Label>
            <Textarea
              rows={8}
              value={currentTemplate}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={data?.defaults[activeJenis]}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Kosongkan untuk menggunakan template default.
            </p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (data?.defaults[activeJenis]) {
                  setCurrent(data.defaults[activeJenis])
                  toast.info('Template direset ke default (klik Simpan untuk menyimpan)')
                }
              }}
            >
              Reset ke Default
            </Button>
            <Button
              onClick={() => saveMut.mutate({ [activeJenis]: currentTemplate })}
              disabled={saveMut.isPending}
            >
              <Save className="w-4 h-4 mr-2" /> {saveMut.isPending ? 'Menyimpan...' : 'Simpan Template'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-sm mb-3">Preview Pesan</h3>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4 max-w-md">
            <div className="bg-white dark:bg-emerald-900/40 rounded-lg p-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">09:30</div>
              <p className="text-sm whitespace-pre-line text-foreground">
                {currentTemplate
                  .replaceAll('{{nama}}', 'Ahmad Fauzi')
                  .replaceAll('{{bulan}}', 'Juli')
                  .replaceAll('{{tahun}}', '2026')
                  .replaceAll('{{jenis}}', activeJenis === 'SAMPAH' ? 'Iuran Sampah' : 'Iuran Sosial')
                  .replaceAll('{{jumlah}}', 'Rp 30.000')
                  .replaceAll('{{pesan}}', 'Isi pesan kustom di sini.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
