"use client"

import { useState, useRef, useEffect } from "react"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Send, X, Play, Pause } from "lucide-react"
import { useRouter } from "next/navigation"
import { logBusinessWarning } from "@/lib/utils/logger"

export default function RepairCreatePage() {
  const router = useRouter()
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [description, setDescription] = useState("")
  const [urgency, setUrgency] = useState<"low" | "normal" | "high">("normal")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(audioBlob)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      logBusinessWarning('报修创建', '无法访问麦克风', error)
      alert("无法访问麦克风，请检查权限设置")
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // 删除录音
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    audioChunksRef.current = []
  }

  // 播放/暂停录音
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // 提交报修
  const handleSubmit = async () => {
    if (!description.trim() && !audioBlob) {
      alert("请填写问题描述或录制语音")
      return
    }

    try {
      setIsSubmitting(true)

      const restaurantId = typeof window !== "undefined" 
        ? localStorage.getItem("restaurantId") 
        : null

      if (!restaurantId) {
        alert("未找到餐厅ID，请先登录")
        return
      }

      // 如果有音频，先上传音频
      let audioUrlValue: string | undefined = undefined
      if (audioBlob) {
        // 这里应该上传到云存储，暂时使用 base64 或直接发送 blob
        // 实际项目中应该上传到 Supabase Storage 或其他云存储
        const formData = new FormData()
        formData.append("audio", audioBlob, "repair-audio.webm")
        
        const uploadResponse = await fetch("/api/repair/upload-audio", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          audioUrlValue = uploadData.url
        }
      }

      // 提交报修工单
      const response = await fetch("/api/repair/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          description: description || "语音报修",
          urgency: urgency,
          service_type: "维修服务",
          audio_url: audioUrlValue,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert("报修提交成功！")
          router.push("/user-bound")
        } else {
          alert(`报修提交失败：${data.error || "未知错误"}`)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`报修提交失败：${errorData.error || "服务器错误"}`)
      }
    } catch (error) {
      logBusinessWarning('报修提交', '失败', error)
      alert("报修提交失败，请稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-foreground hover:bg-muted/50"
          >
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">一键报修</h1>
        </div>

        <Card className="glass-breath p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">问题描述</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请描述您遇到的问题..."
            className="theme-input w-full h-32 p-4 resize-none"
            style={{ borderRadius: 'var(--radius-input)' }}
          />
        </Card>

        <Card className="glass-breath p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">语音录入</h2>
          <div className="space-y-4">
            {!audioUrl ? (
              <div className="flex items-center justify-center">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-32 h-32 rounded-full ${
                    isRecording
                      ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                      : "bg-primary hover:bg-primary/90"
                  } text-primary-foreground`}
                  style={{ borderRadius: '50%' }}
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={togglePlayback}
                    variant="outline"
                    className="text-foreground border-border hover:bg-muted/50"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  <Button
                    onClick={deleteRecording}
                    variant="outline"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              {isRecording ? "正在录音..." : audioUrl ? "录音完成，可以播放或重新录制" : "点击麦克风开始录音"}
            </p>
          </div>
        </Card>

        <Card className="glass-breath p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">紧急程度</h2>
          <div className="grid grid-cols-3 gap-3">
            {(["low", "normal", "high"] as const).map((level) => (
              <Button
                key={level}
                onClick={() => setUrgency(level)}
                variant={urgency === level ? "default" : "outline"}
                className={
                  urgency === level
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "border-border text-foreground hover:bg-muted/50"
                }
              >
                {level === "low" ? "低" : level === "normal" ? "中" : "高"}
              </Button>
            ))}
          </div>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (!description.trim() && !audioBlob)}
          className="theme-button w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg"
        >
          {isSubmitting ? (
            "提交中..."
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              提交报修
            </>
          )}
        </Button>
      </div>
      <BottomNavigation />
    </main>
  )
}
