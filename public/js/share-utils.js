// Funciones para compartir apuntes

// Función para crear un enlace de compartir para un apunte
async function crearEnlaceCompartir(apunteId) {
  try {
    // Obtener los datos del apunte desde Firebase
    const apunteDoc = await db.collection("apuntes").doc(apunteId).get()
    
    if (!apunteDoc.exists) {
      throw new Error('Apunte no encontrado')
    }
    
    const apunteData = { id: apunteDoc.id, ...apunteDoc.data() }
    
    // Enviar al servidor para crear el enlace compartido
    const baseUrl = window.location.origin
    const response = await fetch(`${baseUrl}/api/shared/create-share-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apunteData)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error al crear enlace')
    }
    
    const result = await response.json()
    
    // Guardar la referencia del apunte compartido en Firebase
    try {
      const auth = firebase.auth();
      const user = auth.currentUser;
      
      await db.collection('sharedNotes').doc(result.shareId).set({
        apunteId: apunteId,
        createdAt: new Date(),
        expiresAt: result.expiresAt,
        shareUrl: result.shareUrl,
        createdBy: user ? user.uid : null,
        userEmail: user ? user.email : null
      });
      console.log('Referencia guardada en Firebase');
    } catch (fbError) {
      console.error('Error al guardar en Firebase:', fbError);
      // No lanzar el error, el enlace aún funciona
    }
    
    return result
    
  } catch (error) {
    console.error('Error al crear enlace de compartir:', error)
    throw error
  }
}

// Función para mostrar modal de compartir
function mostrarModalCompartir(shareUrl, apunteName) {
  const modal = document.createElement('div')
  modal.id = 'modal-compartir'
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
  
  modal.innerHTML = `
    <div class="bg-dark rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
            <i class="fas fa-share-alt text-white"></i>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-white">Compartir Apunte</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Comparte "${apunteName}"</p>
          </div>
        </div>
        <button onclick="cerrarModalCompartir()" class="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
          <i class="fas fa-times text-gray-500 dark:text-gray-400"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <!-- URL de compartir -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i class="fas fa-link mr-2"></i>Enlace de compartir
          </label>
          <div class="flex">
            <input 
              type="text" 
              id="share-url-input" 
              value="${shareUrl}"
              readonly
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
            <button 
              onclick="copiarEnlace('${shareUrl}', event)"
              class="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-r-lg hover:opacity-90 transition-opacity text-sm font-medium"
              title="Copiar enlace"
            >
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        
        <!-- Opciones de compartir -->
        <div class="border-t pt-4 dark:border-gray-600">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <i class="fas fa-share mr-2"></i>Compartir en:
          </p>
          <div class="flex space-x-2">
            <button 
              onclick="compartirWhatsApp('${shareUrl}', '${apunteName}')"
              class="flex-1 flex items-center justify-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
            >
              <i class="fab fa-whatsapp mr-2"></i>WhatsApp
            </button>
            <button 
              onclick="compartirTelegram('${shareUrl}', '${apunteName}')"
              class="flex-1 flex items-center justify-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
            >
              <i class="fab fa-telegram mr-2"></i>Telegram
            </button>
            <button 
              onclick="compartirEmail('${shareUrl}', '${apunteName}')"
              class="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              <i class="fas fa-envelope mr-2"></i>Email
            </button>
          </div>
        </div>
        
        <!-- Información adicional -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div class="flex items-start space-x-2">
            <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
            <div class="text-xs text-blue-700 dark:text-blue-300">
              <p class="font-medium mb-1">¿Cómo funciona?</p>
              <p>Este enlace permite ver el apunte sin necesidad de registrarse. Expira en 30 días automáticamente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

// Función para cerrar el modal de compartir
function cerrarModalCompartir() {
  const modal = document.getElementById('modal-compartir')
  if (modal) {
    modal.remove()
  }
}

// Función para copiar enlace al portapapeles
async function copiarEnlace(url, event) {
  try {
    await navigator.clipboard.writeText(url)
    
    // Mostrar feedback visual si hay un botón
    if (event && event.target) {
      const button = event.target.closest('button')
      if (button) {
        const originalContent = button.innerHTML
        button.innerHTML = '<i class="fas fa-check"></i>'
        button.className = button.className.replace('from-primary to-secondary', 'from-green-500 to-green-600')
        
        setTimeout(() => {
          button.innerHTML = originalContent
          button.className = button.className.replace('from-green-500 to-green-600', 'from-primary to-secondary')
        }, 2000)
      }
    }
    
    showCustomAlert('¡Enlace copiado al portapapeles!', 'success')
    
  } catch (error) {
    console.error('Error al copiar:', error)
    
    // Fallback para navegadores que no soportan clipboard API
    const input = document.getElementById('share-url-input')
    if (input) {
      input.select()
      document.execCommand('copy')
      showCustomAlert('Enlace copiado', 'success')
    } else {
      showCustomAlert('No se pudo copiar el enlace automáticamente. Cópialo manualmente.', 'error')
    }
  }
}

// Función para compartir en WhatsApp
function compartirWhatsApp(url, noteName) {
  const mensaje = `📚 Te comparto este apunte: "${noteName}"\\n\\n${url}\\n\\n¡Creado con StudentMan! 🎓`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
  window.open(whatsappUrl, '_blank')
}

// Función para compartir en Telegram
function compartirTelegram(url, noteName) {
  const mensaje = `📚 Te comparto este apunte: "${noteName}"\\n\\n${url}\\n\\n¡Creado con StudentMan! 🎓`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`📚 Apunte: "${noteName}"\\n\\n¡Creado con StudentMan! 🎓`)}`
  window.open(telegramUrl, '_blank')
}

// Función para compartir por email
function compartirEmail(url, noteName) {
  const asunto = `Apunte compartido: ${noteName}`
  const cuerpo = `Hola,\\n\\nTe comparto este apunte: "${noteName}"\\n\\nPuedes verlo aquí: ${url}\\n\\n¡Creado con StudentMan! 🎓\\n\\nSaludos`
  const emailUrl = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
  window.location.href = emailUrl
}

// Función principal para compartir un apunte
async function compartirApunte(apunteId) {
  try {
    // Mostrar loading
    showCustomAlert('Creando enlace de compartir...', 'info')
    
    // Obtener información básica del apunte para el nombre
    const apunteDoc = await db.collection("apuntes").doc(apunteId).get()
    if (!apunteDoc.exists) {
      throw new Error('Apunte no encontrado')
    }
    
    const apunteData = apunteDoc.data()
    const apunteName = apunteData.materia?.nombre || 'Apunte'
    
    // Crear enlace de compartir
    const result = await crearEnlaceCompartir(apunteId)
    
    // Mostrar modal con las opciones de compartir
    mostrarModalCompartir(result.shareUrl, apunteName)
    
  } catch (error) {
    console.error('Error al compartir apunte:', error)
    showCustomAlert('Error al crear enlace de compartir: ' + error.message, 'error')
  }
}

// Función para mostrar alertas personalizadas (si no existe)
if (typeof showCustomAlert === 'undefined') {
  window.showCustomAlert = function(message, type = 'info') {
    const alertColors = {
      success: 'from-green-500 to-emerald-500',
      error: 'from-red-500 to-rose-500',
      info: 'from-blue-500 to-cyan-500',
      warning: 'from-yellow-500 to-amber-500'
    }
    
    const alert = document.createElement('div')
    alert.className = `fixed top-4 right-4 z-50 px-6 py-3 bg-gradient-to-r ${alertColors[type]} text-white rounded-lg shadow-lg transform translate-x-full transition-transform duration-300`
    alert.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info'} mr-2"></i>
        <span>${message}</span>
      </div>
    `
    
    document.body.appendChild(alert)
    
    setTimeout(() => {
      alert.style.transform = 'translateX(0)'
    }, 100)
    
    setTimeout(() => {
      alert.style.transform = 'translateX(100%)'
      setTimeout(() => alert.remove(), 300)
    }, 3000)
  }
}

// Hacer las funciones disponibles globalmente
window.compartirApunte = compartirApunte
window.crearEnlaceCompartir = crearEnlaceCompartir
window.mostrarModalCompartir = mostrarModalCompartir
window.cerrarModalCompartir = cerrarModalCompartir
window.copiarEnlace = copiarEnlace
window.compartirWhatsApp = compartirWhatsApp
window.compartirTelegram = compartirTelegram
window.compartirEmail = compartirEmail