// Detectar modo oscuro
if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark")
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (event.matches) {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
})

// Firebase is loaded from CDN in HTML, so we use the global firebase object
// AWS SDK is also loaded from CDN
// Cloudinary is loaded from CDN

// Initialize Firebase (replace with your actual configuration)
const firebaseConfig = {
  apiKey: "AIzaSyB-5z-xwAmReLjNGPdnwB2Ff7jjtCk9_aQ",
  authDomain: "studentman-13c8f.firebaseapp.com",
  projectId: "studentman-13c8f",
  storageBucket: "studentman-13c8f.firebasestorage.app",
  messagingSenderId: "380344615554",
  appId: "1:380344615554:web:a7c15289f49c49e7ff2a9b",
}

// Initialize Firebase using the global firebase object from CDN
const app = firebase.initializeApp(firebaseConfig)
const db = firebase.firestore()

// Variables globales para almacenar la configuración
const awsConfig = {}
let cloudinaryConfig = {}

// Función para cargar la configuración desde el backend
async function cargarConfiguracion() {
  try {
    const baseUrl = window.location.origin
    console.log("Intentando cargar configuración desde:", `${baseUrl}/api/config`)

    const response = await fetch(`${baseUrl}/api/config`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error en la respuesta:", errorText)
      throw new Error("Error al obtener la configuración del servidor")
    }

    const config = await response.json()
    console.log("Configuración recibida:", {
      hasAwsRegion: !!config.aws?.region,
      hasCloudinaryConfig: !!config.cloudinary,
      cloudinaryCloudName: config.cloudinary?.cloudName,
      hasUploadPreset: !!config.cloudinary?.uploadPreset,
    })

    // Configuración de AWS S3
    AWS.config.update({
      region: config.aws.region,
    })

    // Guardar la configuración de Cloudinary
    cloudinaryConfig = config.cloudinary

    // Configuración de Cloudinary
    cloudinaryConfig = {
      cloudName: config.cloudinary.cloudName,
      uploadPreset: config.cloudinary.uploadPreset,
    }

    console.log("Configuración cargada exitosamente")
    return true
  } catch (error) {
    console.error("Error al cargar la configuración:", error)
    showCustomAlert("Error al cargar la configuración. Algunas funciones pueden no estar disponibles.")
    return false
  }
}

// Cargar la configuración al iniciar la aplicación
cargarConfiguracion()

// Variables globales
let editandoHorario = false
let fotoUrl = null
let mediaRecorder
let audioChunks = []
let audioUrl = null
const audioBlob = null
let archivosUrls = []
let archivosInfo = []

// Variables para la paginación y caché
const APUNTES_POR_PAGINA = 10
let paginaActual = 1
const cacheApuntes = {
  paginas: {},
  metadata: {
    ultimoApunte: null,
    primerApunte: null,
    totalPaginas: 1,
    cargando: false,
    ultimaPaginaCargada: 0,
  },
}

// Estructura del horario por defecto
const horarioDefault = {
  dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
  horas: [
    "7:00",
    "8:00",
    "9:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ],
  bloques: {}, // Nueva estructura: dia -> [{ horaInicio, horaFin, materia }]
  materiasInfo: {},
}

// Función para mostrar alertas personalizadas
function showCustomAlert(message) {
  const modal = document.createElement("div")
  modal.className = "fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-red-600 dark:text-red-400"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Aviso</h3>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
                    <button onclick="this.closest('.fixed').remove()"
                            class="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300">
                        Entendido
                    </button>
                </div>
            `
  document.body.appendChild(modal)
}

// Función para mostrar confirmaciones personalizadas
function showCustomConfirm(message, onConfirm) {
  const modal = document.createElement("div")
  modal.className = "fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                            <i class="fas fa-question-circle text-yellow-600 dark:text-yellow-400"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Confirmación</h3>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
                    <div class="flex space-x-3">
                        <button onclick="this.closest('.fixed').remove()"
                                class="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300">
                            Cancelar
                        </button>
                        <button onclick="this.closest('.fixed').remove(); onConfirm()"
                                class="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300">
                            Confirmar
                        </button>
                    </div>
                </div>
            `
  document.body.appendChild(modal)
}

// Funciones de gestión del horario
function guardarHorario(horario) {
  localStorage.setItem("horarioAcademico", JSON.stringify(horario))
}

function cargarHorario() {
  const horarioGuardado = localStorage.getItem("horarioAcademico")
  return horarioGuardado ? JSON.parse(horarioGuardado) : horarioDefault
}

function generarColorMateria(codigo) {
  const colores = [
    "bg-gradient-to-br from-pink-400 to-pink-600",
    "bg-gradient-to-br from-purple-400 to-purple-600",
    "bg-gradient-to-br from-blue-400 to-blue-600",
    "bg-gradient-to-br from-green-400 to-green-600",
    "bg-gradient-to-br from-yellow-400 to-yellow-600",
    "bg-gradient-to-br from-red-400 to-red-600",
    "bg-gradient-to-br from-indigo-400 to-indigo-600",
    "bg-gradient-to-br from-teal-400 to-teal-600",
    "bg-gradient-to-br from-orange-400 to-orange-600",
    "bg-gradient-to-br from-cyan-400 to-cyan-600",
  ]
  return colores[Number.parseInt(codigo) % colores.length]
}

// Funciones auxiliares para manejo de tiempo
function convertirHoraAMinutos(hora) {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}

function convertirMinutosAHora(minutos) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

function verificarConflictoHorario(dia, horaInicio, horaFin, horario, excluirId = null) {
  const bloquesDia = horario.bloques[dia] || []
  const inicioMinutos = convertirHoraAMinutos(horaInicio)
  const finMinutos = convertirHoraAMinutos(horaFin)

  return bloquesDia.some((bloque, index) => {
    if (excluirId !== null && index === excluirId) return false

    const bloqueInicioMinutos = convertirHoraAMinutos(bloque.horaInicio)
    const bloqueFinMinutos = convertirHoraAMinutos(bloque.horaFin)

    return inicioMinutos < bloqueFinMinutos && finMinutos > bloqueInicioMinutos
  })
}

function cargarHorarioSemanal() {
  const horario = cargarHorario()
  const horarioElement = document.getElementById("horario-semanal")

  // Migrar datos antiguos si existen
  if (horario.materias && Object.keys(horario.materias).length > 0 && !horario.bloques) {
    migrarHorarioAntiguo(horario)
  }

  // Agregar los botones de control
  const botonesControl = generarBotonesControlHorario()

  // Vista de escritorio (timeline por día)
  const vistaEscritorio = `
                <div class="hidden lg:block">
                    ${botonesControl}
                    <div class="grid grid-cols-6 gap-4">
                        <div class="col-span-1">
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sticky top-4">
                                <h3 class="font-semibold text-gray-700 dark:text-gray-300 mb-4">Horas</h3>
                                <div class="grid grid-rows-${horario.horas.length} h-[${horario.horas.length * 60}px]">
                                    ${horario.horas
                                      .map(
                                        (hora) => `
                                        <div class="text-sm text-gray-600 dark:text-gray-400 h-[60px] flex items-center border-b border-gray-200 dark:border-gray-600">
                                            ${hora}
                                        </div>
                                    `,
                                      )
                                      .join("")}
                                </div>
                            </div>
                        </div>
                        <div class="col-span-5">
                            <div class="grid grid-cols-5 gap-4">
                                ${horario.dias
                                  .map(
                                    (dia) => `
                                    <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                        <h3 class="font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">${dia}</h3>
                                        <div class="relative h-[${horario.horas.length * 60}px]">
                                            <div class="absolute inset-0 grid grid-rows-${horario.horas.length}">
                                                ${horario.horas
                                                  .map(
                                                    () => `
                                                    <div class="border-b border-gray-200 dark:border-gray-600"></div>
                                                `,
                                                  )
                                                  .join("")}
                                            </div>
                                            ${generarBloquesDelDia(dia, horario, false)}
                                            ${
                                              editandoHorario
                                                ? `
                                                <button onclick="abrirModalAgregarBloque('${dia}')"
                                                        class="absolute bottom-2 right-2 w-10 h-10 bg-primary hover:bg-secondary rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300">
                                                    <i class="fas fa-plus"></i>
                                                </button>
                                            `
                                                : ""
                                            }
                                        </div>
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    </div>
                </div>
            `

  // Vista móvil (tarjetas por día)
  const vistMovil = `
                <div class="lg:hidden">
                    <div class="flex justify-between items-center mb-4">
                        <!-- Selector de día -->
                        <div class="flex-1 flex space-x-2 overflow-x-auto pb-2">
                        ${horario.dias
                          .map(
                            (dia, index) => `
                            <button onclick="cambiarDiaMobile('${dia}')"
                                    class="dia-btn flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${index === 0 ? "bg-gradient-to-r from-primary to-secondary text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}"
                                    data-dia="${dia}">
                                ${dia}
                            </button>
                        `,
                          )
                          .join("")}
                        </div>
                        ${generarBotonesControlHorario(true)}
                    </div>

                    <!-- Contenido por día -->
                    ${horario.dias
                      .map((dia, diaIndex) => {
                        const bloquesDia = horario.bloques[dia] || []

                        return `
                        <div id="dia-content-${dia}" class="dia-content ${diaIndex === 0 ? "block" : "hidden"} space-y-3">
                            ${
                              bloquesDia.length === 0
                                ? `
                                <div class="text-center py-8">
                                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i class="fas fa-calendar-plus text-gray-400 text-2xl"></i>
                                    </div>
                                    <p class="text-gray-500 dark:text-gray-400 mb-4">No hay clases programadas para ${dia}</p>
                                    <button onclick="abrirModalAgregarBloque('${dia}')"
                                            class="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-xl font-medium">
                                        <i class="fas fa-plus mr-2"></i>Agregar Clase
                                    </button>
                                </div>
                            `
                                : bloquesDia
                                    .map(
                                      (bloque, index) => `
                                <div class="${generarColorMateria(bloque.materia.codigo)} text-white rounded-xl p-4 card-hover shadow-lg"
                                     onclick="manejarClickBloque('${dia}', ${index})">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-sm opacity-90">${formatearHorarioBloque(bloque.horaInicio, bloque.horaFin)}</span>
                                        <i class="fas fa-chevron-right opacity-75"></i>
                                    </div>
                                    <div class="font-bold text-lg mb-1">${bloque.materia.codigo}</div>
                                    <div class="text-sm opacity-90 mb-2">${bloque.materia.nombre}</div>
                                    <div class="flex items-center text-xs opacity-75">
                                        <i class="fas fa-user mr-2"></i>
                                        ${bloque.materia.profesor}
                                    </div>
                                    <div class="text-xs opacity-75 mt-1">
                                        <i class="fas fa-clock mr-1"></i>
                                        ${calcularDuracionBloque(bloque.horaInicio, bloque.horaFin)}
                                    </div>
                                </div>
                            `,
                                    )
                                    .join("")
                            }
                            ${
                              editandoHorario
                                ? `
                                <button onclick="abrirModalAgregarBloque('${dia}')"
                                        class="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-200">
                                    <i class="fas fa-plus text-gray-400 text-xl mb-2"></i>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">Agregar nueva clase</div>
                                </button>
                            `
                                : ""
                            }
                        </div>
                    `
                      })
                      .join("")}
                </div>
            `

  horarioElement.innerHTML = vistaEscritorio + vistMovil
}

function generarBloquesDelDia(dia, horario, esMobile = false) {
  const bloques = horario.bloques[dia] || []
  return bloques
    .map((bloque, index) => {
      const duracion = calcularDuracionBloque(bloque.horaInicio, bloque.horaFin)

      if (esMobile) {
        return `
                <div class="${generarColorMateria(bloque.materia.codigo)} text-white rounded-xl p-3 cursor-pointer card-hover shadow-lg mb-2"
                     onclick="manejarClickBloque('${dia}', ${index})">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-semibold">${formatearHorarioBloque(bloque.horaInicio, bloque.horaFin)}</span>
                        <span class="text-xs opacity-75">${duracion}</span>
                    </div>
                    <div class="font-bold text-sm">${bloque.materia.codigo}</div>
                    <div class="text-xs opacity-90">${bloque.materia.nombre}</div>
                    <div class="text-xs opacity-75 mt-1">
                        <i class="fas fa-user mr-1"></i>${bloque.materia.profesor}
                    </div>
                </div>
            `
      }

      const posicion = calcularPosicionBloque(bloque.horaInicio, bloque.horaFin, horario)
      const esUnaHora = calcularDuracionMinutos(bloque.horaInicio, bloque.horaFin) === 60

      if (esUnaHora) {
        return `
                <div class="${generarColorMateria(bloque.materia.codigo)} text-white rounded-xl cursor-pointer card-hover shadow-lg absolute w-[calc(100%-1rem)] flex flex-col justify-center"
                     style="top: ${posicion.top}px; height: ${posicion.height}px;"
                     onclick="manejarClickBloque('${dia}', ${index})">
                    <div class="text-center">
                        <div class="flex items-center justify-center gap-2 mb-1">
                            <span class="font-semibold text-sm">${formatearHorarioBloque(bloque.horaInicio, bloque.horaFin)}</span>
                            <span class="text-xs opacity-75">${duracion}</span>
                        </div>
                        <div class="text-xs">${bloque.materia.nombre}</div>
                    </div>
                </div>
            `
      }

      return `
            <div class="${generarColorMateria(bloque.materia.codigo)} text-white rounded-xl p-3 cursor-pointer card-hover shadow-lg absolute w-[calc(100%-1rem)]"
                 style="top: ${posicion.top}px; height: ${posicion.height}px;"
                 onclick="manejarClickBloque('${dia}', ${index})">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-semibold">${formatearHorarioBloque(bloque.horaInicio, bloque.horaFin)}</span>
                    <span class="text-xs opacity-75">${duracion}</span>
                </div>
                <div class="font-bold text-sm">${bloque.materia.codigo}</div>
                <div class="text-xs opacity-90">${bloque.materia.nombre}</div>
                <div class="text-xs opacity-75 mt-1">
                    <i class="fas fa-user mr-1"></i>${bloque.materia.profesor}
                </div>
            </div>
        `
    })
    .join("")
}

function formatearHorarioBloque(horaInicio, horaFin) {
  const inicioMinutos = convertirHoraAMinutos(horaInicio)
  const finMinutos = convertirHoraAMinutos(horaFin)
  const duracionMinutos = finMinutos - inicioMinutos

  if (duracionMinutos === 60) {
    return horaInicio // Si es solo una hora, mostramos la hora de inicio
  } else {
    return `${horaInicio} - ${horaFin}` // Si es más de una hora, mostramos el rango
  }
}

function calcularDuracionMinutos(horaInicio, horaFin) {
  const inicioMinutos = convertirHoraAMinutos(horaInicio)
  const finMinutos = convertirHoraAMinutos(horaFin)
  return finMinutos - inicioMinutos
}

function calcularDuracionBloque(horaInicio, horaFin) {
  const duracionMinutos = calcularDuracionMinutos(horaInicio, horaFin)

  if (duracionMinutos >= 60) {
    const horas = Math.floor(duracionMinutos / 60)
    const minutos = duracionMinutos % 60
    return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`
  } else {
    return `${duracionMinutos}m`
  }
}

