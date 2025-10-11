/**
 * reminder-toggle.js
 * Maneja la lógica de mostrar/ocultar dinámicamente los campos de recordatorios
 * en el modal de agregar apuntes
 */

function initReminderToggles() {
  // Obtener referencias a los elementos
  const checkboxRecordatorio = document.getElementById("recordatorio")
  const contenedorHoraRecordatorio = document.getElementById("contenedor-hora-recordatorio")
  const contenedorRecurrenciaRecordatorio = document.getElementById("contenedor-recurrencia-recordatorio")
  const checkboxRecurrente = document.getElementById("recurrente")
  const contenedorIntervaloRecordatorio = document.getElementById("contenedor-intervalo-recordatorio")
  const contenedorFormRecordatorio = document.getElementById("contenedor-form-recordatorio")

  // Verificar que todos los elementos existen
  if (
    !checkboxRecordatorio ||
    !contenedorHoraRecordatorio ||
    !contenedorRecurrenciaRecordatorio ||
    !checkboxRecurrente ||
    !contenedorIntervaloRecordatorio ||
    !contenedorFormRecordatorio
  ) {
    console.warn("[reminder-toggle] No se encontraron todos los elementos necesarios")
    return false
  }

  console.log("[reminder-toggle] Inicializando controles de recordatorios")

  checkboxRecordatorio.addEventListener("change", function () {
    console.log("[reminder-toggle] Checkbox recordatorio cambiado:", this.checked)

    if (this.checked) {
      // Mostrar el input de hora y el checkbox de recurrencia
      contenedorHoraRecordatorio.classList.remove("hidden")
      contenedorRecurrenciaRecordatorio.classList.remove("hidden")
    } else {
      // Ocultar todos los campos relacionados con recordatorios
      contenedorHoraRecordatorio.classList.add("hidden")
      contenedorRecurrenciaRecordatorio.classList.add("hidden")
      contenedorIntervaloRecordatorio.classList.add("hidden")
      contenedorFormRecordatorio.classList.add("hidden")

      // Desmarcar el checkbox de recurrente y limpiar valores
      checkboxRecurrente.checked = false
      document.getElementById("hora-recordatorio").value = ""
      document.getElementById("intervalo-cantidad").value = "1"
      document.getElementById("intervalo-tipo").value = "minutos"
    }
  })

  checkboxRecurrente.addEventListener("change", function () {
    console.log("[reminder-toggle] Checkbox recurrente cambiado:", this.checked)

    if (this.checked) {
      // Mostrar los campos de intervalo de recurrencia
      contenedorIntervaloRecordatorio.classList.remove("hidden")
      contenedorFormRecordatorio.classList.remove("hidden")
    } else {
      // Ocultar los campos de intervalo de recurrencia
      contenedorIntervaloRecordatorio.classList.add("hidden")
      contenedorFormRecordatorio.classList.add("hidden")

      // Resetear valores del formulario
      document.getElementById("intervalo-cantidad").value = "1"
      document.getElementById("intervalo-tipo").value = "minutos"
    }
  })

  console.log("[reminder-toggle] Event listeners configurados correctamente")
  return true
}

// Exponer función globalmente para que pueda ser llamada desde index.js
window.initReminderToggles = initReminderToggles