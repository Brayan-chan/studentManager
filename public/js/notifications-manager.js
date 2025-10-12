/**
 * notifications-manager.js
 * Maneja todas las notificaciones push de la aplicación
 * Gestiona permisos, envío de notificaciones y acciones del usuario
 */

class NotificationsManager {
  constructor() {
    this.permisosHabilitados = false
    this.notificacionesActivas = new Map() // Almacena referencias a notificaciones activas
    this.init()
  }

  /**
   * Inicializa el gestor de notificaciones
   */
  init() {
    console.log("[NotificationsManager] Inicializando...")

    // Verificar soporte del navegador
    if (!this.verificarSoporte()) {
      console.error("[NotificationsManager] El navegador no soporta notificaciones")
      return
    }

    // Verificar estado de permisos
    this.permisosHabilitados = Notification.permission === "granted"
    console.log(`[NotificationsManager] Estado de permisos: ${Notification.permission}`)
  }

  /**
   * Verifica si el navegador soporta notificaciones
   */
  verificarSoporte() {
    if (!("Notification" in window)) {
      console.error("❌ Este navegador NO soporta notificaciones web")
      return false
    }

    // Verificar Safari con HTTP
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isSafari && window.location.protocol !== "https:") {
      console.error("❌ Safari requiere HTTPS para las notificaciones web")
      return false
    }