function migrarHorarioAntiguo(horario) {
  horario.bloques = {}

  // Agrupar materias por día y hora
  Object.entries(horario.materias).forEach(([key, materia]) => {
    const [dia, hora] = key.split("-")
    if (!horario.bloques[dia]) {
      horario.bloques[dia] = []
    }

    // Crear bloque de 1 hora por defecto
    const horaInicio = hora
    const horaFin = convertirMinutosAHora(convertirHoraAMinutos(hora) + 60)

    horario.bloques[dia].push({
      horaInicio,
      horaFin,
      materia: {
        codigo: materia.codigo,
        nombre: materia.nombre,
        profesor: materia.profesor,
      },
    })
  })

  // Limpiar datos antiguos
  delete horario.materias
  guardarHorario(horario)
}

function cambiarDiaMobile(diaSeleccionado) {
  // Actualizar botones
  document.querySelectorAll(".dia-btn").forEach((btn) => {
    const dia = btn.dataset.dia
    if (dia === diaSeleccionado) {
      btn.className =
        "dia-btn flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-primary to-secondary text-white"
    } else {
      btn.className =
        "dia-btn flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
    }
  })

  // Mostrar contenido del día seleccionado
  document.querySelectorAll(".dia-content").forEach((content) => {
    content.classList.add("hidden")
  })
  document.getElementById(`dia-content-${diaSeleccionado}`).classList.remove("hidden")
}

