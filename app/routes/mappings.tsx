import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog"
import { Skeleton } from "~/components/ui/skeleton"
import { createMapping, deleteMapping, fetchMapping, fetchMappings, updateMapping } from "~/lib/api"
import type { ModelMapping, MappingFormData } from "~/lib/types"
import { Plus, Pencil, Trash2 } from "lucide-react"

const EMPTY_FORM: MappingFormData = {
  model_type: "",
  manufacturer: "",
  description: "",
}

export default function MappingsPage() {
  const [mappings, setMappings] = useState<ModelMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<MappingFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMappings()
      setMappings(data.mappings)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

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
      const mapping = await fetchMapping(id)
      setEditingId(id)
      setForm({
        model_type: mapping.model_type,
        manufacturer: mapping.manufacturer,
        description: mapping.description,
      })
      setDialogOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载详情失败")
    }
  }

  async function handleSave() {
    if (!form.model_type || !form.manufacturer) {
      toast.error("模型类型和厂商为必填项")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateMapping(editingId, form)
        toast.success("更新成功")
      } else {
        await createMapping(form)
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
      await deleteMapping(deleteTarget)
      toast.success("删除成功")
      setDeleteTarget(null)
      loadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>模型映射管理</CardTitle>
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          新建映射
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>模型类型</TableHead>
                <TableHead>厂商</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.id}</TableCell>
                    <TableCell className="font-mono">{m.model_type}</TableCell>
                    <TableCell>{m.manufacturer}</TableCell>
                    <TableCell className="text-muted-foreground">{m.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m.id)}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(m.id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <MappingFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          saving={saving}
          isEdit={editingId !== null}
        />

        <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除映射 ID 为 <span className="font-mono">{deleteTarget}</span> 的记录吗？此操作不可撤销。
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

function MappingFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSave,
  saving,
  isEdit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  form: MappingFormData
  setForm: (f: MappingFormData) => void
  onSave: () => void
  saving: boolean
  isEdit: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑映射" : "新建映射"}</DialogTitle>
          <DialogDescription>填写模型映射的配置信息。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="model_type">模型类型 *</Label>
            <Input id="model_type" value={form.model_type} onChange={(e) => setForm({ ...form, model_type: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manufacturer">厂商 *</Label>
            <Input id="manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">描述</Label>
            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
