import { useCallback, useEffect, useMemo, useState } from "react"
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
import { createStrategy, deleteStrategy, fetchStrategies, fetchStrategy, updateStrategy, fetchMappings } from "~/lib/api"
import type { Strategy, StrategyFormData, ModelMapping } from "~/lib/types"
import { Plus, Pencil, Trash2 } from "lucide-react"

const PAGE_SIZE = 20

const EMPTY_FORM: StrategyFormData = {
  api_key: "",
  agent_model: "",
  agent_manufacturer: "",
  agent_generate_type: "chat",
  url: "",
  max_tokens: 2048,
  stream: true,
  temperature: 0.7,
  top_p: 0.9,
  n: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  route: "primary",
  is_enabled: 1,
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [mappings, setMappings] = useState<ModelMapping[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [form, setForm] = useState<StrategyFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchStrategies(page, PAGE_SIZE)
      setStrategies(data.strategies)
      setTotal(data.total)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    fetchMappings().then((data) => setMappings(data.mappings)).catch(() => {})
  }, [])

  const manufacturers = useMemo(() => {
    const set = new Set(mappings.map((m) => m.manufacturer))
    return Array.from(set).sort()
  }, [mappings])

  const modelTypes = useMemo(() => {
    if (!form.agent_manufacturer) {
      const set = new Set(mappings.map((m) => m.model_type))
      return Array.from(set).sort()
    }
    const set = new Set(
      mappings
        .filter((m) => m.manufacturer === form.agent_manufacturer)
        .map((m) => m.model_type)
    )
    return Array.from(set).sort()
  }, [mappings, form.agent_manufacturer])

  function openCreate() {
    setEditingRuleId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  async function openEdit(ruleId: string) {
    try {
      const strategy = await fetchStrategy(ruleId)
      setEditingRuleId(ruleId)
      setForm({
        api_key: strategy.api_key,
        agent_model: strategy.agent_model,
        agent_manufacturer: strategy.agent_manufacturer,
        agent_generate_type: strategy.agent_generate_type,
        url: strategy.url,
        max_tokens: strategy.max_tokens,
        stream: strategy.stream,
        temperature: strategy.temperature,
        top_p: strategy.top_p,
        n: strategy.n,
        presence_penalty: strategy.presence_penalty,
        frequency_penalty: strategy.frequency_penalty,
        route: strategy.route,
        is_enabled: strategy.is_enabled,
      })
      setDialogOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载详情失败")
    }
  }

  async function handleSave() {
    if (!form.api_key || !form.agent_manufacturer) {
      toast.error("API Key 和厂商为必填项")
      return
    }
    setSaving(true)
    try {
      if (editingRuleId) {
        await updateStrategy(editingRuleId, form)
        toast.success("更新成功")
      } else {
        await createStrategy(form)
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
      await deleteStrategy(deleteTarget)
      toast.success("删除成功")
      setDeleteTarget(null)
      loadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败")
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>策略规则管理</CardTitle>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          新建策略
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
                  <TableHead>Rule ID</TableHead>
                  <TableHead>厂商</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>路由</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  strategies.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.rule_id}</TableCell>
                      <TableCell>{s.agent_manufacturer}</TableCell>
                      <TableCell>{s.agent_model}</TableCell>
                      <TableCell>{s.route}</TableCell>
                      <TableCell>
                        <Badge variant={s.is_enabled === 1 ? "default" : "secondary"}>
                          {s.is_enabled === 1 ? "启用" : "禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s.rule_id)}>
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s.rule_id)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {total} 条</span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  <PaginationItem className="px-3 text-sm">
                    {page} / {totalPages}
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}

        <StrategyFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          saving={saving}
          isEdit={editingRuleId !== null}
          manufacturers={manufacturers}
          modelTypes={modelTypes}
        />

        <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除策略 <span className="font-mono">{deleteTarget}</span> 吗？此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

function StrategyFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSave,
  saving,
  isEdit,
  manufacturers,
  modelTypes,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  form: StrategyFormData
  setForm: (f: StrategyFormData) => void
  onSave: () => void
  saving: boolean
  isEdit: boolean
  manufacturers: string[]
  modelTypes: string[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑策略" : "新建策略"}</DialogTitle>
          <DialogDescription>填写策略规则的配置信息。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="api_key">API Key *</Label>
            <Input id="api_key" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agent_manufacturer">厂商 *</Label>
            <Select
              value={form.agent_manufacturer}
              onValueChange={(v) => setForm({ ...form, agent_manufacturer: v, agent_model: "" })}
            >
              <SelectTrigger id="agent_manufacturer">
                <SelectValue placeholder="选择厂商" />
              </SelectTrigger>
              <SelectContent>
                {manufacturers.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agent_model">模型</Label>
            <Select
              value={form.agent_model}
              onValueChange={(v) => setForm({ ...form, agent_model: v })}
              disabled={!form.agent_manufacturer}
            >
              <SelectTrigger id="agent_model">
                <SelectValue placeholder={form.agent_manufacturer ? "选择模型" : "请先选择厂商"} />
              </SelectTrigger>
              <SelectContent>
                {modelTypes.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agent_generate_type">生成类型</Label>
            <Select value={form.agent_generate_type} onValueChange={(v) => setForm({ ...form, agent_generate_type: v })}>
              <SelectTrigger id="agent_generate_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">chat</SelectItem>
                <SelectItem value="completion">completion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input id="max_tokens" type="number" value={form.max_tokens} onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="top_p">Top P</Label>
              <Input id="top_p" type="number" step="0.1" value={form.top_p} onChange={(e) => setForm({ ...form, top_p: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="n">N</Label>
              <Input id="n" type="number" value={form.n} onChange={(e) => setForm({ ...form, n: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="presence_penalty">Presence Penalty</Label>
              <Input id="presence_penalty" type="number" step="0.1" value={form.presence_penalty} onChange={(e) => setForm({ ...form, presence_penalty: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="frequency_penalty">Frequency Penalty</Label>
              <Input id="frequency_penalty" type="number" step="0.1" value={form.frequency_penalty} onChange={(e) => setForm({ ...form, frequency_penalty: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="route">路由</Label>
            <Input id="route" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
