import { useState } from "react"
import { Navigate } from "react-router"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { useAuth } from "~/hooks/use-auth"

export default function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const [tab, setTab] = useState<"login" | "register">("login")
  const [submitting, setSubmitting] = useState(false)

  // login fields
  const [identifier, setIdentifier] = useState("")
  const [credential, setCredential] = useState("")

  // register fields
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <span className="text-muted-foreground text-sm">加载中...</span>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/chat" replace />
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier || !credential) return
    setSubmitting(true)
    try {
      await login(identifier, credential)
      toast.success("登录成功")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!account || !password) return
    setSubmitting(true)
    try {
      await register(account, password, displayName || undefined, avatarUrl || undefined)
      toast.success("注册成功")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注册失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-svh items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">Mint Admin</CardTitle>
          <CardDescription className="text-center">
            <span className="inline-flex rounded-md border">
              <button
                type="button"
                className={`px-4 py-1.5 text-sm rounded-l-md ${tab === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => setTab("login")}
              >
                登录
              </button>
              <button
                type="button"
                className={`px-4 py-1.5 text-sm rounded-r-md ${tab === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => setTab("register")}
              >
                注册
              </button>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">账号</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="请输入账号"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credential">密码</Label>
                <Input
                  id="credential"
                  type="password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "登录中..." : "登录"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-account">账号</Label>
                <Input
                  id="reg-account"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="请输入账号"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">密码</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-nickname">展示名称（可选）</Label>
                <Input
                  id="reg-nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="填写后展示给其他人"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-avatar">头像地址（可选）</Label>
                <Input
                  id="reg-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "注册中..." : "注册"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
