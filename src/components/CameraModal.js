'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react'

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)

  const startCamera = async () => {
    setError(null)
    setCameraActive(false)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setTimeout(() => {
        startCamera()
      }, 0)
    }
    return () => {
      if (timer) clearTimeout(timer)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [isOpen])

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      onCapture(canvas.toDataURL('image/png'))
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#1a1a1a] border border-white/[0.08] rounded-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-brand-purple" />
            Tirar Foto
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Feed */}
        <div className="aspect-square bg-black relative flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <span className="text-[13px] text-red-400 leading-relaxed">{error}</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {!cameraActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
              <span className="text-zinc-500 text-[13px]">Inicializando câmera...</span>
            </div>
          )}
        </div>

        {/* Capture */}
        <div className="p-5 flex justify-center border-t border-white/[0.06]">
          <button
            onClick={capturePhoto}
            disabled={!cameraActive}
            className="w-16 h-16 rounded-full border-4 border-white bg-brand-purple active:bg-brand-purple/80 shadow-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:scale-95"
            title="Capturar"
          >
            <div className="w-10 h-10 rounded-full bg-white active:scale-90 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}
