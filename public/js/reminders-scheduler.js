/**
 * reminders-scheduler.js
 * Programa y gestiona recordatorios únicos y recurrentes
 * Integra con Firebase Firestore y NotificationsManager
 */

// Firebase ya está disponible globalmente desde window.firebase
class RemindersScheduler {
  constructor() {
    this.recordatoriosActivos = new Map() // Map<recordatorioId, { timeoutId, intervalId, data }>
    this.db = window.firebase.firestore()
    this.init()
  }

  /**
   * Inicializa el programador de recordatorios
   */
  async init() {
    console.log("[RemindersScheduler] Inicializando...")

    // Cargar recordatorios pendientes desde Firebase
    await this.cargarRecordatoriosPendientes()

    console.log("[RemindersScheduler] Inicializado correctamente")
  }

  /**
   * Carga recordatorios pendientes desde Firebase y los programa
   */
  async cargarRecordatoriosPendientes() {
    try {
      console.log("[RemindersScheduler] Cargando recordatorios pendientes...")

      const ahora = new Date()
      
      // Verificar que haya un usuario autenticado
      const auth = firebase.auth();
      const user = auth.currentUser;
      
      if (!user) {
        console.log("[RemindersScheduler] No hay usuario autenticado, no se cargarán recordatorios")
        return
      }

      // Obtener apuntes con recordatorios activos del usuario actual
      const snapshot = await this.db
        .collection("apuntes")
        .where("userId", "==", user.uid)
        .where("recordatorio.activo", "==", true)
        .get()

      let recordatoriosCargados = 0

      snapshot.forEach((doc) => {
        const apunte = { id: doc.id, ...doc.data() }
        const recordatorio = apunte.recordatorio

        // Verificar si el recordatorio aún es válido
        if (recordatorio && recordatorio.fechaHora) {
          const fechaRecordatorio = recordatorio.fechaHora.toDate()

          // Si es recurrente o si la fecha aún no ha pasado
          if (recordatorio.recurrente || fechaRecordatorio > ahora) {
            this.programarRecordatorio(apunte)
            recordatoriosCargados++
          }
        }
      })

      console.log(`[RemindersScheduler] ${recordatoriosCargados} recordatorios cargados y programados`)
    } catch (error) {
      console.error("[RemindersScheduler] Error al cargar recordatorios:", error)
    }
  }

  /**
   * Programa un recordatorio para un apunte
   * @param {Object} apunte - Datos del apunte con información de recordatorio
   */
  programarRecordatorio(apunte) {
    if (!apunte.recordatorio || !apunte.recordatorio.activo) {
      console.warn("[RemindersScheduler] El apunte no tiene recordatorio activo")
      return
    }

    const recordatorio = apunte.recordatorio
    const recordatorioId = apunte.id

    // Si ya existe un recordatorio activo para este apunte, cancelarlo primero
    if (this.recordatoriosActivos.has(recordatorioId)) {
      this.cancelarRecordatorio(recordatorioId)
    }

    // Calcular tiempo hasta el recordatorio
    const ahora = new Date()
    const fechaRecordatorio = recordatorio.fechaHora.toDate()
    const tiempoHasta = fechaRecordatorio.getTime() - ahora.getTime()

    console.log(`[RemindersScheduler] Programando recordatorio para apunte ${recordatorioId}`)
    console.log(`[RemindersScheduler] Fecha/Hora: ${fechaRecordatorio.toLocaleString()}`)
    console.log(`[RemindersScheduler] Tiempo hasta recordatorio: ${Math.round(tiempoHasta / 1000)} segundos`)

    if (tiempoHasta <= 0 && !recordatorio.recurrente) {
      console.warn("[RemindersScheduler] El recordatorio ya pasó y no es recurrente")
      return
    }

    // Programar recordatorio único o el primero de los recurrentes
    const timeoutId = setTimeout(
      () => {
        this.ejecutarRecordatorio(apunte)
      },
      tiempoHasta > 0 ? tiempoHasta : 0,
    )

    // Si es recurrente, programar el intervalo
    let intervalId = null
    if (recordatorio.recurrente && recordatorio.intervalo) {
      const intervaloMs = this.calcularIntervaloMs(recordatorio.intervalo)

      console.log(`[RemindersScheduler] Recordatorio recurrente cada ${intervaloMs / 1000} segundos`)

      // Programar intervalo después del primer recordatorio
      setTimeout(
        () => {
          intervalId = setInterval(() => {
            this.ejecutarRecordatorio(apunte)
          }, intervaloMs)

          // Actualizar el intervalId en el Map
          const recordatorioData = this.recordatoriosActivos.get(recordatorioId)
          if (recordatorioData) {
            recordatorioData.intervalId = intervalId
          }
        },
        tiempoHasta > 0 ? tiempoHasta : 0,
      )
    }

    // Almacenar referencia
    this.recordatoriosActivos.set(recordatorioId, {
      timeoutId,
      intervalId,
      data: apunte,
    })

    console.log(`[RemindersScheduler] Recordatorio programado: ${recordatorioId}`)
  }

