// Funciones para manejo de archivos
async function subirArchivo(file) {
  try {
    const timestamp = Date.now()
    const extension = file.name.split(".").pop().toLowerCase()
    const fileName = `files/${timestamp}-${file.name}`

    // Generar URL firmada para S3
    const response = await fetch("/api/get-signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: fileName,
        fileType: file.type,
      }),
    })

    if (!response.ok) throw new Error("Error al obtener la URL firmada")

    const { signedUrl, fileUrl } = await response.json()

    // Subir archivo a S3
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error("Error al subir el archivo a S3")
    }

    if (!fileUrl) {
      throw new Error("No se recibió la URL del archivo")
    }

    return {
      url: fileUrl,
      nombre: file.name,
      tipo: extension,
      tamano: file.size,
    }
  } catch (error) {
    console.error("Error al subir archivo:", error)
    throw error
  }
}

function getIconoArchivo(extension) {
  const iconos = {
    pdf: "fa-file-pdf",
    doc: "fa-file-word",
    docx: "fa-file-word",
    xls: "fa-file-excel",
    xlsx: "fa-file-excel",
    txt: "fa-file-alt",
    js: "fa-file-code",
    css: "fa-file-code",
    html: "fa-file-code",
    mp3: "fa-file-audio",
    mp4: "fa-file-video",
  }

  return `fas ${iconos[extension] || "fa-file"}`
}

// Hacer las funciones disponibles globalmente
window.formatearTamanoArchivo = (bytes) => {
  if (!bytes || isNaN(bytes)) return "0 B"
  if (bytes < 1024) return bytes + " B"
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
  else return (bytes / 1073741824).toFixed(1) + " GB"
}

window.getIconoArchivo = (extension) => {
  const iconos = {
    pdf: "fa-file-pdf",
    doc: "fa-file-word",
    docx: "fa-file-word",
    xls: "fa-file-excel",
    xlsx: "fa-file-excel",
    txt: "fa-file-alt",
    js: "fa-file-code",
    css: "fa-file-code",
    html: "fa-file-code",
    mp3: "fa-file-audio",
    wav: "fa-file-audio",
    mp4: "fa-file-video",
  }

  return `fas ${iconos[extension] || "fa-file"}`
}

function actualizarVistaPrevia() {
  const previewDiv = document.getElementById("archivos-preview")
  let html = ""

  archivosInfo.forEach((archivo, index) => {
    html += `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                        <i class="${getIconoArchivo(archivo.tipo)} text-gray-500 dark:text-gray-400"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">${archivo.nombre}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${formatearTamanoArchivo(archivo.tamano)}</p>
                    </div>
                </div>
                <button onclick="eliminarArchivo(${index})" 
                        class="text-red-500 hover:text-red-600 transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `
  })

  previewDiv.innerHTML = html
}

function eliminarArchivo(index) {
  archivosUrls.splice(index, 1)
  archivosInfo.splice(index, 1)
  actualizarVistaPrevia()
}