function abrirModalAgregarBloque(dia, bloqueId = null) {
  const horario = cargarHorario()
  const bloque = bloqueId !== null ? horario.bloques[dia][bloqueId] : null
  const modal = document.getElementById("modal-apuntes")

  modal.classList.remove("hidden")
  modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-${bloque ? "edit" : "plus"} text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">${bloque ? "Editar" : "Agregar"} Clase</h2>
                                <p class="opacity-90">${dia}</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    <i class="fas fa-clock mr-2"></i>Hora de Inicio
                                </label>
                                <select id="hora-inicio"
                                        class="w-full p-3 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                    ${horario.horas
                                      .map(
                                        (hora) => `
                                        <option value="${hora}" ${bloque && bloque.horaInicio === hora ? "selected" : ""}>${hora}</option>
                                    `,
                                      )
                                      .join("")}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    <i class="fas fa-clock mr-2"></i>Hora de Fin
                                </label>
                                <select id="hora-fin"
                                        class="w-full p-3 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                    ${horario.horas
                                      .map(
                                        (hora) => `
                                        <option value="${hora}" ${bloque && bloque.horaFin === hora ? "selected" : ""}>${hora}</option>
                                    `,
                                      )
                                      .join("")}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-code mr-2"></i>Código de la Materia
                            </label>
                            <input type="text" 
                                   id="codigo-materia-bloque" 
                                   class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                                   placeholder="Ej: 578" 
                                   value="${bloque ? bloque.materia.codigo : ""}">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-book mr-2"></i>Nombre de la Materia
                            </label>
                            <input type="text" 
                                   id="nombre-materia-bloque" 
                                   class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                                   placeholder="Ej: Sistemas II" 
                                   value="${bloque ? bloque.materia.nombre : ""}">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-user mr-2"></i>Profesor
                            </label>
                            <input type="text" 
                                   id="profesor-materia-bloque" 
                                   class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                                   placeholder="Nombre del profesor" 
                                   value="${bloque ? bloque.materia.profesor : ""}">
                        </div>
                        <div class="flex space-x-3 pt-4">
                            <button onclick="guardarBloque('${dia}', ${bloqueId})"
                                    class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-save"></i>
                                <span>Guardar</span>
                            </button>
                            ${
                              bloque
                                ? `
                                <button onclick="eliminarBloque('${dia}', ${bloqueId})"
                                        class="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `
                                : ""
                            }
                            <button onclick="cerrarModalApuntes()"
                                    class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `

  // Actualizar hora de fin automáticamente
  document.getElementById("hora-inicio").addEventListener("change", function () {
    const horaInicio = this.value
    const inicioMinutos = convertirHoraAMinutos(horaInicio)
    const finMinutos = inicioMinutos + 120 // 2 horas por defecto
    const horaFin = convertirMinutosAHora(finMinutos)

    const selectFin = document.getElementById("hora-fin")
    selectFin.value = horaFin
  })
}

function manejarClickBloque(dia, bloqueId) {
  const horario = cargarHorario()
  const bloque = horario.bloques[dia][bloqueId]

  if (editandoHorario) {
    abrirModalAgregarBloque(dia, bloqueId)
  } else {
    // Fix: Call the placeholder/implemented abrirModalApuntes function
    const abrirModalApuntes = (dia, bloque) => {
      const modal = document.getElementById("modal-apuntes")
      modal.classList.remove("hidden")
      modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-sticky-note text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">Registrar Apunte</h2>
                                <p class="opacity-90">${bloque.materia.nombre}</p>
                                <p class="text-sm opacity-75">${dia} | ${bloque.horaInicio} - ${bloque.horaFin} | Prof. ${bloque.materia.profesor}</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-pencil-alt mr-2"></i>Contenido del Apunte
                            </label>
                            <textarea id="texto-apunte"
                                      class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
                                      rows="4"
                                      placeholder="Escribe tu apunte aquí..."></textarea>
                        </div>
                        <!-- Input de tipo option para seleccionar el tipo de apunte -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-pencil-alt mr-2"></i>Tipo de Apunte
                            </label>
                            <select id="tipo-apunte" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                <option value="apunte">Apunte</option>
                                <option value="tarea">Tarea</option>
                                <option value="examen">Examen</option>
                                <option value="estudiar">Estudiar</option>
                            </select>
                        </div>
                        <!-- Agregar checkbox para habilitar recordatorios con notificaciones push -->
                        <div class="flex items-center space-x-3">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <input type="checkbox" id="recordatorio" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700">
                                <i class="fas fa-bell mr-2"></i>Recordar apunte
                            </label>
                        </div>
                        <!-- Input para seleccionar a que hora hacer el recordatorio -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-hora-recordatorio" class="hidden">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-clock mr-2"></i>Hora del Recordatorio
                            </label>
                            <input type="time" id="hora-recordatorio" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                        </div>
                        <!-- Checkbox por si el usuario prefiere que los recordatorios sean recurrentes cada cuanto tiempo -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-recurrencia-recordatorio" class="hidden flex items-center space-x-3">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              <input type="checkbox" id="recurrente" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700">
                              <i class="fas fa-repeat mr-2"></i>Recurrente
                            </label>
                        </div>
                        <!-- Input para seleccionar cada cuanto hacer los recordatorios recurrentes, diás, horas, minutos, segundos -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-intervalo-recordatorio" class="hidden">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-sync-alt mr-2"></i>Intervalo de Recurrencia
                            </label>
                            <select id="intervalo-recordatorio" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                <option value="diario">Diario</option>
                                <option value="semanal">Semanal</option>
                                <option value="quincenal">Quincenal</option>
                                <option value="mensual">Mensual</option>
                            </select>
                        </div>
                        <!-- Si selecciona diario, mostrar un input para seleccionar cada cuanto se debe hacer el recordatorio, días, horas, minutos, segundos -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-form-recordatorio" class="hidden">
                            <form id="recordatorio-form">
                              <label for="intervalo-cantidad">Repetir cada:</label>
                              <input type="number" id="intervalo-cantidad" name="intervalo-cantidad" min="1" value="1">

                              <select id="intervalo-tipo" name="intervalo-tipo">
                                <option value="segundos">Segundos</option>
                                <option value="minutos" selected>Minutos</option>
                                <option value="horas">Horas</option>
                                <option value="dias">Días</option>
                              </select>
                            </form>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            <button id="subir-foto"
                                    class="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-camera"></i>
                                <span>Foto</span>
                            </button>
                            <button id="grabar-audio"
                                    class="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-microphone"></i>
                                <span>Audio</span>
                            </button>
                            <button id="subir-archivo"
                                    class="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-file-upload"></i>
                                <span>Archivos</span>
                            </button>
                            <input type="file" id="archivo-input" class="hidden" multiple
                                   accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.js,.css,.html,.mp3,.wav,.mp4,.m4a">
                        </div>
                        <div id="multimedia-preview" class="space-y-3"></div>
                        <div id="archivos-preview" class="space-y-2"></div>
                        <div class="flex space-x-3 pt-4">
                            <button onclick="guardarApunteBloque('${dia}', '${bloque.horaInicio}', '${bloque.horaFin}', '${bloque.materia.codigo}').catch(err => console.error(err))"
                                    class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-save"></i>
                                <span>Guardar Apunte</span>
                            </button>
                            <button onclick="cerrarModalApuntes()"
                                    class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `

      document.getElementById("subir-foto").addEventListener("click", subirFoto)
      document.getElementById("grabar-audio").addEventListener("click", grabarAudio)

      // Configurar el manejo de archivos
      const botonArchivo = document.getElementById("subir-archivo")
      const inputArchivo = document.getElementById("archivo-input")

      botonArchivo.addEventListener("click", () => inputArchivo.click())

      inputArchivo.addEventListener("change", async function () {
        const files = Array.from(this.files)

        try {
          for (const file of files) {
            // Fix: Declare subirArchivo as a placeholder or implement it
            const subirArchivo = async (file) => {
              console.warn("SubirArchivo function is not fully implemented. Returning placeholder data.")
              // Placeholder implementation
              return {
                url: URL.createObjectURL(file), // Use blob URL for preview
                nombre: file.name,
                tipo: file.type,
                tamano: file.size.toString(),
              }
            }
            const archivoInfo = await subirArchivo(file)

            // Validar que tengamos una URL válida
            if (!archivoInfo.url) {
              throw new Error("No se pudo obtener la URL del archivo")
            }

            console.log("Archivo subido exitosamente:", archivoInfo)
            archivosUrls.push(archivoInfo.url)
            archivosInfo.push(archivoInfo)
          }
          // Fix: Declare actualizarVistaPrevia as a placeholder or implement it
          const actualizarVistaPrevia = () => {
            console.warn("actualizarVistaPrevia function is not implemented. Please implement it.")
            // Placeholder: You might want to refresh a list of uploaded files here.
            const archivosPreview = document.getElementById("archivos-preview")
            if (archivosPreview) {
              archivosPreview.innerHTML = archivosInfo
                .map((info) => `<div class="text-sm text-gray-700 dark:text-gray-300">${info.nombre}</div>`)
                .join("")
            }
          }
          actualizarVistaPrevia()
        } catch (error) {
          console.error("Error al subir archivo:", error)
          showCustomAlert("Error al subir uno o más archivos: " + error.message)
        }

        // Limpiar input para permitir subir el mismo archivo nuevamente
        this.value = ""
      })

      if (typeof window.initReminderToggles === "function") {
        window.initReminderToggles()
      }
    }
    abrirModalApuntes(dia, bloque)
  }
}

function guardarBloque(dia, bloqueId) {
  const horaInicio = document.getElementById("hora-inicio").value
  const horaFin = document.getElementById("hora-fin").value
  const codigo = document.getElementById("codigo-materia-bloque").value
  const nombre = document.getElementById("nombre-materia-bloque").value
  const profesor = document.getElementById("profesor-materia-bloque").value

  if (!horaInicio || !horaFin || !codigo || !nombre) {
    showCustomAlert("Por favor, completa todos los campos obligatorios.")
    return
  }

  if (convertirHoraAMinutos(horaInicio) >= convertirHoraAMinutos(horaFin)) {
    showCustomAlert("La hora de fin debe ser posterior a la hora de inicio.")
    return
  }

  const horario = cargarHorario()

  // Verificar conflictos de horario
  if (verificarConflictoHorario(dia, horaInicio, horaFin, horario, bloqueId)) {
    showCustomAlert("Ya existe una clase en ese horario. Por favor, selecciona un horario diferente.")
    return
  }

  // Inicializar bloques del día si no existen
  if (!horario.bloques[dia]) {
    horario.bloques[dia] = []
  }

  const nuevoBloque = {
    horaInicio,
    horaFin,
    materia: {
      codigo,
      nombre,
      profesor,
    },
  }

  if (bloqueId !== null) {
    // Editar bloque existente
    horario.bloques[dia][bloqueId] = nuevoBloque
  } else {
    // Agregar nuevo bloque
    horario.bloques[dia].push(nuevoBloque)
    // Ordenar bloques por hora de inicio
    horario.bloques[dia].sort((a, b) => convertirHoraAMinutos(a.horaInicio) - convertirHoraAMinutos(b.horaInicio))
  }

  // Actualizar información de materias
  horario.materiasInfo[codigo] = { nombre, profesor }

  guardarHorario(horario)
  cerrarModalApuntes()
  cargarHorarioSemanal()
}

function eliminarBloque(dia, bloqueId) {
  showCustomConfirm("¿Estás seguro de que quieres eliminar esta clase?", () => {
    const horario = cargarHorario()
    horario.bloques[dia].splice(bloqueId, 1)

    // Limpiar arreglo si está vacío
    if (horario.bloques[dia].length === 0) {
      delete horario.bloques[dia]
    }

    guardarHorario(horario)
    cerrarModalApuntes()
    cargarHorarioSemanal()
  })
}

