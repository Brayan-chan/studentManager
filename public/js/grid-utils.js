// Utilidades para el cálculo de posiciones en el grid

function calcularPosicionBloque(horaInicio, horaFin, horario) {
    const inicioMinutos = convertirHoraAMinutos(horaInicio);
    const finMinutos = convertirHoraAMinutos(horaFin);
    const primeraHoraMinutos = convertirHoraAMinutos(horario.horas[0]);
    
    // Calculamos la posición inicial relativa a la primera hora del día
    const inicioRelativo = inicioMinutos - primeraHoraMinutos;
    const duracionMinutos = finMinutos - inicioMinutos;
    
    // Convertimos los minutos a unidades de grid (cada hora = 60px altura)
    const topPosition = (inicioRelativo / 60) * 60; // px desde el inicio
    const altura = (duracionMinutos / 60) * 60; // altura en px
    
    return {
        top: topPosition,
        height: altura
    };
}