  /**
   * Ejecuta un recordatorio (muestra la notificación)
   * @param {Object} apunte - Datos del apunte
   */
  ejecutarRecordatorio(apunte) {
    console.log(`[RemindersScheduler] Ejecutando recordatorio para apunte ${apunte.id}`)

    // Verificar que el gestor de notificaciones esté disponible
    if (!window.notificationsManager) {
      console.error("[RemindersScheduler] NotificationsManager no está disponible")
      return
    }

    // Mostrar notificación
    window.notificationsManager.mostrarRecordatorioApunte(apunte)

    // Si no es recurrente, eliminar de recordatorios activos
    if (!apunte.recordatorio.recurrente) {
      this.recordatoriosActivos.delete(apunte.id)
      console.log(`[RemindersScheduler] Recordatorio único completado: ${apunte.id}`)
    }
  }

  /**
   * Cancela un recordatorio activo
   * @param {string} recordatorioId - ID del recordatorio (ID del apunte)
   */
  cancelarRecordatorio(recordatorioId) {
    const recordatorio = this.recordatoriosActivos.get(recordatorioId)

    if (!recordatorio) {
      console.warn(`[RemindersScheduler] No se encontró recordatorio activo: ${recordatorioId}`)
      return
    }

    // Cancelar timeout
    if (recordatorio.timeoutId) {
      clearTimeout(recordatorio.timeoutId)
    }

    // Cancelar interval si existe
    if (recordatorio.intervalId) {
      clearInterval(recordatorio.intervalId)
    }

    // Eliminar de recordatorios activos
    this.recordatoriosActivos.delete(recordatorioId)

    console.log(`[RemindersScheduler] Recordatorio cancelado: ${recordatorioId}`)
  }

  /**
   * Cancela todos los recordatorios activos
   */
  cancelarTodosLosRecordatorios() {
    console.log("[RemindersScheduler] Cancelando todos los recordatorios...")

    this.recordatoriosActivos.forEach((recordatorio, id) => {
      if (recordatorio.timeoutId) {
        clearTimeout(recordatorio.timeoutId)
      }
      if (recordatorio.intervalId) {
        clearInterval(recordatorio.intervalId)
      }
    })

    this.recordatoriosActivos.clear()
    console.log("[RemindersScheduler] Todos los recordatorios cancelados")
  }

  /**
   * Calcula el intervalo en milisegundos según la configuración
   * @param {Object} intervalo - Configuración del intervalo
   * @returns {number} Intervalo en milisegundos
   */
  calcularIntervaloMs(intervalo) {
    const { cantidad, tipo } = intervalo

    const multiplicadores = {
      segundos: 1000,
      minutos: 60 * 1000,
      horas: 60 * 60 * 1000,
      dias: 24 * 60 * 60 * 1000,
    }

    const multiplicador = multiplicadores[tipo] || multiplicadores.minutos
    return cantidad * multiplicador
  }

  /**
   * Crea un objeto de recordatorio para guardar en Firebase
   * @param {Object} opciones - Opciones del recordatorio
   * @returns {Object} Objeto de recordatorio
   */
  crearRecordatorio(opciones) {
    const { fechaHora, recurrente = false, intervalo = null } = opciones

    return {
      activo: true,
      fechaHora: window.firebase.firestore.Timestamp.fromDate(fechaHora),
      recurrente: recurrente,
      intervalo: intervalo
        ? {
            cantidad: intervalo.cantidad,
            tipo: intervalo.tipo,
          }
        : null,
      creadoEn: window.firebase.firestore.Timestamp.now(),
    }
  }

  /**
   * Obtiene información de recordatorios activos
   */
  obtenerRecordatoriosActivos() {
    const recordatorios = []

    this.recordatoriosActivos.forEach((recordatorio, id) => {
      recordatorios.push({
        id: id,
        apunte: recordatorio.data,
        recurrente: recordatorio.data.recordatorio?.recurrente || false,
      })
    })

    return recordatorios
  }
}

// Crear instancia global
window.remindersScheduler = new RemindersScheduler()

// Exponer para uso en otros archivos
console.log("[RemindersScheduler] Programador de recordatorios inicializado y disponible globalmente")