async function guardarApunteBloque(dia, horaInicio, horaFin, codigoMateria) {
  const texto = document.getElementById("texto-apunte").value
  const tipoApunte = document.getElementById("tipo-apunte").value
  const horario = cargarHorario()
  const materiaInfo = horario.materiasInfo[codigoMateria]

  if (!texto) {
    showCustomAlert("Por favor, escribe algún contenido en el apunte.")
    return
  }

  // Validar que archivosInfo esté definido
  const archivosInfoValidado = Array.isArray(archivosInfo) ? archivosInfo : []

  // Crear un objeto timestamp de Firestore
  const timestamp = firebase.firestore.Timestamp.now()

  const checkboxRecordatorio = document.getElementById("recordatorio")
  const tieneRecordatorio = checkboxRecordatorio && checkboxRecordatorio.checked

  let recordatorioData = null

  if (tieneRecordatorio) {
    const horaRecordatorio = document.getElementById("hora-recordatorio").value
    const checkboxRecurrente = document.getElementById("recurrente")
    const esRecurrente = checkboxRecurrente && checkboxRecurrente.checked

    if (!horaRecordatorio) {
      showCustomAlert("Por favor, selecciona una hora para el recordatorio.")
      return
    }

    // Crear fecha/hora del recordatorio
    const [horas, minutos] = horaRecordatorio.split(":")
    const fechaRecordatorio = new Date()
    fechaRecordatorio.setHours(Number.parseInt(horas), Number.parseInt(minutos), 0, 0)

    // Si la hora ya pasó hoy, programar para mañana
    if (fechaRecordatorio < new Date()) {
      fechaRecordatorio.setDate(fechaRecordatorio.getDate() + 1)
    }

    // Procesar intervalo si es recurrente
    let intervaloData = null
    if (esRecurrente) {
      const intervaloCantidad = document.getElementById("intervalo-cantidad").value
      const intervaloTipo = document.getElementById("intervalo-tipo").value

      intervaloData = {
        cantidad: Number.parseInt(intervaloCantidad) || 1,
        tipo: intervaloTipo || "minutos",
      }
    }

    // Crear objeto de recordatorio usando el scheduler
    if (window.remindersScheduler) {
      recordatorioData = window.remindersScheduler.crearRecordatorio({
        fechaHora: fechaRecordatorio,
        recurrente: esRecurrente,
        intervalo: intervaloData,
      })
    } else {
      console.error("RemindersScheduler no está disponible")
      showCustomAlert("Error al configurar el recordatorio. Por favor, recarga la página.")
      return
    }
  }

  const apunte = {
    horaInicio,
    horaFin,
    texto: texto || "",
    tipo: tipoApunte || "apunte", // Agregar tipo de apunte
    materia: {
      codigo: codigoMateria,
      nombre: materiaInfo?.nombre || "",
      profesor: materiaInfo?.profesor || "",
    },
    dia,
    duracion: calcularDuracionBloque(horaInicio, horaFin),
    fecha: timestamp,
    fotoUrl: fotoUrl || null,
    audioUrl: audioUrl || null,
    archivos:
      archivosInfoValidado.length > 0
        ? archivosInfoValidado.map((archivo) => ({
            url: archivo.url || "",
            nombre: archivo.nombre || "",
            tipo: archivo.tipo || "",
            tamano: Number.parseInt(archivo.tamano) || 0,
          }))
        : [],
    recordatorio: recordatorioData, // Agregar información de recordatorio
  }

  try {
    // Guardar en Firebase
    const docRef = await db.collection("apuntes").add(apunte)

    if (recordatorioData && window.remindersScheduler) {
      // Agregar el ID del documento al apunte
      apunte.id = docRef.id

      // Programar el recordatorio
      window.remindersScheduler.programarRecordatorio(apunte)

      console.log(`[guardarApunteBloque] Recordatorio programado para apunte ${docRef.id}`)
    }

    cerrarModalApuntes()
    await cargarApuntesRecientes()
    showCustomAlert("Apunte guardado exitosamente", "success")
  } catch (error) {
    console.error("Error al guardar el apunte:", error)
    showCustomAlert("Error al guardar el apunte. Por favor, intenta de nuevo.")
    throw error
  }
}

