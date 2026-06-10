import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { useAuth } from "~/hooks/use-auth"
import { updateAvatar, updateNickname, updatePassword } from "~/lib/auth"
import { uploadFile } from "~/lib/api"
import { Upload } from "lucide-react"
import defaultAvatar from "~/svg/default.svg"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, refreshUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState(user?.display_name || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const nicknameChanged = nickname.trim() && nickname !== user?.display_name
  const avatarChanged = avatarUrl && avatarUrl !== user?.avatar_url
  const passwordFilled = oldPassword && newPassword
  const hasChanges = nicknameChanged || avatarChanged || passwordFilled

  // handleFileChange 上传头像文件并设置预览
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setAvatarUrl(url)
      toast.success("头像上传成功")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // handleSave 统一保存所有修改
  async function handleSave() {
    if (!hasChanges) return
    setSaving(true)
    try {
      if (passwordFilled) {
        if (newPassword.length < 6) {
          toast.error("新密码至少 6 位")
          setSaving(false)
          return
        }
        await updatePassword(oldPassword, newPassword)
        setOldPassword("")
        setNewPassword("")
        setShowPassword(false)
      }
      if (avatarChanged) {
        await updateAvatar(avatarUrl)
      }
      if (nicknameChanged) {
        await updateNickname(nickname.trim())
      }
      await refreshUser()
      toast.success("保存成功")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const displayAvatar = avatarUrl || user?.avatar_url || defaultAvatar

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>个人信息</DialogTitle>
          <DialogDescription>修改你的个人资料和密码</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="group relative shrink-0" title="点击更换头像">
              <Avatar className="size-14 ring-offset-background transition-opacity group-hover:opacity-80 group-disabled:opacity-50">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback>
                  <img src={defaultAvatar} alt="" className="size-full" />
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Upload className="size-5 text-white" />
              </span>
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.display_name}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{user?.user_id}</p>
              <Badge variant={user?.status === 1 ? "default" : "secondary"} className="mt-1">
                {user?.status === 1 ? "正常" : "禁用"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-nickname">昵称</Label>
            <Input
              id="profile-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称"
            />
          </div>

          {!showPassword ? (
            <Button variant="ghost" className="w-full" onClick={() => setShowPassword(true)}>
              修改密码
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Separator />
              <Label className="text-sm font-medium">修改密码</Label>
              <div className="flex flex-col gap-2">
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="当前密码"
                />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新密码（至少 6 位）"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