    console.log("✅ El navegador soporta notificaciones")
    return true
  }

  /**
   * Solicita permisos para mostrar notificaciones
   */
  async solicitarPermisos() {
    if (!this.verificarSoporte()) {
      return false
    }

    console.log("[NotificationsManager] Solicitando permisos...")

    try {
      const permission = await Notification.requestPermission()
      console.log(`[NotificationsManager] Respuesta de permisos: ${permission}`)

      switch (permission) {
        case "granted":
          console.log("✅ Permisos concedidos")
          this.permisosHabilitados = true

          // Mostrar notificación de confirmación
          this.mostrarNotificacion({
            titulo: "¡Notificaciones activadas!",
            cuerpo: "Recibirás recordatorios de tus apuntes, tareas y exámenes.",
            icono: "/images/studentman_metua5.png",
            tag: "permisos-concedidos",
          })

          return true

        case "denied":
          console.log("❌ Permisos denegados")
          this.permisosHabilitados = false
          return false

        case "default":
          console.log("⚠️ Permisos no definidos")
          this.permisosHabilitados = false
          return false

        default:
          return false
      }
    } catch (error) {
      console.error("[NotificationsManager] Error al solicitar permisos:", error)
      return false
    }
  }

  /**
   * Muestra una notificación
   * @param {Object} opciones - Opciones de la notificación
   * @param {string} opciones.titulo - Título de la notificación
   * @param {string} opciones.cuerpo - Cuerpo de la notificación
   * @param {string} opciones.icono - URL del icono
   * @param {string} opciones.tag - Tag único para la notificación
   * @param {Object} opciones.data - Datos adicionales
   * @param {Function} opciones.onClick - Callback al hacer click
   * @param {Function} opciones.onClose - Callback al cerrar
   */
  mostrarNotificacion(opciones) {
    if (!this.permisosHabilitados) {
      console.warn("[NotificationsManager] No se pueden mostrar notificaciones sin permisos")
      return null
    }

    const {
      titulo,
      cuerpo,
      icono = "/images/studentman_metua5.png",
      tag = `notif-${Date.now()}`,
      data = {},
      onClick = null,
      onClose = null,
    } = opciones

    try {
      const notificacion = new Notification(titulo, {
        body: cuerpo,
        icon: icono,
        tag: tag,
        data: data,
        requireInteraction: false, // La notificación se cierra automáticamente
        silent: false,
      })

      // Almacenar referencia
      this.notificacionesActivas.set(tag, notificacion)

      // Evento: cuando se muestra la notificación
      notificacion.onshow = () => {
        console.log(`[NotificationsManager] Notificación mostrada: ${tag}`)
      }

      // Evento: cuando el usuario hace click
      notificacion.onclick = (event) => {
        console.log(`[NotificationsManager] Click en notificación: ${tag}`)

        // Enfocar la ventana
        window.focus()

        // Ejecutar callback personalizado si existe
        if (onClick && typeof onClick === "function") {
          onClick(event, data)
        }

        // Cerrar la notificación
        notificacion.close()
      }

      // Evento: cuando se cierra la notificación
      notificacion.onclose = () => {
        console.log(`[NotificationsManager] Notificación cerrada: ${tag}`)

        // Eliminar de notificaciones activas
        this.notificacionesActivas.delete(tag)

        // Ejecutar callback personalizado si existe
        if (onClose && typeof onClose === "function") {
          onClose(data)
        }
      }

      // Evento: cuando hay un error
      notificacion.onerror = (error) => {
        console.error(`[NotificationsManager] Error en notificación ${tag}:`, error)
        this.notificacionesActivas.delete(tag)
      }

      console.log(`[NotificationsManager] Notificación creada: ${tag}`)
      return notificacion
    } catch (error) {
      console.error("[NotificationsManager] Error al crear notificación:", error)
      return null
    }
  }

  /**
   * Muestra una notificación de recordatorio de apunte
   * @param {Object} apunte - Datos del apunte
   */
  mostrarRecordatorioApunte(apunte) {
    const tipoIconos = {
      apunte: "📝",
      tarea: "📋",
      examen: "📚",
      estudiar: "🎓",
    }

    const tipoTextos = {
      apunte: "Revisar apunte",
      tarea: "Hacer tarea",
      examen: "Estudiar para examen",
      estudiar: "Tiempo de estudiar",
    }

    const tipo = apunte.tipo || "apunte"
    const icono = tipoIconos[tipo] || "📝"
    const accion = tipoTextos[tipo] || "Revisar apunte"

    const titulo = `${icono} ${accion}: ${apunte.materia.nombre}`
    const cuerpo = apunte.texto
      ? apunte.texto.substring(0, 100)
      : `${apunte.materia.codigo} - ${apunte.materia.profesor}`

    return this.mostrarNotificacion({
      titulo: titulo,
      cuerpo: cuerpo,
      tag: `recordatorio-${apunte.id || Date.now()}`,
      data: {
        tipo: "recordatorio",
        apunteId: apunte.id,
        tipoApunte: tipo,
        materia: apunte.materia,
      },
      onClick: (event, data) => {
        console.log("[NotificationsManager] Usuario hizo click en recordatorio:", data)
        // Aquí podrías redirigir a la página del apunte o abrir un modal
        // Por ejemplo: window.location.href = `#apunte-${data.apunteId}`
      },
      onClose: (data) => {
        console.log("[NotificationsManager] Usuario cerró/ignoró recordatorio:", data)
        // Aquí podrías registrar que el usuario ignoró el recordatorio
      },
    })
  }

  /**
   * Cierra una notificación específica
   * @param {string} tag - Tag de la notificación
   */
  cerrarNotificacion(tag) {
    const notificacion = this.notificacionesActivas.get(tag)
    if (notificacion) {
      notificacion.close()
      this.notificacionesActivas.delete(tag)
      console.log(`[NotificationsManager] Notificación cerrada manualmente: ${tag}`)
    }
  }

  /**
   * Cierra todas las notificaciones activas
   */
  cerrarTodasLasNotificaciones() {
    console.log("[NotificationsManager] Cerrando todas las notificaciones...")
    this.notificacionesActivas.forEach((notificacion, tag) => {
      notificacion.close()
    })
    this.notificacionesActivas.clear()
  }

  /**
   * Obtiene el estado actual de los permisos
   */
  obtenerEstadoPermisos() {
    return {
      soportado: this.verificarSoporte(),
      permiso: Notification.permission,
      habilitado: this.permisosHabilitados,
    }
  }
}

// Crear instancia global
window.notificationsManager = new NotificationsManager()

// Exponer para uso en otros archivos
console.log("[NotificationsManager] Gestor de notificaciones inicializado y disponible globalmente")