function manejarClickCelda(celda) {
  const dia = celda.dataset.dia
  const hora = celda.dataset.hora
  const horario = cargarHorario()
  const materiaExistente = horario.materias[`${dia}-${hora}`]

  if (editandoHorario || !materiaExistente) {
    abrirModalAgregarEditarMateria(dia, hora, materiaExistente)
  } else {
    // Fix: Call the placeholder/implemented abrirModalApuntes function
    const abrirModalApuntes = (dia, bloque) => {
      const modal = document.getElementById("modal-apuntes")
      modal.classList.remove("hidden")
      modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-sticky-note text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">Registrar Apunte</h2>
                                <p class="opacity-90">${bloque.materia.nombre}</p>
                                <p class="text-sm opacity-75">${dia} | ${bloque.horaInicio} - ${bloque.horaFin} | Prof. ${bloque.materia.profesor}</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-pencil-alt mr-2"></i>Contenido del Apunte
                            </label>
                            <textarea id="texto-apunte"
                                      class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
                                      rows="4"
                                      placeholder="Escribe tu apunte aquí..."></textarea>
                        </div>
                        <!-- Input de tipo option para seleccionar el tipo de apunte -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-pencil-alt mr-2"></i>Tipo de Apunte
                            </label>
                            <select id="tipo-apunte" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                <option value="apunte">Apunte</option>
                                <option value="tarea">Tarea</option>
                                <option value="examen">Examen</option>
                                <option value="estudiar">Estudiar</option>
                            </select>
                        </div>
                        <!-- Agregar checkbox para habilitar recordatorios con notificaciones push -->
                        <div class="flex items-center space-x-3">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <input type="checkbox" id="recordatorio" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700">
                                <i class="fas fa-bell mr-2"></i>Recordar apunte
                            </label>
                        </div>
                        <!-- Input para seleccionar a que hora hacer el recordatorio -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-hora-recordatorio" class="hidden">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-clock mr-2"></i>Hora del Recordatorio
                            </label>
                            <input type="time" id="hora-recordatorio" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                        </div>
                        <!-- Checkbox por si el usuario prefiere que los recordatorios sean recurrentes cada cuanto tiempo -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-recurrencia-recordatorio" class="hidden flex items-center space-x-3">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              <input type="checkbox" id="recurrente" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700">
                              <i class="fas fa-repeat mr-2"></i>Recurrente
                            </label>
                        </div>
                        <!-- Input para seleccionar cada cuanto hacer los recordatorios recurrentes, diás, horas, minutos, segundos -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-intervalo-recordatorio" class="hidden">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-sync-alt mr-2"></i>Intervalo de Recurrencia
                            </label>
                            <select id="intervalo-recordatorio" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                <option value="diario">Diario</option>
                                <option value="semanal">Semanal</option>
                                <option value="quincenal">Quincenal</option>
                                <option value="mensual">Mensual</option>
                            </select>
                        </div>
                        <!-- Si selecciona diario, mostrar un input para seleccionar cada cuanto se debe hacer el recordatorio, días, horas, minutos, segundos -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-form-recordatorio" class="hidden">
                            <form id="recordatorio-form">
                              <label for="intervalo-cantidad">Repetir cada:</label>
                              <input type="number" id="intervalo-cantidad" name="intervalo-cantidad" min="1" value="1">

                              <select id="intervalo-tipo" name="intervalo-tipo">
                                <option value="segundos">Segundos</option>
                                <option value="minutos" selected>Minutos</option>
                                <option value="horas">Horas</option>
                                <option value="dias">Días</option>
                              </select>

                              <button type="button" id="guardar">Guardar recordatorio</button>
                            </form>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            <button id="subir-foto"
                                    class="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-camera"></i>
                                <span>Foto</span>
                            </button>
                            <button id="grabar-audio"
                                    class="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-microphone"></i>
                                <span>Audio</span>
                            </button>
                            <button id="subir-archivo"
                                    class="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-file-upload"></i>
                                <span>Archivos</span>
                            </button>
                            <input type="file" id="archivo-input" class="hidden" multiple
                                   accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.js,.css,.html,.mp3,.wav,.mp4,.m4a">
                        </div>
                        <div id="multimedia-preview" class="space-y-3"></div>
                        <div id="archivos-preview" class="space-y-2"></div>
                        <div class="flex space-x-3 pt-4">
                            <button onclick="guardarApunteBloque('${dia}', '${bloque.horaInicio}', '${bloque.horaFin}', '${bloque.materia.codigo}').catch(err => console.error(err))"
                                    class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-save"></i>
                                <span>Guardar Apunte</span>
                            </button>
                            <button onclick="cerrarModalApuntes()"
                                    class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `

      document.getElementById("subir-foto").addEventListener("click", subirFoto)
      document.getElementById("grabar-audio").addEventListener("click", grabarAudio)

      // Configurar el manejo de archivos
      const botonArchivo = document.getElementById("subir-archivo")
      const inputArchivo = document.getElementById("archivo-input")

      botonArchivo.addEventListener("click", () => inputArchivo.click())

      inputArchivo.addEventListener("change", async function () {
        const files = Array.from(this.files)

        try {
          for (const file of files) {
            // Fix: Declare subirArchivo as a placeholder or implement it
            const subirArchivo = async (file) => {
              console.warn("SubirArchivo function is not fully implemented. Returning placeholder data.")
              // Placeholder implementation
              return {
                url: URL.createObjectURL(file), // Use blob URL for preview
                nombre: file.name,
                tipo: file.type,
                tamano: file.size.toString(),
              }
            }
            const archivoInfo = await subirArchivo(file)

            // Validar que tengamos una URL válida
            if (!archivoInfo.url) {
              throw new Error("No se pudo obtener la URL del archivo")
            }

            console.log("Archivo subido exitosamente:", archivoInfo)
            archivosUrls.push(archivoInfo.url)
            archivosInfo.push(archivoInfo)
          }
          // Fix: Declare actualizarVistaPrevia as a placeholder or implement it
          const actualizarVistaPrevia = () => {
            console.warn("actualizarVistaPrevia function is not implemented. Please implement it.")
            // Placeholder: You might want to refresh a list of uploaded files here.
            const archivosPreview = document.getElementById("archivos-preview")
            if (archivosPreview) {
              archivosPreview.innerHTML = archivosInfo
                .map((info) => `<div class="text-sm text-gray-700 dark:text-gray-300">${info.nombre}</div>`)
                .join("")
            }
          }
          actualizarVistaPrevia()
        } catch (error) {
          console.error("Error al subir archivo:", error)
          showCustomAlert("Error al subir uno o más archivos: " + error.message)
        }

        // Limpiar input para permitir subir el mismo archivo nuevamente
        this.value = ""
      })

      if (typeof window.initReminderToggles === "function") {
        window.initReminderToggles()
      }
    }
    abrirModalApuntes(dia, bloque)
  }
}

function abrirModalApuntesBloque(dia, bloque) {
  const modal = document.getElementById("modal-apuntes")
  modal.classList.remove("hidden")
  modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-sticky-note text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">Registrar Apunte</h2>
                                <p class="opacity-90">${bloque.materia.nombre}</p>
                                <p class="text-sm opacity-75">${dia} | ${bloque.horaInicio} - ${bloque.horaFin} | Prof. ${bloque.materia.profesor}</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-pencil-alt mr-2"></i>Contenido del Apunte
                            </label>
                            <textarea id="texto-apunte"
                                      class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
                                      rows="4"
                                      placeholder="Escribe tu apunte aquí..."></textarea>
                        </div>
                        <!-- Input de tipo option para seleccionar el tipo de apunte -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-pencil-alt mr-2"></i>Tipo de Apunte
                            </label>
                            <select id="tipo-apunte" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                <option value="apunte">Apunte</option>
                                <option value="tarea">Tarea</option>
                                <option value="examen">Examen</option>
                                <option value="estudiar">Estudiar</option>
                            </select>
                        </div>
                        <!-- Agregar checkbox para habilitar recordatorios con notificaciones push -->
                        <div class="flex items-center space-x-3">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <input type="checkbox" id="recordatorio" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700">
                                <i class="fas fa-bell mr-2"></i>Recordar apunte
                            </label>
                        </div>
                        <!-- Input para seleccionar a que hora hacer el recordatorio -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-hora-recordatorio" class="hidden">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-clock mr-2"></i>Hora del Recordatorio
                            </label>
                            <input type="time" id="hora-recordatorio" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                        </div>
                        <!-- Checkbox por si el usuario prefiere que los recordatorios sean recurrentes cada cuanto tiempo -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-recurrencia-recordatorio" class="hidden flex items-center space-x-3">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              <input type="checkbox" id="recurrente" class="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700">
                              <i class="fas fa-repeat mr-2"></i>Recurrente
                            </label>
                        </div>
                        <!-- Input para seleccionar cada cuanto hacer los recordatorios recurrentes, diás, horas, minutos, segundos -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-intervalo-recordatorio" class="hidden">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-sync-alt mr-2"></i>Intervalo de Recurrencia
                            </label>
                            <select id="intervalo-recordatorio" class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                                <option value="diario">Diario</option>
                                <option value="semanal">Semanal</option>
                                <option value="quincenal">Quincenal</option>
                                <option value="mensual">Mensual</option>
                            </select>
                        </div>
                        <!-- Si selecciona diario, mostrar un input para seleccionar cada cuanto se debe hacer el recordatorio, días, horas, minutos, segundos -->
                        <!-- Agregado hidden por defecto -->
                        <div id="contenedor-form-recordatorio" class="hidden">
                            <form id="recordatorio-form">
                              <label for="intervalo-cantidad">Repetir cada:</label>
                              <input type="number" id="intervalo-cantidad" name="intervalo-cantidad" min="1" value="1">

                              <select id="intervalo-tipo" name="intervalo-tipo">
                                <option value="segundos">Segundos</option>
                                <option value="minutos" selected>Minutos</option>
                                <option value="horas">Horas</option>
                                <option value="dias">Días</option>
                              </select>

                              <button type="button" id="guardar">Guardar recordatorio</button>
                            </form>
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            <button id="subir-foto"
                                    class="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-camera"></i>
                                <span>Foto</span>
                            </button>
                            <button id="grabar-audio"
                                    class="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-microphone"></i>
                                <span>Audio</span>
                            </button>
                            <button id="subir-archivo"
                                    class="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-file-upload"></i>
                                <span>Archivos</span>
                            </button>
                            <input type="file" id="archivo-input" class="hidden" multiple
                                   accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.js,.css,.html,.mp3,.wav,.mp4,.m4a">
                        </div>
                        <div id="multimedia-preview" class="space-y-3"></div>
                        <div id="archivos-preview" class="space-y-2"></div>
                        <div class="flex space-x-3 pt-4">
                            <button onclick="guardarApunteBloque('${dia}', '${bloque.horaInicio}', '${bloque.horaFin}', '${bloque.materia.codigo}').catch(err => console.error(err))"
                                    class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-save"></i>
                                <span>Guardar Apunte</span>
                            </button>
                            <button onclick="cerrarModalApuntes()"
                                    class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `

  document.getElementById("subir-foto").addEventListener("click", subirFoto)
  document.getElementById("grabar-audio").addEventListener("click", grabarAudio)

  // Configurar el manejo de archivos
  const botonArchivo = document.getElementById("subir-archivo")
  const inputArchivo = document.getElementById("archivo-input")

  botonArchivo.addEventListener("click", () => inputArchivo.click())

  inputArchivo.addEventListener("change", async function () {
    const files = Array.from(this.files)

    try {
      for (const file of files) {
        // Fix: Declare subirArchivo as a placeholder or implement it
        const subirArchivo = async (file) => {
          console.warn("SubirArchivo function is not fully implemented. Returning placeholder data.")
          // Placeholder implementation
          return {
            url: URL.createObjectURL(file), // Use blob URL for preview
            nombre: file.name,
            tipo: file.type,
            tamano: file.size.toString(),
          }
        }
        const archivoInfo = await subirArchivo(file)

        // Validar que tengamos una URL válida
        if (!archivoInfo.url) {
          throw new Error("No se pudo obtener la URL del archivo")
        }

        console.log("Archivo subido exitosamente:", archivoInfo)
        archivosUrls.push(archivoInfo.url)
        archivosInfo.push(archivoInfo)
      }
      // Fix: Declare actualizarVistaPrevia as a placeholder or implement it
      const actualizarVistaPrevia = () => {
        console.warn("actualizarVistaPrevia function is not implemented. Please implement it.")
        // Placeholder: You might want to refresh a list of uploaded files here.
        const archivosPreview = document.getElementById("archivos-preview")
        if (archivosPreview) {
          archivosPreview.innerHTML = archivosInfo
            .map((info) => `<div class="text-sm text-gray-700 dark:text-gray-300">${info.nombre}</div>`)
            .join("")
        }
      }
      actualizarVistaPrevia()
    } catch (error) {
      console.error("Error al subir archivo:", error)
      showCustomAlert("Error al subir uno o más archivos: " + error.message)
    }

    // Limpiar input para permitir subir el mismo archivo nuevamente
    this.value = ""
  })

  if (typeof window.initReminderToggles === "function") {
    window.initReminderToggles()
  }
}

function guardarMateria(dia, hora) {
  const codigo = document.getElementById("codigo-materia").value
  const nombre = document.getElementById("nombre-materia").value
  const profesor = document.getElementById("profesor-materia").value

  if (!codigo || !nombre) {
    showCustomAlert("Por favor, completa al menos el código y nombre de la materia.")
    return
  }

  const horario = cargarHorario()
  horario.materias[`${dia}-${hora}`] = { codigo, nombre, profesor }
  horario.materiasInfo[codigo] = { nombre, profesor }

  guardarHorario(horario)
  cerrarModalApuntes()
  cargarHorarioSemanal()
}

function eliminarMateria(dia, hora) {
  showCustomConfirm("¿Estás seguro de que quieres eliminar esta materia?", () => {
    const horario = cargarHorario()
    delete horario.materias[`${dia}-${hora}`]
    guardarHorario(horario)
    cerrarModalApuntes()
    cargarHorarioSemanal()
  })
}

function toggleEditarHorario() {
  editandoHorario = !editandoHorario
  const botonEditar = document.getElementById("editar-horario")
  const icon = botonEditar.querySelector("i")
  const span = botonEditar.querySelector("span")

  if (editandoHorario) {
    icon.className = "fas fa-check"
    span.textContent = "Finalizar Edición"
    botonEditar.className =
      "bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
  } else {
    icon.className = "fas fa-edit"
    span.textContent = "Editar Horario"
    botonEditar.className =
      "bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
  }
  cargarHorarioSemanal()
}

function cerrarModalApuntes() {
  const modal = document.getElementById("modal-apuntes")
  if (modal) {
    modal.classList.add("hidden")
  }

  // Resetear variables globales
  fotoUrl = null
  apunteEditando = null
  audioUrl = null
  audioChunks = []
  archivosInfo = []
  archivosUrls = []

  // Limpiar previsualizaciones solo si los elementos existen
  const archivosPreview = document.getElementById("archivos-preview")
  if (archivosPreview) {
    archivosPreview.innerHTML = ""
  }

  const textoApunte = document.getElementById("texto-apunte")
  if (textoApunte) {
    textoApunte.value = ""
  }
}

// Funciones para multimedia
async function subirFoto() {
  if (!cloudinaryConfig.cloudName) {
    console.error("La configuración de Cloudinary no está lista", cloudinaryConfig)
    showCustomAlert(
      "Error: La configuración de carga de imágenes no está lista. Por favor, intenta de nuevo en unos segundos.",
    )
    return
  }

  try {
    // Obtener la firma del servidor
    const baseUrl = window.location.origin
    const signatureResponse = await fetch(`${baseUrl}/api/generate-signature`, {
      method: "POST",
    })

    if (!signatureResponse.ok) {
      throw new Error("Error al obtener la firma de subida")
    }

    // Fix: Declare cloudinary variable before use
    const cloudinary = window.cloudinary
    const { signature, timestamp, apiKey, cloudName, folder } = await signatureResponse.json()

    // Crear el widget con la firma
    const myWidget = cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        apiKey: apiKey,
        uploadPreset: cloudinaryConfig.uploadPreset,
        folder: folder,
        sources: ["local", "camera", "url"],
        multiple: false,
        maxFiles: 1,
        maxFileSize: 5000000, // 5MB
        resourceType: "image",
        clientAllowedFormats: ["jpg", "jpeg", "png", "gif"],
        showAdvancedOptions: false,
        cropping: true,
        croppingAspectRatio: 1.0,
        language: "es",
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#0078FF",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#0078FF",
            action: "#FF620C",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#0078FF",
            complete: "#20B832",
            sourceBg: "#E4EBF1",
          },
        },
      },
      (error, result) => {
        console.log("Cloudinary widget callback:", { error, result, event: result?.event })

        if (!error && result && result.event === "success") {
          console.log("Imagen subida con éxito:", result.info.secure_url)
          fotoUrl = result.info.secure_url
          const previewContainer = document.getElementById("multimedia-preview")
          previewContainer.innerHTML += `
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                                <div class="flex items-center space-x-2 mb-2">
                                    <i class="fas fa-image text-blue-500"></i>
                                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Imagen adjuntada</span>
                                </div>
                                <img src="${fotoUrl}" alt="Imagen subida" class="w-full h-32 object-cover rounded-lg">
                            </div>
                        `
        } else if (error) {
          console.error("Error al subir la imagen:", error)
          showCustomAlert("Error al subir la imagen: " + (error.message || JSON.stringify(error)))
        } else if (result) {
          console.log("Evento del widget:", result.event)
        }
      },
    )
    myWidget.open()
  } catch (error) {
    console.error("Error al crear el widget de Cloudinary:", error)
    showCustomAlert("Error al preparar la subida de imágenes: " + error.message)
  }
}

