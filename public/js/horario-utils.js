// Funciones de utilidad para exportar/importar horarios

function exportarHorario() {
    const horario = cargarHorario();
    const dataStr = JSON.stringify(horario);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'horario.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importarHorario() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const horario = JSON.parse(event.target.result);
                
                // Validar estructura del horario
                if (!horario.dias || !horario.horas || !horario.bloques) {
                    throw new Error('Formato de horario inválido');
                }
                
                // Guardar el horario importado
                guardarHorario(horario);
                
                // Recargar la vista
                cargarHorarioSemanal();
                
                showCustomAlert('Horario importado exitosamente');
            } catch (error) {
                console.error('Error al importar horario:', error);
                showCustomAlert('Error al importar el horario. Verifica que el archivo sea válido.');
            }
        };
        
        reader.onerror = () => {
            showCustomAlert('Error al leer el archivo');
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Botones de control para el horario
function generarBotonesControlHorario(esMobile = false) {
    if (esMobile) {
        return `
            <div class="flex justify-end space-x-2 mb-4 mt-2">
                <button onclick="exportarHorario()" 
                        class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-2 rounded-xl font-medium hover:opacity-90 transition-all duration-300 flex items-center justify-center w-10 h-10">
                    <i class="fas fa-download"></i>
                </button>
                
                <button onclick="importarHorario()" 
                        class="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-2 rounded-xl font-medium hover:opacity-90 transition-all duration-300 flex items-center justify-center w-10 h-10">
                    <i class="fas fa-upload"></i>
                </button>
            </div>
        `;
    }
    
    return `
        <div class="flex items-center space-x-2 mb-4">
            <div class="flex-1"></div>
            
            <button onclick="exportarHorario()" 
                    class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all duration-300 flex items-center space-x-2">
                <i class="fas fa-download"></i>
                <span>Exportar</span>
            </button>
            
            <button onclick="importarHorario()" 
                    class="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all duration-300 flex items-center space-x-2">
                <i class="fas fa-upload"></i>
                <span>Importar</span>
            </button>
        </div>
    `;
}
