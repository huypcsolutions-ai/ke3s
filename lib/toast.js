// Toast utility - dùng window để gọi từ bất kỳ đâu
export function showToast(message, type = 'info', duration = 4000) {
  if (typeof window === 'undefined') return

  const container = document.getElementById('toast-container')
  if (!container) return

  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' }
  
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`
  
  container.appendChild(toast)
  
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}