async function subirAudio(blob) {
  try {
    console.log("Iniciando proceso de subida de audio...")

    // Obtener URL firmada del servidor
    const urlResponse = await fetch("/api/get-signed-url", {
      method: "POST",
    })

    if (!urlResponse.ok) {
      throw new Error("Error al obtener la URL de subida")
    }

    const { signedUrl, fileName, bucketName } = await urlResponse.json()

    // Subir el archivo usando la URL firmada
    const region = AWS.config.region || "us-east-2" // Usar región por defecto si no está definida
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": "audio/webm",
      },
    })

    if (!uploadResponse.ok) {
      throw new Error("Error al subir el archivo")
    }

    console.log("Audio subido con éxito:", fileUrl)
    return fileUrl
  } catch (error) {
    console.error("Error al subir el audio:", error)
    showCustomAlert("Error al subir el audio: " + error.message)
    return null
  }
}

function grabarAudio() {
  const button = document.getElementById("grabar-audio")
  const icon = button.querySelector("i")
  const span = button.querySelector("span")

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop()
    icon.className = "fas fa-microphone"
    span.textContent = "Audio"
    button.className =
      "bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2"
    return
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream)
      mediaRecorder.start()
      icon.className = "fas fa-stop"
      span.textContent = "Detener"
      button.className =
        "bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center space-x-2"

      audioChunks = []
      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data)
      })

      mediaRecorder.addEventListener("stop", async () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" })
        audioUrl = await subirAudio(blob)
        if (audioUrl) {
          const previewContainer = document.getElementById("multimedia-preview")
          previewContainer.innerHTML += `
                                <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <i class="fas fa-volume-up text-purple-500"></i>
                                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Audio grabado</span>
                                    </div>
                                    <audio controls class="w-full">
                                        <source src="${audioUrl}" type="audio/mpeg">
                                        Tu navegador no soporta el elemento audio.
                                    </audio>
                                </div>
                            `
        }
      })
    })
    .catch((error) => console.error("Error al grabar audio:", error))
}

async function guardarApunte(dia, hora, codigoMateria) {
  const texto = document.getElementById("texto-apunte").value
  const horario = cargarHorario()
  const materiaInfo = horario.materiasInfo[codigoMateria]

  if (!texto) {
    showCustomAlert("Por favor, escribe algún contenido en el apunte.")
    return
  }

  const apunte = {
    texto,
    materia: {
      codigo: codigoMateria,
      nombre: materiaInfo.nombre,
      profesor: materiaInfo.profesor,
    },
    dia,
    hora,
    fecha: new Date(),
    fotoUrl: fotoUrl || null,
    audioUrl: audioUrl || null,
  }

  try {
    await db.collection("apuntes").add(apunte)
    cerrarModalApuntes()
    cargarApuntesRecientes()
  } catch (error) {
    console.error("Error al guardar el apunte:", error)
    showCustomAlert("Error al guardar el apunte. Por favor, intenta de nuevo.")
  }
}

