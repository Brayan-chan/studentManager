import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Store para guardar apuntes compartidos temporalmente (en producción usar base de datos)
const sharedNotesStore = new Map()

// Función para generar ID único para compartir
function generateShareId() {
  return crypto.randomBytes(16).toString('hex')
}

// Función para formatear fecha
function formatDate(date) {
  if (!date) return 'Fecha no disponible'
  
  // Si es un Timestamp de Firestore
  if (date.toDate && typeof date.toDate === 'function') {
    return date.toDate().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  // Si es un objeto Date
  if (date instanceof Date) {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  // Si es una cadena de fecha
  try {
    const dateObj = new Date(date)
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    return 'Fecha no disponible'
  }
}

// Función para obtener el icono del archivo según su tipo
function getFileIcon(fileType) {
  const iconMap = {
    'pdf': 'fas fa-file-pdf',
    'doc': 'fas fa-file-word',
    'docx': 'fas fa-file-word',
    'xls': 'fas fa-file-excel',
    'xlsx': 'fas fa-file-excel',
    'ppt': 'fas fa-file-powerpoint',
    'pptx': 'fas fa-file-powerpoint',
    'txt': 'fas fa-file-alt',
    'jpg': 'fas fa-file-image',
    'jpeg': 'fas fa-file-image',
    'png': 'fas fa-file-image',
    'gif': 'fas fa-file-image',
    'mp4': 'fas fa-file-video',
    'avi': 'fas fa-file-video',
    'mp3': 'fas fa-file-audio',
    'wav': 'fas fa-file-audio',
    'zip': 'fas fa-file-archive',
    'rar': 'fas fa-file-archive',
    'default': 'fas fa-file'
  }
  
  return iconMap[fileType.toLowerCase()] || iconMap['default']
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Endpoint para crear un enlace compartido
router.post('/create-share-link', (req, res) => {
  try {
    const noteData = req.body
    
    if (!noteData || !noteData.id) {
      return res.status(400).json({ error: 'Datos del apunte no válidos' })
    }
    
    const shareId = generateShareId()
    const shareData = {
      ...noteData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expira en 30 días
    }
    
    sharedNotesStore.set(shareId, shareData)

    const shareUrl = `${req.protocol}://${'studentman-beta.vercel.app'}/shared/${shareId}`

    res.json({
      shareId,
      shareUrl,
      expiresAt: shareData.expiresAt
    })
    
  } catch (error) {
    console.error('Error creating share link:', error)
    res.status(500).json({ error: 'Error al crear enlace de compartir' })
  }
})

// Endpoint para obtener un apunte compartido
router.get('/:shareId', (req, res) => {
  try {
    const { shareId } = req.params
    const noteData = sharedNotesStore.get(shareId)
    
    if (!noteData) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Apunte no encontrado - StudentMan</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <script>
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    primary: '#6366f1',
                    secondary: '#8b5cf6',
                    darkbg: '#1a1b23',
                    darkcard: '#25262d'
                  }
                }
              }
            }
          </script>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-darkbg dark:to-darkcard transition-colors duration-300 flex items-center justify-center">
          <div class="max-w-md mx-auto text-center p-8">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Apunte no encontrado</h1>
            <p class="text-gray-600 dark:text-gray-400 mb-6">Este enlace no es válido o ha expirado.</p>
            <a href="/" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
              <i class="fas fa-home mr-2"></i>
              Volver al inicio
            </a>
          </div>
        </body>
        </html>
      `)
    }
    
    // Verificar si el enlace ha expirado
    if (new Date() > new Date(noteData.expiresAt)) {
      sharedNotesStore.delete(shareId)
      return res.status(410).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Enlace expirado - StudentMan</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <script>
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    primary: '#6366f1',
                    secondary: '#8b5cf6',
                    darkbg: '#1a1b23',
                    darkcard: '#25262d'
                  }
                }
              }
            }
          </script>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-darkbg dark:to-darkcard transition-colors duration-300 flex items-center justify-center">
          <div class="max-w-md mx-auto text-center p-8">
            <div class="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-clock text-yellow-500 text-2xl"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Enlace expirado</h1>
            <p class="text-gray-600 dark:text-gray-400 mb-6">Este enlace ha expirado y ya no está disponible.</p>
            <a href="/" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
              <i class="fas fa-home mr-2"></i>
              Volver al inicio
            </a>
          </div>
        </body>
        </html>
      `)
    }
    
    const formattedDate = formatDate(noteData.fecha)
    
    // Generar archivos HTML
    let filesHtml = ''
    if (noteData.archivos && noteData.archivos.length > 0) {
      filesHtml = `
        <div class="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <i class="fas fa-paperclip text-indigo-600 dark:text-indigo-400"></i>
              </div>
              <h5 class="text-base font-semibold text-gray-800 dark:text-gray-200">
                Archivos adjuntos
                <span class="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">(${noteData.archivos.length})</span>
              </h5>
            </div>
          </div>
          <div class="grid gap-2">
            ${noteData.archivos.map(archivo => `
              <div class="group bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer" onclick="window.open('${archivo.url}', '_blank')">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                    <i class="${getFileIcon(archivo.tipo)} text-lg text-indigo-600 dark:text-indigo-400"></i>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">${archivo.nombre}</p>
                    <div class="flex items-center space-x-2 mt-0.5">
                      <span class="text-xs px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 font-medium">
                        ${archivo.tipo.toUpperCase()}
                      </span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        ${formatFileSize(archivo.tamano)}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <a href="${archivo.url}" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all duration-200"
                     title="Abrir archivo">
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }
    
    // Generar HTML para imagen
    let imageHtml = ''
    if (noteData.fotoUrl) {
      imageHtml = `
        <div class="mb-3">
          <a href="${noteData.fotoUrl}" data-fancybox data-caption="${noteData.materia.nombre} - ${noteData.dia} - ${noteData.horaInicio} - ${noteData.horaFin}">
            <img src="${noteData.fotoUrl}" alt="Foto del apunte" class="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
          </a>
        </div>
      `
    }
    
    // Generar HTML para audio
    let audioHtml = ''
    if (noteData.audioUrl) {
      audioHtml = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3">
          <div class="flex items-center space-x-2 mb-2">
            <i class="fas fa-volume-up text-purple-500"></i>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Audio adjunto</span>
          </div>
          <audio controls class="w-full">
            <source src="${noteData.audioUrl}" type="audio/mpeg">
            Tu navegador no soporta el elemento audio.
          </audio>
        </div>
      `
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Apunte: ${noteData.materia.nombre} - StudentMan</title>
        <link rel="icon" type="image/png" sizes="32x32" href="/images/studentman_metua5.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/studentman_metua5.png" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.css">
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/fancybox/3.5.7/jquery.fancybox.min.js"></script>
        <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
        <script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                colors: {
                  primary: '#6366f1',
                  secondary: '#8b5cf6',
                  darkbg: '#1a1b23',
                  darkcard: '#25262d'
                }
              }
            }
          }
          
          // Detectar modo oscuro
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark')
          }
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          })
        </script>
      </head>
      <body class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-darkbg dark:to-darkcard transition-colors duration-300">
        
        <!-- Header -->
        <header class="bg-white/80 dark:bg-darkcard/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 mb-8">
          <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center">
                  <i class="fas fa-graduation-cap text-white text-lg"></i>
                </div>
                <div>
                  <h1 class="font-bold text-gray-800 dark:text-white">StudentMan</h1>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Apunte compartido</p>
                </div>
              </div>
              <a href="/" class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm">
                <i class="fas fa-home mr-2"></i>
                Ir a StudentMan
              </a>
            </div>
          </div>
        </header>

        <div class="container mx-auto px-6 py-8">
          <div class="max-w-2xl mx-auto">
            <!-- CONTENEDOR DE NOTA COMPARTIDA -->
            <div class="border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-2xl shadow-xl bg-white dark:bg-darkcard overflow-hidden">
              
              <!-- Etiqueta superior -->
              <div class="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wide px-4 py-2 border-b border-indigo-200 dark:border-indigo-700">
                📘 Apunte compartido
              </div>

              <!-- Contenido del apunte -->
              <div class="p-6">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-grow min-w-0 mr-4">
                    <h5 class="font-bold text-gray-800 dark:text-white truncate text-xl">${noteData.materia.nombre}</h5>
                    <div class="flex items-center flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                      
                      <!-- Profesor -->
                      ${noteData.materia.profesor ? `
                      <span class="inline-flex items-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-800 rounded-full px-2.5 py-1">
                        <i class="fas fa-user mr-1.5"></i>${noteData.materia.profesor}
                      </span>
                      ` : ''}
                      
                      <!-- Día -->
                      <span class="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-100 dark:border-emerald-800 rounded-full px-2.5 py-1">
                        <i class="fas fa-calendar mr-1.5"></i>${noteData.dia}
                      </span>

                      <!-- Horario -->
                      ${noteData.horaInicio && noteData.horaFin ? `
                      <span class="inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-2 border-amber-100 dark:border-amber-800 rounded-full px-2.5 py-1">
                        <i class="fas fa-clock mr-1.5"></i>${noteData.horaInicio} - ${noteData.horaFin}
                      </span>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Fecha -->
                  <span class="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center">
                    <i class="fas fa-clock mr-1.5"></i>${formattedDate}
                  </span>
                </div>

                <!-- Descripción -->
                ${noteData.texto ? `
                <div class="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-4">
                  <div class="flex items-center mb-2">
                    <i class="fas fa-sticky-note text-gray-500 dark:text-gray-400 mr-2"></i>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Contenido del apunte</span>
                  </div>
                  <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${noteData.texto}</p>
                </div>
                ` : ''}

                <!-- Imagen -->
                ${imageHtml}

                <!-- Audio -->
                ${audioHtml}

                <!-- Archivos -->
                ${filesHtml}
              </div>
            </div>

            <!-- Información adicional -->
            <div class="mt-6 text-center">
              <div class="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                <i class="fas fa-share-alt mr-2"></i>
                Este apunte fue compartido usando StudentMan
              </div>
            </div>
          </div>
        </div>

        <script>
          // Inicializar Fancybox para imágenes
          $(document).ready(function() {
            $("[data-fancybox]").fancybox({
              animationEffect: "fade",
              transitionEffect: "fade",
              animationDuration: 300,
              zoomOpacity: true
            });
            
            // Inicializar Plyr para audio
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
              new Plyr(audio);
            });
          });
        </script>
      </body>
      </html>
    `
    
    res.send(html)
    
  } catch (error) {
    console.error('Error serving shared note:', error)
    res.status(500).send('Error interno del servidor')
  }
})

export default router