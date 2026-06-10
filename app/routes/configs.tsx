import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "~/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Switch } from "~/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog"
import { Skeleton } from "~/components/ui/skeleton"
import { Badge } from "~/components/ui/badge"
import { createConfig, deleteConfig, fetchConfig, fetchConfigs, fetchModelStats, updateConfig } from "~/lib/api"
import type { ModelConfig, ModelStat, ConfigFormData } from "~/lib/types"
import { Plus, Pencil, Trash2 } from "lucide-react"

const PAGE_SIZE = 20

const EMPTY_FORM: ConfigFormData = {
  model_type: "",
  manufacturer: "",
  description: "",
  input_price: 0,
  output_price: 0,
  api_key: "",
  url: "",
  max_tokens: 2048,
  stream: true,
  temperature: 0.7,
  top_p: 0.9,
  n: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  agent_generate_type: "chat",
  route: "",
  is_enabled: 1,
}

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statsMap, setStatsMap] = useState<Record<string, ModelStat>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ConfigFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const [configData, statsData] = await Promise.all([
        fetchConfigs(page, PAGE_SIZE),
        fetchModelStats().catch(() => [] as ModelStat[]),
      ])
      setConfigs(configData.configs)
      setTotal(configData.total)
      const map: Record<string, ModelStat> = {}
      for (const s of statsData) {
        map[s.model] = s
      }
      setStatsMap(map)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadList()
  }, [loadList])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  async function openEdit(id: number) {
    try {
      const config = await fetchConfig(id)
      setEditingId(id)
      setForm({
        model_type: config.model_type,
        manufacturer: config.manufacturer,
        description: config.description,
        input_price: config.input_price,
        output_price: config.output_price,
        api_key: config.api_key,
        url: config.url,
        max_tokens: config.max_tokens,
        stream: config.stream,
        temperature: config.temperature,
        top_p: config.top_p,
        n: config.n,
        presence_penalty: config.presence_penalty,
        frequency_penalty: config.frequency_penalty,
        agent_generate_type: config.agent_generate_type,
        route: config.route,
        is_enabled: config.is_enabled,
      })
      setDialogOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载详情失败")
    }
  }

  async function handleSave() {
    if (!form.model_type || !form.api_key) {
      toast.error("模型标识和 API Key 为必填项")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateConfig(editingId, form)
        toast.success("更新成功")
      } else {
        await createConfig(form)
        toast.success("创建成功")
      }
      setDialogOpen(false)
      loadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteConfig(deleteTarget)
      toast.success("删除成功")
      setDeleteTarget(null)
      loadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败")
    }
  }

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>模型配置</CardTitle>
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" />
            新建配置
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模型</TableHead>
                    <TableHead>厂商</TableHead>
                    <TableHead>输入/输出单价</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>输入/输出Token</TableHead>
                    <TableHead>总费用</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    configs.map((c) => {
                      const stat = statsMap[c.model_type]
                      const totalCost = stat ? stat.total_input_cost + stat.total_output_cost : 0
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">{c.model_type}</TableCell>
                          <TableCell>{c.manufacturer}</TableCell>
                          <TableCell>
                            ¥{c.input_price?.toFixed(4)} / ¥{c.output_price?.toFixed(4)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.is_enabled === 1 ? "default" : "secondary"}>
                              {c.is_enabled === 1 ? "启用" : "禁用"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {stat ? `${formatTokens(stat.total_input_tokens)} / ${formatTokens(stat.total_output_tokens)}` : "-"}
                          </TableCell>
                          <TableCell>
                            {stat ? `¥${totalCost.toFixed(4)}` : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(c.id)}>
                                <Pencil />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c.id)}>
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>共 {total} 条</span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={page <= 1 ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                    <PaginationItem className="px-3 text-sm">{page} / {totalPages}</PaginationItem>
                    <PaginationItem>
                      <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={page >= totalPages ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}

          <ConfigFormDialog open={dialogOpen} onOpenChange={setDialogOpen} form={form} setForm={setForm} onSave={handleSave} saving={saving} isEdit={editingId !== null} />

          <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>确定要删除此模型配置吗？此操作不可撤销。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

function ConfigFormDialog({
  open, onOpenChange, form, setForm, onSave, saving, isEdit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void
  form: ConfigFormData; setForm: (f: ConfigFormData) => void
  onSave: () => void; saving: boolean; isEdit: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑配置" : "新建配置"}</DialogTitle>
          <DialogDescription>填写模型配置信息，单价单位为 ¥/1M tokens。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="model_type">模型标识 *</Label>
              <Input id="model_type" value={form.model_type} onChange={(e) => setForm({ ...form, model_type: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="manufacturer">厂商</Label>
              <Input id="manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">描述</Label>
            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="input_price">输入单价 (¥/1M)</Label>
              <Input id="input_price" type="number" step="any" value={form.input_price} onChange={(e) => setForm({ ...form, input_price: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="output_price">输出单价 (¥/1M)</Label>
              <Input id="output_price" type="number" step="any" value={form.output_price} onChange={(e) => setForm({ ...form, output_price: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api_key">API Key *</Label>
            <Input id="api_key" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="url">API URL</Label>
            <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input id="max_tokens" type="number" value={form.max_tokens} onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" type="number" step="any" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="top_p">Top P</Label>
              <Input id="top_p" type="number" step="any" value={form.top_p} onChange={(e) => setForm({ ...form, top_p: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="agent_generate_type">生成类型</Label>
              <Select value={form.agent_generate_type} onValueChange={(v) => setForm({ ...form, agent_generate_type: v })}>
                <SelectTrigger id="agent_generate_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">chat</SelectItem>
                  <SelectItem value="completion">completion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="n">N</Label>
              <Input id="n" type="number" value={form.n} onChange={(e) => setForm({ ...form, n: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="route">路由</Label>
              <Input id="route" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="stream">流式输出</Label>
            <Switch id="stream" checked={form.stream} onCheckedChange={(v) => setForm({ ...form, stream: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="is_enabled">启用</Label>
            <Switch id="is_enabled" checked={form.is_enabled === 1} onCheckedChange={(v) => setForm({ ...form, is_enabled: v ? 1 : 0 })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
