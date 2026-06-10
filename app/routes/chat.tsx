import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Skeleton } from "~/components/ui/skeleton"
import { ScrollArea } from "~/components/ui/scroll-area"
import { fetchModels, fetchHistory, fetchDialogues, streamChat, uploadFile } from "~/lib/api"
import type { ManufacturerGroup, DialogueSummary } from "~/lib/types"
import MarkdownRenderer from "~/components/markdown"
import { Paperclip, Plus, Send, MessageSquare, X } from "lucide-react"

const MAX_TITLE_LENGTH = 16

function truncateTitle(text: string): string {
  if (text.length <= MAX_TITLE_LENGTH) return text
  return text.slice(0, MAX_TITLE_LENGTH) + "..."
}

interface Message {
  role: "user" | "agent"
  content: string
  tokens?: number
  cost?: number
}

export default function ChatPage() {
  const [manufacturers, setManufacturers] = useState<ManufacturerGroup[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [dialogues, setDialogues] = useState<DialogueSummary[]>([])
  const [activeDialogueId, setActiveDialogueId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingDialogues, setLoadingDialogues] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchModels()
      .then((groups) => {
        setManufacturers(groups)
        if (groups.length > 0 && groups[0].models.length > 0 && !selectedModel) {
          setSelectedModel(groups[0].models[0].model)
        }
      })
      .catch(() => toast.error("加载模型列表失败"))
    loadDialogues()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function loadDialogues() {
    setLoadingDialogues(true)
    try {
      const list = await fetchDialogues()
      setDialogues(list)
    } catch {
      // silent
    } finally {
      setLoadingDialogues(false)
    }
  }

  async function selectDialogue(dialogueId: string) {
    setActiveDialogueId(dialogueId)
    setLoadingHistory(true)
    try {
      const records = await fetchHistory(dialogueId)
      const msgs: Message[] = []
      for (const r of records) {
        if (r.user_content) msgs.push({ role: "user", content: r.user_content })
        if (r.agent_content) {
          msgs.push({
            role: "agent",
            content: r.agent_content,
            tokens: r.total_tokens,
            cost: r.input_cost + r.output_cost,
          })
        }
      }
      setMessages(msgs)
    } catch {
      toast.error("加载历史失败")
    } finally {
      setLoadingHistory(false)
    }
  }

  function newChat() {
    setActiveDialogueId("")
    setMessages([])
    setImageUrls([])
  }

  async function handleSend() {
    const question = input.trim()
    if (!question || !selectedModel || streaming) return
    setInput("")

    const userMsg: Message = { role: "user", content: question }
    const agentMsg: Message = { role: "agent", content: "" }
    setMessages((prev) => [...prev, userMsg, agentMsg])

    const dialogueId = activeDialogueId || crypto.randomUUID()
    const recordId = crypto.randomUUID()

    if (!activeDialogueId) {
      setActiveDialogueId(dialogueId)
      setDialogues((prev) => [
        { dialogue_id: dialogueId, title: truncateTitle(question), message_count: 0, updated_time: "" },
        ...prev,
      ])
    }

    const urls = imageUrls
    setImageUrls([])
    setStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const body = await streamChat(selectedModel, question, dialogueId, recordId, urls, controller.signal)
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const raw = JSON.parse(line)
            const chunk = raw.result || raw
            if (chunk.code && chunk.code !== 0) {
              toast.error(chunk.message || "请求失败")
              break
            }
            if (chunk.error) {
              toast.error(chunk.error)
              break
            }
            if (chunk.content) {
              fullContent += chunk.content
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last && last.role === "agent") {
                  next[next.length - 1] = { ...last, content: fullContent }
                }
                return next
              })
            }
            if (chunk.done) {
              loadDialogues()
            }
          } catch {
            // skip invalid JSON lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "请求失败")
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setImageUrls((prev) => [...prev, url])
      toast.success("上传成功")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full p-4">
      <aside className="flex w-64 shrink-0 flex-col min-h-0 border-r">
        <div className="flex items-center justify-between p-3">
          <span className="text-sm font-medium">对话历史</span>
          <Button variant="ghost" size="sm" onClick={newChat}>
            <Plus />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {loadingDialogues ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : dialogues.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">暂无对话</p>
          ) : (
            <div className="flex flex-col gap-0.5 p-2">
              {dialogues.map((d) => (
                <button
                  key={d.dialogue_id}
                  onClick={() => selectDialogue(d.dialogue_id)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                    d.dialogue_id === activeDialogueId ? "bg-accent" : ""
                  }`}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{truncateTitle(d.title) || "新对话"}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <div className="flex flex-1 flex-col min-h-0">
        <header className="flex items-center gap-3 border-b px-4 py-2">
          <span className="text-sm text-muted-foreground">模型:</span>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {manufacturers.map((group) => (
                <SelectGroup key={group.manufacturer}>
                  <SelectLabel>{group.manufacturer}</SelectLabel>
                  {group.models.map((m) => (
                    <SelectItem key={m.model} value={m.model}>
                      {m.model}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {loadingHistory ? (
            <div className="flex flex-col gap-4 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                  <Skeleton className={`h-16 ${i % 2 === 0 ? "w-2/5" : "w-3/5"} rounded-xl`} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="mx-auto mb-3 size-10 opacity-30" />
                <p className="text-sm">选择模型，开始对话</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.content ? (
                      <>
                        {msg.role === "agent" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.tokens != null && msg.tokens > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {msg.tokens} tokens{msg.cost != null && msg.cost > 0 ? ` · ¥${msg.cost.toFixed(6)}` : ""}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t p-4">
          {imageUrls.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="group relative size-14 overflow-hidden rounded-md border">
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <Button variant="ghost" size="icon" disabled={streaming || uploading} onClick={() => fileInputRef.current?.click()} title="上传图片">
              <Paperclip className={uploading ? "animate-pulse" : ""} />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，Enter 发送..."
              disabled={streaming}
              className="flex-1"
            />
            {streaming ? (
              <Button variant="destructive" onClick={handleStop}>
                停止
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!input.trim() || !selectedModel}>
                <Send data-icon="inline-start" />
                发送
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