function buscarApuntes() {
  const busqueda = document.getElementById("busqueda-input").value.toLowerCase()
  const resultadosDiv = document.getElementById("resultados-busqueda")

  // Limpiar resultados si no hay búsqueda
  if (!busqueda) {
    resultadosDiv.innerHTML = ""
    return
  }

  // Obtener apuntes de la base de datos
  db.collection("apuntes")
    .get()
    .then((querySnapshot) => {
      const apuntesUnicos = new Map()

      // Filtrar apuntes según la búsqueda
      querySnapshot.forEach((doc) => {
        const apunte = doc.data()
        const apunteId = doc.id

        if (
          apunte.texto.toLowerCase().includes(busqueda) ||
          apunte.materia.nombre.toLowerCase().includes(busqueda) ||
          apunte.materia.codigo.toLowerCase().includes(busqueda)
        ) {
          apuntesUnicos.set(apunteId, apunte)
        }
      })

      // Generar HTML de resultados
      let resultadosHTML = ""
      if (apuntesUnicos.size > 0) {
        resultadosHTML = `
                        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-8">
                            <div class="bg-gradient-to-r from-green-500 to-blue-500 p-4">
                                <h3 class="text-lg font-bold text-white flex items-center">
                                    <i class="fas fa-search-plus mr-2"></i>
                                    Resultados de búsqueda (${apuntesUnicos.size})
                                </h3>
                            </div>
                            <div class="p-6 space-y-4">
                    `
        apuntesUnicos.forEach((apunte) => {
          resultadosHTML += `
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 card-hover">
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <h5 class="font-bold text-gray-800 dark:text-white">${apunte.materia.nombre}</h5>
                                        <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            <span><i class="fas fa-tag mr-1"></i>${apunte.materia.codigo}</span>
                                            <span><i class="fas fa-user mr-1"></i>${apunte.materia.profesor}</span>
                                            <span><i class="fas fa-calendar mr-1"></i>${apunte.dia} - ${apunte.hora}</span>
                                        </div>
                                    </div>
                                    <span class="text-xs text-gray-500 dark:text-gray-400">${apunte.fecha.toDate().toLocaleDateString()}</span>
                                </div>
                                <p class="text-gray-700 dark:text-gray-300 mb-3">${apunte.texto}</p>
                                ${
                                  apunte.fotoUrl
                                    ? `
                                    <div class="mb-3">
                                        <a href="${apunte.fotoUrl}" data-fancybox data-caption="${apunte.materia.nombre} - ${apunte.dia} ${apunte.hora}">
                                            <img src="${apunte.fotoUrl}" alt="Foto del apunte" class="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
                                        </a>
                                    </div>
                                `
                                    : ""
                                }
                                ${
                                  apunte.audioUrl
                                    ? `
                                    <div class="bg-white dark:bg-gray-800 rounded-lg p-3">
                                        <div class="flex items-center space-x-2 mb-2">
                                            <i class="fas fa-volume-up text-purple-500"></i>
                                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Audio adjunto</span>
                                        </div>
                                        <audio controls class="w-full">
                                            <source src="${apunte.audioUrl}" type="audio/mpeg">
                                            Tu navegador no soporta el elemento audio.
                                        </audio>
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        `
        })
        resultadosHTML += `
                            </div>
                        </div>
                    `
      } else {
        resultadosHTML = `
                        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center mb-8">
                            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-search text-gray-400 text-2xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No se encontraron resultados</h3>
                            <p class="text-gray-500 dark:text-gray-400">Intenta con otros términos de búsqueda</p>
                        </div>
                    `
      }

      // Mostrar resultados en la interfaz
      resultadosDiv.innerHTML = resultadosHTML

      // Reiniciar Fancybox si es necesario
      // Fix: Declare lightbox as a placeholder or implement it
      const lightbox = {
        reload: () => {
          console.warn("lightbox.reload() is a placeholder.")
        },
      }
      if (typeof lightbox !== "undefined") {
        lightbox.reload()
      }
    })
    .catch((error) => {
      console.error("Error al buscar apuntes:", error)
      resultadosDiv.innerHTML = `
                    <div class="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 text-center mb-8">
                        <div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Error en la búsqueda</h3>
                        <p class="text-red-600 dark:text-red-400">No se pudo realizar la búsqueda. Intenta de nuevo.</p>
                    </div>
                `
    })
}

// Reiniciar estado de paginación
paginaActual = 1
cacheApuntes.paginas = {}
cacheApuntes.metadata = {
  ultimoApunte: null,
  primerApunte: null,
  totalPaginas: 1,
}

function actualizarControlesPaginacion(hayMasApuntes) {
  const prevButton = document.getElementById("prev-page")
  const nextButton = document.getElementById("next-page")
  const paginaSpan = document.getElementById("pagina-actual")

  if (!prevButton || !nextButton || !paginaSpan) {
    console.warn("No se encontraron los controles de paginación")
    return
  }

  // Asegurar que la página actual nunca sea menor a 1
  if (paginaActual < 1) {
    paginaActual = 1
  }

  console.log("Actualizando controles de paginación:", {
    paginaActual,
    hayMasApuntes,
  })

  prevButton.disabled = paginaActual <= 1
  nextButton.disabled = !hayMasApuntes
  paginaSpan.textContent = `Página ${paginaActual || 1}`
}

function renderizarApuntesDePagina(pagina) {
  if (!cacheApuntes.paginas[pagina]) {
    return false // La página no está en caché
  }

  const apuntes = cacheApuntes.paginas[pagina]
  let apuntesHTML = ""

  if (apuntes.length === 0) {
    apuntesHTML = `
            <div class="col-span-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
                <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-sticky-note text-gray-400 text-2xl"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No hay apuntes</h3>
                <p class="text-gray-500 dark:text-gray-400">Comienza creando tu primer apunte desde el horario</p>
            </div>
        `
  } else {
    apuntes.forEach((apunte) => {
      apuntesHTML += generarHTMLApunte(apunte)
    })
  }

  document.getElementById("apuntes-recientes").innerHTML = apuntesHTML

  // Inicializar Plyr para cada nuevo reproductor de audio
  // Fix: Declare Plyr variable before use
  const Plyr = window.Plyr
  const audioElements = document.querySelectorAll("#apuntes-recientes audio")
  audioElements.forEach((audio) => {
    const player = new Plyr(audio)
  })

  // Reiniciar y configurar Fancybox con opciones optimizadas
  // Fix: Declare $ variable before use
  const $ = window.$
  if (typeof $.fancybox !== "undefined") {
    $.fancybox.destroy()
    $("[data-fancybox]").fancybox({
      animationEffect: "fade",
      transitionEffect: "fade",
      animationDuration: 300,
      zoomOpacity: true,
      wheel: false,
      clickContent: false,
      clickSlide: false,
      touch: {
        vertical: false,
      },
      backFocus: false,
      hideScrollbar: true,
      beforeShow: (instance, current) => {
        // Prevenir el desplazamiento de la página
        $("body").addClass("fancybox-active")
      },
      afterClose: (instance, current) => {
        // Restaurar el desplazamiento
        $("body").removeClass("fancybox-active")
      },
      mobile: {
        clickContent: (current, event) => "close",
        clickSlide: (current, event) => "close",
      },
    })
  }

  return true
}

// Reiniciar estado de paginación
function actualizarControlesPaginacion(hayMasApuntes) {
  const prevButton = document.getElementById("prev-page")
  const nextButton = document.getElementById("next-page")
  const paginaSpan = document.getElementById("pagina-actual")

  if (!prevButton || !nextButton || !paginaSpan) {
    console.warn("No se encontraron los controles de paginación")
    return
  }

  // Asegurar que la página actual nunca sea menor a 1
  if (paginaActual < 1) {
    paginaActual = 1
  }

  console.log("Actualizando controles de paginación:", {
    paginaActual,
    hayMasApuntes,
  })

  prevButton.disabled = paginaActual <= 1
  nextButton.disabled = !hayMasApuntes
  paginaSpan.textContent = `Página ${paginaActual || 1}`
}

document.addEventListener("DOMContentLoaded", () => {
  // Reiniciar estado de paginación
  window.paginaActual = 1
  window.cacheApuntes = {
    paginas: {},
    metadata: {
      ultimoApunte: null,
      primerApunte: null,
      totalPaginas: 1,
      cargando: false,
      ultimaPaginaCargada: 1,
    },
  }

  // Cargar horario semanal
  cargarHorarioSemanal()

  // Cargar apuntes recientes
  cargarApuntesRecientes("inicial")

  // Configurar eventos
  document.getElementById("editar-horario").addEventListener("click", toggleEditarHorario)
  document.getElementById("busqueda-input").addEventListener("input", buscarApuntes)

  // Configurar paginación
  document.getElementById("prev-page").addEventListener("click", () => {
    if (paginaActual > 1) {
      cargarApuntesRecientes("anterior")
    } else {
      actualizarControlesPaginacion(true)
    }
  })

  document.getElementById("next-page").addEventListener("click", () => {
    if (paginaActual >= 1) {
      cargarApuntesRecientes("siguiente")
    }
  })
})

async function cargarApuntesRecientes(direccion = "siguiente") {
  // Asegurar que paginaActual sea al menos 1
  if (typeof paginaActual !== "number" || paginaActual < 1) {
    paginaActual = 1
  }

  console.log("Cargando apuntes. Dirección:", direccion, "Página actual:", paginaActual)

  // Evitar múltiples cargas simultáneas
  if (cacheApuntes.metadata.cargando) {
    return
  }
  cacheApuntes.metadata.cargando = true

  const apuntesRecientesDiv = document.getElementById("apuntes-recientes")
  if (!apuntesRecientesDiv) {
    console.error("No se encontró el contenedor de apuntes recientes")
    cacheApuntes.metadata.cargando = false
    return
  }

  // Manejar navegación
  let paginaObjetivo = paginaActual
  if (direccion === "siguiente") {
    paginaObjetivo++
  } else if (direccion === "anterior") {
    paginaObjetivo--
  } else if (direccion === "inicial") {
    paginaObjetivo = 1
  }

  // Validar la página objetivo
  if (paginaObjetivo < 1) {
    paginaObjetivo = 1
  }

  console.log("Página objetivo:", paginaObjetivo)

  // Si no existe el div de carga, lo creamos
  let cargandoDiv = document.getElementById("cargando-apuntes")
  if (!cargandoDiv) {
    cargandoDiv = document.createElement("div")
    cargandoDiv.id = "cargando-apuntes"
    cargandoDiv.className = "hidden p-4 text-center"
    cargandoDiv.innerHTML = `
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">Cargando apuntes...</p>
    `
    apuntesRecientesDiv.parentNode.insertBefore(cargandoDiv, apuntesRecientesDiv)
  }

  const prevButton = document.getElementById("prev-page")
  const nextButton = document.getElementById("next-page")
  const hayMasApuntes = true

  try {
    if (cargandoDiv) cargandoDiv.classList.remove("hidden")
    apuntesRecientesDiv.innerHTML = "" // Limpiar contenido anterior

    let query = db.collection("apuntes").orderBy("fecha", "desc")

    // Si es carga inicial o estamos en la primera página
    if (direccion === "inicial" || paginaObjetivo === 1) {
      query = query.limit(APUNTES_POR_PAGINA)
      cacheApuntes.metadata.ultimoApunte = null
      cacheApuntes.metadata.primerApunte = null
    } else {
      // Verificar si podemos usar la caché
      if (direccion === "anterior" && cacheApuntes.paginas[paginaObjetivo]) {
        console.log("Usando caché para página:", paginaObjetivo)
        paginaActual = paginaObjetivo
        const renderizado = renderizarApuntesDePagina(paginaActual)
        actualizarControlesPaginacion(true)
        if (cargandoDiv) cargandoDiv.classList.add("hidden")
        cacheApuntes.metadata.cargando = false
        return
      }
      query = query.limit(APUNTES_POR_PAGINA)
    }

    // Configurar la consulta según la dirección
    if (direccion === "siguiente" && cacheApuntes.metadata.ultimoApunte) {
      query = query.startAfter(cacheApuntes.metadata.ultimoApunte)
    } else if (direccion === "anterior" && paginaActual > 1) {
      // Si tenemos el primer apunte de la página actual, usarlo como referencia
      if (cacheApuntes.paginas[paginaActual] && cacheApuntes.paginas[paginaActual].length > 0) {
        const primerApuntePaginaActual = await db
          .collection("apuntes")
          .doc(cacheApuntes.paginas[paginaActual][0].id)
          .get()
        if (primerApuntePaginaActual.exists) {
          query = query.endBefore(primerApuntePaginaActual).limitToLast(APUNTES_POR_PAGINA)
        }
      }
    }

    const snapshot = await query.get()
    const apuntes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    console.log(`Obtenidos ${apuntes.length} apuntes para la página ${paginaObjetivo}`)

    // Si no hay apuntes en la primera carga o página 1
    if (apuntes.length === 0 && (direccion === "inicial" || paginaObjetivo === 1)) {
      mostrarNoHayApuntes(apuntesRecientesDiv)
      paginaActual = 1
      actualizarControlesPaginacion(false)
      if (cargandoDiv) cargandoDiv.classList.add("hidden")
      cacheApuntes.metadata.cargando = false
      return
    }

    // Si no hay apuntes en otras situaciones
    if (apuntes.length === 0) {
      // Si estamos intentando ir hacia atrás y no hay resultados, volvemos a la página 1
      if (direccion === "anterior") {
        console.log("No hay más apuntes hacia atrás, volviendo a página 1")
        paginaActual = 1
        await cargarApuntesRecientes("inicial")
        return
      }
      paginaActual = Math.max(1, paginaActual)
      actualizarControlesPaginacion(false)
      if (cargandoDiv) cargandoDiv.classList.add("hidden")
      cacheApuntes.metadata.cargando = false
      return
    }

    // Actualizar la caché y metadata
    if (apuntes.length > 0) {
      let nuevaPagina
      if (direccion === "siguiente") {
        nuevaPagina = paginaActual + 1
        cacheApuntes.metadata.ultimoApunte = snapshot.docs[snapshot.docs.length - 1]
        if (paginaActual === 1) {
          cacheApuntes.metadata.primerApunte = snapshot.docs[0]
        }
      } else {
        nuevaPagina = paginaActual - 1
        if (nuevaPagina === 1) {
          cacheApuntes.metadata.primerApunte = snapshot.docs[0]
        }
      }

      // Actualizar la caché con los nuevos apuntes
      cacheApuntes.paginas[nuevaPagina] = apuntes
      cacheApuntes.metadata.ultimaPaginaCargada = Math.max(cacheApuntes.metadata.ultimaPaginaCargada, nuevaPagina)

      // Actualizar la página actual
      paginaActual = nuevaPagina
    }

    // Renderizar los apuntes
    if (apuntes.length > 0) {
      cacheApuntes.paginas[paginaActual] = apuntes
      const renderizado = renderizarApuntesDePagina(paginaActual)

      if (!renderizado) {
        mostrarErrorCarga(apuntesRecientesDiv)
      }
    } else {
      mostrarNoHayApuntes(apuntesRecientesDiv)
    }

    // Actualizar controles de paginación
    actualizarControlesPaginacion(hayMasApuntes)
  } catch (error) {
    console.error("Error al cargar los apuntes recientes:", error)
    mostrarErrorCarga(apuntesRecientesDiv)
  } finally {
    if (cargandoDiv) cargandoDiv.classList.add("hidden")
    cacheApuntes.metadata.cargando = false
  }
}

function mostrarErrorCarga(contenedor) {
  contenedor.innerHTML = `
        <div class="col-span-full bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-lg p-8 text-center">
            <div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Error al cargar los apuntes</h3>
            <p class="text-red-600 dark:text-red-400">No se pudieron cargar los apuntes. Por favor, intenta de nuevo más tarde.</p>
        </div>
    `
}

function mostrarNoHayApuntes(contenedor) {
  contenedor.innerHTML = `
        <div class="col-span-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-sticky-note text-gray-400 text-2xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No hay apuntes</h3>
            <p class="text-gray-500 dark:text-gray-400">Comienza creando tu primer apunte desde el horario</p>
        </div>
    `
}

function generarHTMLApunte(apunte) {
  const fechaFormateada = apunte.fecha.toDate().toLocaleDateString()

  return `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-2xl shadow-lg overflow-hidden card-hover w-full">
        <div class="w-full">
      <div class="p-6 w-full">
          <div class="flex items-start justify-between mb-3 w-full">
        <div class="flex-grow min-w-0 mr-4">
            <h5 class="font-bold text-gray-800 dark:text-white truncate">${apunte.materia.nombre}</h5>
            <div class="flex items-center flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-800 rounded-full px-2.5 py-1 transition-all duration-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:border-indigo-200 dark:hover:border-indigo-700">
              <i class="fas fa-user mr-1.5"></i>${apunte.materia.profesor}
            </span>
            <span class="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-100 dark:border-emerald-800 rounded-full px-2.5 py-1 transition-all duration-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-200 dark:hover:border-emerald-700">
              <i class="fas fa-calendar mr-1.5"></i>${apunte.dia}
            </span>
          </div>
            </div>
        </div>
        <div class="flex items-center space-x-3 flex-shrink-0">
            <span class="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transform hover:scale-105 transition-all duration-200 flex items-center">
          <i class="fas fa-clock mr-1.5"></i>${fechaFormateada}
            </span>
            <button onclick="compartirApunte('${apunte.id}')"
              class="w-8 h-8 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 group flex-shrink-0"
              title="Compartir apunte">
          <i class="fas fa-share-alt text-sm group-hover:scale-110 transition-transform duration-200"></i>
            </button>
            <button onclick="editarApunte('${apunte.id}')"
              class="w-8 h-8 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 group flex-shrink-0"
              title="Editar apunte">
          <i class="fas fa-edit text-sm group-hover:scale-110 transition-transform duration-200"></i>
            </button>
            <button onclick="eliminarApunte('${apunte.id}')"
              class="w-8 h-8 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 group flex-shrink-0"
              title="Eliminar apunte">
          <i class="fas fa-trash text-sm group-hover:scale-110 transition-transform duration-200"></i>
            </button>
        </div>
          </div>
          <p class="text-gray-700 dark:text-gray-300 mb-3">${apunte.texto}</p>
          ${
            apunte.fotoUrl
              ? `
        <div class="mb-3">
            <a href="${apunte.fotoUrl}" data-fancybox data-caption="${apunte.materia.nombre} - ${apunte.dia} - ${apunte.horaInicio} - ${apunte.horaFin}">
          <img src="${apunte.fotoUrl}" alt="Foto del apunte" class="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
            </a>
        </div>
          `
              : ""
          }
          ${
            apunte.audioUrl
              ? `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div class="flex items-center space-x-2 mb-2">
          <i class="fas fa-volume-up text-purple-500"></i>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Audio adjunto</span>
            </div>
            <audio controls class="w-full">
          <source src="${apunte.audioUrl}" type="audio/mpeg">
          Tu navegador no soporta el elemento audio.
            </audio>
        </div>
          `
              : ""
          }
          ${
            apunte.archivos && apunte.archivos.length > 0
              ? `
        <div class="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <i class="fas fa-paperclip text-indigo-600 dark:text-indigo-400"></i>
              </div>
              <h5 class="text-base font-semibold text-gray-800 dark:text-gray-200">
            Archivos adjuntos
            <span class="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">(${apunte.archivos.length})</span>
              </h5>
          </div>
            </div>
            <div class="grid gap-2">
          ${apunte.archivos
            .map(
              (archivo) => `
              <div class="group bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer" onclick="window.open('${archivo.url}', '_blank')">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
              <i class="${window.getIconoArchivo(archivo.tipo)} text-lg text-indigo-600 dark:text-indigo-400"></i>
                </div>
                <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${archivo.nombre}</p>
              <div class="flex items-center space-x-2 mt-0.5">
                  <span class="text-xs px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 font-medium">
                ${archivo.tipo.toUpperCase()}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                ${window.formatearTamanoArchivo(archivo.tamano)}
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
                <a href="${archivo.url}"
                   download="${archivo.nombre}"
                   class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all duration-200"
                   title="Descargar archivo">
              <i class="fas fa-download"></i>
                </a>
            </div>
              </div>
          `,
            )
            .join("")}
            </div>
        </div>
          `
              : ""
          }
      </div>
        </div>
    </div>
      `
}

let apunteEditando = null

async function editarApunte(apunteId) {
  try {
    const doc = await db.collection("apuntes").doc(apunteId).get()
    if (!doc.exists) throw new Error("No se encontró el apunte")

    const apunte = { id: doc.id, ...doc.data() }
    apunteEditando = apunte

    const modal = document.getElementById("modal-apuntes")
    const modalContent = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">Editar Apunte</h2>
              <button onclick="cerrarModalApuntes()"
                      class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <i class="fas fa-times"></i>
              </button>
          </div>
          <div class="space-y-4">
              <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <i class="fas fa-pencil-alt mr-2"></i>Contenido del Apunte
                  </label>
                  <textarea id="texto-apunte"
                          class="w-full h-40 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                          placeholder="Escribe tu apunte aquí...">${apunte.texto}</textarea>
              </div>
              <div class="flex justify-end space-x-3">
                  <button onclick="actualizarApunte('${apunteId}').catch(err => console.error(err))"
                          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center">
                      <i class="fas fa-save mr-2"></i>
                      <span>Guardar Cambios</span>
                  </button>
                  <button onclick="cerrarModalApuntes()"
                          class="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors duration-200">
                      Cancelar
                  </button>
              </div>
          </div>
      </div>
    `

    modal.innerHTML = modalContent
    modal.classList.remove("hidden")
  } catch (error) {
    console.error("Error al cargar el apunte para editar:", error)
    showCustomAlert("Error al cargar el apunte para editar")
  }
}

async function actualizarApunte(apunteId) {
  const texto = document.getElementById("texto-apunte").value

  if (!texto.trim()) {
    showCustomAlert("Por favor, escribe algún contenido en el apunte.")
    return
  }

  try {
    // Actualizar solo el campo de texto manteniendo el resto de campos igual
    await db.collection("apuntes").doc(apunteId).update({
      texto: texto,
      // Actualizamos la fecha de modificación
      fechaModificacion: firebase.firestore.Timestamp.now(),
    })

    // Primero cerrar el modal
    cerrarModalApuntes()

    // Luego mostrar el mensaje de éxito
    showCustomAlert("Apunte actualizado exitosamente", "success")

    // Finalmente actualizar la vista
    await cargarApuntesRecientes()
    if (window.location.hash.startsWith("#horario")) {
      await cargarHorario()
    }
  } catch (error) {
    console.error("Error al actualizar el apunte:", error)
    showCustomAlert("Error al actualizar el apunte. Por favor, intenta de nuevo.")
    // No cerramos el modal si hay un error para que el usuario pueda intentar de nuevo
    return
  }
}

async function eliminarApunte(apunteId) {
  if (!apunteId) {
    console.error("ID de apunte no válido")
    return
  }

  // Crear el modal de confirmación
  const modalContainer = document.createElement("div")
  modalContainer.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
  modalContainer.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full transform transition-all">
      <div class="p-6">
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
          <i class="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          Confirmar eliminación
        </h3>
        <p class="text-gray-600 dark:text-gray-400 text-center mb-6">
          ¿Estás seguro de que quieres eliminar este apunte? Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-center space-x-3">
          <button id="btn-cancelar" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors duration-200">
            Cancelar
          </button>
          <button id="btn-eliminar" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(modalContainer)

  // Manejar la confirmación
  try {
    const confirmed = await new Promise((resolve) => {
      const btnCancelar = modalContainer.querySelector("#btn-cancelar")
      const btnEliminar = modalContainer.querySelector("#btn-eliminar")

      btnCancelar.addEventListener("click", () => {
        modalContainer.remove()
        resolve(false)
      })

      btnEliminar.addEventListener("click", () => {
        modalContainer.remove()
        resolve(true)
      })
    })

    if (!confirmed) return

    // Eliminar de Firestore
    await db.collection("apuntes").doc(apunteId).delete()

    // Limpiar caché
    Object.keys(cacheApuntes.paginas).forEach((pagina) => {
      cacheApuntes.paginas[pagina] = cacheApuntes.paginas[pagina].filter((apunte) => apunte.id !== apunteId)
    })

    // Recargar la página actual
    await cargarApuntesRecientes("inicial") // Cargar desde el principio para reordenar

    console.log("Apunte eliminado correctamente")
  } catch (error) {
    console.error("Error al eliminar el apunte:", error)
    alert("Error al eliminar el apunte. Por favor, intenta de nuevo.")
  }
}