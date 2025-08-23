// Detectar modo oscuro
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB-5z-xwAmReLjNGPdnwB2Ff7jjtCk9_aQ",
    authDomain: "studentman-13c8f.firebaseapp.com",
    projectId: "studentman-13c8f",
    storageBucket: "studentman-13c8f.firebasestorage.app",
    messagingSenderId: "380344615554",
    appId: "1:380344615554:web:a7c15289f49c49e7ff2a9b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variables globales para almacenar la configuración
let awsConfig = {};
let cloudinaryConfig = {};

// Función para cargar la configuración desde el backend
async function cargarConfiguracion() {
    try {
        const baseUrl = window.location.origin;
        console.log('Intentando cargar configuración desde:', `${baseUrl}/api/config`);

        const response = await fetch(`${baseUrl}/api/config`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error en la respuesta:', errorText);
            throw new Error('Error al obtener la configuración del servidor');
        }

        const config = await response.json();
        console.log('Configuración recibida:', {
            hasAwsRegion: !!config.aws?.region,
            hasCloudinaryConfig: !!config.cloudinary,
            cloudinaryCloudName: config.cloudinary?.cloudName,
            hasUploadPreset: !!config.cloudinary?.uploadPreset
        });

        // Configuración de AWS S3
        AWS.config.update({
            region: config.aws.region
        });

        // Guardar la configuración de Cloudinary
        cloudinaryConfig = config.cloudinary;

        // Configuración de Cloudinary
        cloudinaryConfig = {
            cloudName: config.cloudinary.cloudName,
            uploadPreset: config.cloudinary.uploadPreset
        };

        console.log('Configuración cargada exitosamente');
        return true;
    } catch (error) {
        console.error('Error al cargar la configuración:', error);
        showCustomAlert('Error al cargar la configuración. Algunas funciones pueden no estar disponibles.');
        return false;
    }
}

// Cargar la configuración al iniciar la aplicación
cargarConfiguracion();

// Variables globales
let editandoHorario = false;
let fotoUrl = null;
let mediaRecorder;
let audioChunks = [];
let audioUrl = null;
let audioBlob = null;

// Estructura del horario por defecto
const horarioDefault = {
    dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    horas: ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
    materias: {},
    materiasInfo: {}
};

// Función para mostrar alertas personalizadas
function showCustomAlert(message) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
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
            `;
    document.body.appendChild(modal);
}

// Función para mostrar confirmaciones personalizadas
function showCustomConfirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
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
            `;
    document.body.appendChild(modal);
}

// Funciones de gestión del horario
function guardarHorario(horario) {
    localStorage.setItem('horarioAcademico', JSON.stringify(horario));
}

function cargarHorario() {
    const horarioGuardado = localStorage.getItem('horarioAcademico');
    return horarioGuardado ? JSON.parse(horarioGuardado) : horarioDefault;
}

function generarColorMateria(codigo) {
    const colores = [
        'bg-gradient-to-br from-pink-400 to-pink-600',
        'bg-gradient-to-br from-purple-400 to-purple-600',
        'bg-gradient-to-br from-blue-400 to-blue-600',
        'bg-gradient-to-br from-green-400 to-green-600',
        'bg-gradient-to-br from-yellow-400 to-yellow-600',
        'bg-gradient-to-br from-red-400 to-red-600',
        'bg-gradient-to-br from-indigo-400 to-indigo-600',
        'bg-gradient-to-br from-teal-400 to-teal-600',
        'bg-gradient-to-br from-orange-400 to-orange-600',
        'bg-gradient-to-br from-cyan-400 to-cyan-600'
    ];
    return colores[parseInt(codigo) % colores.length];
}

function cargarHorarioSemanal() {
    const horario = cargarHorario();
    const horarioElement = document.getElementById('horario-semanal');

    // Vista de escritorio (tabla)
    let vistaEscritorio = `
                <div class="hidden lg:block overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th class="p-4 text-left font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">Hora</th>
                                ${horario.dias.map(dia => `<th class="p-4 text-center font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]">${dia}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;

    horario.horas.forEach((hora, index) => {
        vistaEscritorio += `
                    <tr class="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td class="p-4 font-medium text-gray-600 dark:text-gray-400">${hora}</td>
                        ${horario.dias.map(dia => {
            const materiaInfo = horario.materias[`${dia}-${hora}`] || {};

            if (materiaInfo.codigo) {
                return `
                                <td class="p-2">
                                    <div class="${generarColorMateria(materiaInfo.codigo)} text-white rounded-xl p-3 cursor-pointer card-hover shadow-lg"
                                         data-dia="${dia}" 
                                         data-hora="${hora}"
                                         onclick="manejarClickCelda(this)">
                                        <div class="font-bold text-sm">${materiaInfo.codigo}</div>
                                        <div class="text-xs opacity-90">${materiaInfo.nombre || ''}</div>
                                        <div class="text-xs opacity-75 mt-1">
                                            <i class="fas fa-user mr-1"></i>${materiaInfo.profesor || ''}
                                        </div>
                                    </div>
                                </td>
                            `;
            } else {
                return `
                                <td class="p-2">
                                    <div class="h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                                         data-dia="${dia}" 
                                         data-hora="${hora}"
                                         onclick="manejarClickCelda(this)">
                                        <i class="fas fa-plus text-gray-400 group-hover:text-primary text-lg"></i>
                                    </div>
                                </td>
                            `;
            }
        }).join('')}
                    </tr>
                `;
    });

    vistaEscritorio += `
                        </tbody>
                    </table>
                </div>
            `;

    // Vista móvil (tarjetas por día)
    let vistMovil = `
                <div class="lg:hidden">
                    <!-- Selector de día -->
                    <div class="flex space-x-2 mb-4 overflow-x-auto pb-2">
                        ${horario.dias.map((dia, index) => `
                            <button onclick="cambiarDiaMobile('${dia}')" 
                                    class="dia-btn flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${index === 0 ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
                                    data-dia="${dia}">
                                ${dia}
                            </button>
                        `).join('')}
                    </div>
                    
                    <!-- Contenido por día -->
                    ${horario.dias.map((dia, diaIndex) => {
        const materiasDia = horario.horas.map(hora => ({
            hora,
            materia: horario.materias[`${dia}-${hora}`] || null
        })).filter(item => item.materia || editandoHorario);

        return `
                        <div id="dia-content-${dia}" class="dia-content ${diaIndex === 0 ? 'block' : 'hidden'} space-y-3">
                            ${materiasDia.length === 0 ? `
                                <div class="text-center py-8">
                                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i class="fas fa-calendar-plus text-gray-400 text-2xl"></i>
                                    </div>
                                    <p class="text-gray-500 dark:text-gray-400 mb-4">No hay clases programadas para ${dia}</p>
                                    <button onclick="mostrarHorasDisponibles('${dia}')" 
                                            class="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-xl font-medium">
                                        <i class="fas fa-plus mr-2"></i>Agregar Clase
                                    </button>
                                </div>
                            ` : materiasDia.map(({ hora, materia }) => {
            if (materia) {
                return `
                                    <div class="${generarColorMateria(materia.codigo)} text-white rounded-xl p-4 card-hover shadow-lg"
                                         data-dia="${dia}" 
                                         data-hora="${hora}"
                                         onclick="manejarClickCelda(this)">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="text-sm opacity-90">${hora}</span>
                                            <i class="fas fa-chevron-right opacity-75"></i>
                                        </div>
                                        <div class="font-bold text-lg mb-1">${materia.codigo}</div>
                                        <div class="text-sm opacity-90 mb-2">${materia.nombre}</div>
                                        <div class="flex items-center text-xs opacity-75">
                                            <i class="fas fa-user mr-2"></i>
                                            ${materia.profesor}
                                        </div>
                                    </div>
                                `;
            } else if (editandoHorario) {
                return `
                                    <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-200"
                                         data-dia="${dia}" 
                                         data-hora="${hora}"
                                         onclick="manejarClickCelda(this)">
                                        <div class="text-gray-500 dark:text-gray-400 mb-2">${hora}</div>
                                        <i class="fas fa-plus text-gray-400 text-xl"></i>
                                        <div class="text-sm text-gray-500 dark:text-gray-400 mt-2">Agregar materia</div>
                                    </div>
                                `;
            }
            return '';
        }).join('')}
                        </div>
                    `;
    }).join('')}
                </div>
            `;

    horarioElement.innerHTML = vistaEscritorio + vistMovil;
}

function cambiarDiaMobile(diaSeleccionado) {
    // Actualizar botones
    document.querySelectorAll('.dia-btn').forEach(btn => {
        const dia = btn.dataset.dia;
        if (dia === diaSeleccionado) {
            btn.className = 'dia-btn flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-primary to-secondary text-white';
        } else {
            btn.className = 'dia-btn flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
        }
    });

    // Mostrar contenido del día seleccionado
    document.querySelectorAll('.dia-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`dia-content-${diaSeleccionado}`).classList.remove('hidden');
}

function mostrarHorasDisponibles(dia) {
    const modal = document.getElementById('modal-apuntes');
    const horario = cargarHorario();

    modal.classList.remove('hidden');
    modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-clock text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">Seleccionar Hora</h2>
                                <p class="opacity-90">${dia}</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                            ${horario.horas.map(hora => {
        const materiaExistente = horario.materias[`${dia}-${hora}`];
        return `
                                    <button onclick="abrirModalAgregarEditarMateria('${dia}', '${hora}', ${materiaExistente ? 'true' : 'null'})" 
                                            class="${materiaExistente ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary'} text-white py-3 px-4 rounded-xl font-medium transition-all duration-300 ${materiaExistente ? '' : 'shadow-lg hover:shadow-xl'}"
                                            ${materiaExistente ? 'disabled' : ''}>
                                        ${hora}
                                        ${materiaExistente ? '<br><span class="text-xs opacity-75">Ocupado</span>' : ''}
                                    </button>
                                `;
    }).join('')}
                        </div>
                        <button onclick="cerrarModalApuntes()" 
                                class="w-full mt-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300">
                            Cancelar
                        </button>
                    </div>
                </div>
            `;
}

function manejarClickCelda(celda) {
    const dia = celda.dataset.dia;
    const hora = celda.dataset.hora;
    const horario = cargarHorario();
    const materiaExistente = horario.materias[`${dia}-${hora}`];

    if (editandoHorario || !materiaExistente) {
        abrirModalAgregarEditarMateria(dia, hora, materiaExistente);
    } else {
        abrirModalApuntes(dia, hora, materiaExistente);
    }
}

function abrirModalAgregarEditarMateria(dia, hora, materiaExistente = null) {
    const modal = document.getElementById('modal-apuntes');
    modal.classList.remove('hidden');
    modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-primary to-secondary p-6 text-white">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-${materiaExistente ? 'edit' : 'plus'} text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">${materiaExistente ? 'Editar' : 'Agregar'} Materia</h2>
                                <p class="opacity-90">${dia} - ${hora}</p>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-code mr-2"></i>Código de la Materia
                            </label>
                            <input type="text" 
                                   id="codigo-materia" 
                                   class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                                   placeholder="Ej: 2569" 
                                   value="${materiaExistente ? materiaExistente.codigo : ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-book mr-2"></i>Nombre de la Materia
                            </label>
                            <input type="text" 
                                   id="nombre-materia" 
                                   class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                                   placeholder="Ej: Física III" 
                                   value="${materiaExistente ? materiaExistente.nombre : ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <i class="fas fa-user mr-2"></i>Profesor
                            </label>
                            <input type="text" 
                                   id="profesor-materia" 
                                   class="w-full p-4 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                                   placeholder="Nombre del profesor" 
                                   value="${materiaExistente ? materiaExistente.profesor : ''}">
                        </div>
                        <div class="flex space-x-3 pt-4">
                            <button onclick="guardarMateria('${dia}', '${hora}')" 
                                    class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2">
                                <i class="fas fa-save"></i>
                                <span>Guardar</span>
                            </button>
                            ${materiaExistente ? `
                                <button onclick="eliminarMateria('${dia}', '${hora}')" 
                                        class="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                            <button onclick="cerrarModalApuntes()" 
                                    class="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-300">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
}

function guardarMateria(dia, hora) {
    const codigo = document.getElementById('codigo-materia').value;
    const nombre = document.getElementById('nombre-materia').value;
    const profesor = document.getElementById('profesor-materia').value;

    if (!codigo || !nombre) {
        showCustomAlert('Por favor, completa al menos el código y nombre de la materia.');
        return;
    }

    const horario = cargarHorario();
    horario.materias[`${dia}-${hora}`] = { codigo, nombre, profesor };
    horario.materiasInfo[codigo] = { nombre, profesor };

    guardarHorario(horario);
    cerrarModalApuntes();
    cargarHorarioSemanal();
}

function eliminarMateria(dia, hora) {
    showCustomConfirm('¿Estás seguro de que quieres eliminar esta materia?', () => {
        const horario = cargarHorario();
        delete horario.materias[`${dia}-${hora}`];
        guardarHorario(horario);
        cerrarModalApuntes();
        cargarHorarioSemanal();
    });
}

function toggleEditarHorario() {
    editandoHorario = !editandoHorario;
    const botonEditar = document.getElementById('editar-horario');
    const icon = botonEditar.querySelector('i');
    const span = botonEditar.querySelector('span');

    if (editandoHorario) {
        icon.className = 'fas fa-check';
        span.textContent = 'Finalizar Edición';
        botonEditar.className = 'bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2';
    } else {
        icon.className = 'fas fa-edit';
        span.textContent = 'Editar Horario';
        botonEditar.className = 'bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2';
    }
    cargarHorarioSemanal();
}

function abrirModalApuntes(dia, hora, materiaInfo) {
    const modal = document.getElementById('modal-apuntes');
    modal.classList.remove('hidden');
    modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-sticky-note text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">Registrar Apunte</h2>
                                <p class="opacity-90">${materiaInfo.nombre}</p>
                                <p class="text-sm opacity-75">${dia} - ${hora} | Prof. ${materiaInfo.profesor}</p>
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
                        <div class="grid grid-cols-2 gap-3">
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
                        </div>
                        <div id="multimedia-preview" class="space-y-3"></div>
                        <div class="flex space-x-3 pt-4">
                            <button onclick="guardarApunte('${dia}', '${hora}', '${materiaInfo.codigo}')" 
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
            `;

    document.getElementById('subir-foto').addEventListener('click', subirFoto);
    document.getElementById('grabar-audio').addEventListener('click', grabarAudio);
}

function cerrarModalApuntes() {
    document.getElementById('modal-apuntes').classList.add('hidden');
    // Resetear variables globales
    fotoUrl = null;
    audioUrl = null;
    audioChunks = [];
}

// Funciones para multimedia
async function subirFoto() {
    if (!cloudinaryConfig.cloudName) {
        console.error('La configuración de Cloudinary no está lista', cloudinaryConfig);
        showCustomAlert('Error: La configuración de carga de imágenes no está lista. Por favor, intenta de nuevo en unos segundos.');
        return;
    }

    try {
        // Obtener la firma del servidor
        const baseUrl = window.location.origin;
        const signatureResponse = await fetch(`${baseUrl}/api/generate-signature`, {
            method: 'POST'
        });

        if (!signatureResponse.ok) {
            throw new Error('Error al obtener la firma de subida');
        }

        const { signature, timestamp, apiKey, cloudName, folder } = await signatureResponse.json();

        // Crear el widget con la firma
        const myWidget = cloudinary.createUploadWidget({
            cloudName: cloudName,
            apiKey: apiKey,
            uploadPreset: cloudinaryConfig.uploadPreset,
            folder: folder,
            sources: ['local', 'camera'],
            multiple: false,
            maxFiles: 1,
            maxFileSize: 5000000, // 5MB
            resourceType: 'image',
            clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
            showAdvancedOptions: false,
            cropping: true,
            croppingAspectRatio: 1.0,
            language: 'es',
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
                    sourceBg: "#E4EBF1"
                }
            }
        }, (error, result) => {
            console.log('Cloudinary widget callback:', { error, result, event: result?.event });

            if (!error && result && result.event === "success") {
                console.log('Imagen subida con éxito:', result.info.secure_url);
                fotoUrl = result.info.secure_url;
                const previewContainer = document.getElementById('multimedia-preview');
                previewContainer.innerHTML += `
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                                <div class="flex items-center space-x-2 mb-2">
                                    <i class="fas fa-image text-blue-500"></i>
                                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Imagen adjuntada</span>
                                </div>
                                <img src="${fotoUrl}" alt="Imagen subida" class="w-full h-32 object-cover rounded-lg">
                            </div>
                        `;
            } else if (error) {
                console.error('Error al subir la imagen:', error);
                showCustomAlert('Error al subir la imagen: ' + (error.message || JSON.stringify(error)));
            } else if (result) {
                console.log('Evento del widget:', result.event);
            }
        });
        myWidget.open();
    } catch (error) {
        console.error('Error al crear el widget de Cloudinary:', error);
        showCustomAlert('Error al preparar la subida de imágenes: ' + error.message);
    }
}

async function subirAudio(blob) {
    try {
        console.log('Iniciando proceso de subida de audio...');

        // Obtener URL firmada del servidor
        const urlResponse = await fetch('/api/get-signed-url', {
            method: 'POST'
        });

        if (!urlResponse.ok) {
            throw new Error('Error al obtener la URL de subida');
        }

        const { signedUrl, fileName, bucketName } = await urlResponse.json();

        // Subir el archivo usando la URL firmada
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: blob,
            headers: {
                'Content-Type': 'audio/webm'
            }
        });

        if (!uploadResponse.ok) {
            throw new Error('Error al subir el archivo');
        }

        // Construir la URL pública del archivo
        const region = AWS.config.region || 'us-east-2'; // Usar región por defecto si no está definida
        const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
        console.log('Audio subido con éxito:', fileUrl);
        return fileUrl;

    } catch (error) {
        console.error('Error al subir el audio:', error);
        showCustomAlert('Error al subir el audio: ' + error.message);
        return null;
    }
}

function grabarAudio() {
    const button = document.getElementById('grabar-audio');
    const icon = button.querySelector('i');
    const span = button.querySelector('span');

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        icon.className = 'fas fa-microphone';
        span.textContent = 'Audio';
        button.className = 'bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2';
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            icon.className = 'fas fa-stop';
            span.textContent = 'Detener';
            button.className = 'bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center space-x-2';

            audioChunks = [];
            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                audioUrl = await subirAudio(blob);
                if (audioUrl) {
                    const previewContainer = document.getElementById('multimedia-preview');
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
                            `;
                }
            });
        })
        .catch(error => console.error('Error al grabar audio:', error));
}

async function guardarApunte(dia, hora, codigoMateria) {
    const texto = document.getElementById('texto-apunte').value;
    const horario = cargarHorario();
    const materiaInfo = horario.materiasInfo[codigoMateria];

    if (!texto) {
        showCustomAlert('Por favor, escribe algún contenido en el apunte.');
        return;
    }

    const apunte = {
        texto,
        materia: {
            codigo: codigoMateria,
            nombre: materiaInfo.nombre,
            profesor: materiaInfo.profesor
        },
        dia,
        hora,
        fecha: new Date(),
        fotoUrl: fotoUrl || null,
        audioUrl: audioUrl || null
    };

    try {
        await db.collection('apuntes').add(apunte);
        cerrarModalApuntes();
        cargarApuntesRecientes();
    } catch (error) {
        console.error('Error al guardar el apunte:', error);
        showCustomAlert('Error al guardar el apunte. Por favor, intenta de nuevo.');
    }
}

function buscarApuntes() {
    const busqueda = document.getElementById('busqueda-input').value.toLowerCase();
    const resultadosDiv = document.getElementById('resultados-busqueda');

    // Limpiar resultados si no hay búsqueda
    if (!busqueda) {
        resultadosDiv.innerHTML = '';
        return;
    }

    // Obtener apuntes de la base de datos
    db.collection('apuntes').get().then((querySnapshot) => {
        const apuntesUnicos = new Map();

        // Filtrar apuntes según la búsqueda
        querySnapshot.forEach((doc) => {
            const apunte = doc.data();
            const apunteId = doc.id;

            if (
                apunte.texto.toLowerCase().includes(busqueda) ||
                apunte.materia.nombre.toLowerCase().includes(busqueda) ||
                apunte.materia.codigo.toLowerCase().includes(busqueda)
            ) {
                apuntesUnicos.set(apunteId, apunte);
            }
        });

        // Generar HTML de resultados
        let resultadosHTML = '';
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
                    `;
            apuntesUnicos.forEach((apunte) => {
                resultadosHTML += `
                            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 card-hover">
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 class="font-bold text-gray-800 dark:text-white">${apunte.materia.nombre}</h4>
                                        <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            <span><i class="fas fa-tag mr-1"></i>${apunte.materia.codigo}</span>
                                            <span><i class="fas fa-user mr-1"></i>${apunte.materia.profesor}</span>
                                            <span><i class="fas fa-calendar mr-1"></i>${apunte.dia} - ${apunte.hora}</span>
                                        </div>
                                    </div>
                                    <span class="text-xs text-gray-500 dark:text-gray-400">${apunte.fecha.toDate().toLocaleDateString()}</span>
                                </div>
                                <p class="text-gray-700 dark:text-gray-300 mb-3">${apunte.texto}</p>
                                ${apunte.fotoUrl ? `
                                    <div class="mb-3">
                                        <a href="${apunte.fotoUrl}" data-fancybox data-caption="${apunte.materia.nombre} - ${apunte.dia} ${apunte.hora}">
                                            <img src="${apunte.fotoUrl}" alt="Foto del apunte" class="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
                                        </a>
                                    </div>
                                ` : ''}
                                ${apunte.audioUrl ? `
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
                                ` : ''}
                            </div>
                        `;
            });
            resultadosHTML += `
                            </div>
                        </div>
                    `;
        } else {
            resultadosHTML = `
                        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center mb-8">
                            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-search text-gray-400 text-2xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No se encontraron resultados</h3>
                            <p class="text-gray-500 dark:text-gray-400">Intenta con otros términos de búsqueda</p>
                        </div>
                    `;
        }

        // Mostrar resultados en la interfaz
        resultadosDiv.innerHTML = resultadosHTML;

        // Reiniciar Fancybox si es necesario
        if (typeof lightbox !== 'undefined') {
            lightbox.reload();
        }
    }).catch((error) => {
        console.error("Error al buscar apuntes:", error);
        resultadosDiv.innerHTML = `
                    <div class="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 text-center mb-8">
                        <div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Error en la búsqueda</h3>
                        <p class="text-red-600 dark:text-red-400">No se pudo realizar la búsqueda. Intenta de nuevo.</p>
                    </div>
                `;
    });
}

function cargarApuntesRecientes() {
    const dosdiasatras = new Date();
    dosdiasatras.setDate(dosdiasatras.getDate() - 2);

    db.collection('apuntes')
        .where('fecha', '>=', dosdiasatras)
        .orderBy('fecha', 'desc')
        .limit(10)
        .get()
        .then(querySnapshot => {
            let apuntes = '';
            if (querySnapshot.empty) {
                apuntes = `
                            <div class="col-span-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
                                <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i class="fas fa-sticky-note text-gray-400 text-2xl"></i>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No hay apuntes recientes</h3>
                                <p class="text-gray-500 dark:text-gray-400">Comienza creando tu primer apunte desde el horario</p>
                            </div>
                        `;
            } else {
                querySnapshot.forEach((doc) => {
                    const apunte = doc.data();
                    const apunteId = doc.id;

                    apuntes += `
                                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden card-hover">
                                    <div class="p-6">
                                        <div class="flex items-start justify-between mb-4">
                                            <div class="flex items-center space-x-3">
                                                <div class="w-10 h-10 ${generarColorMateria(apunte.materia.codigo)} rounded-xl flex items-center justify-center">
                                                    <i class="fas fa-book text-white text-sm"></i>
                                                </div>
                                                <div>
                                                    <h3 class="font-bold text-gray-800 dark:text-white">${apunte.materia.nombre}</h3>
                                                    <div class="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                                                        <span><i class="fas fa-tag mr-1"></i>${apunte.materia.codigo}</span>
                                                        <span><i class="fas fa-calendar mr-1"></i>${apunte.dia} ${apunte.hora}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span class="text-xs text-gray-500 dark:text-gray-400">${apunte.fecha.toDate().toLocaleDateString()}</span>
                                        </div>
                                        
                                        <div class="mb-4">
                                            <div class="flex items-center space-x-2 mb-2">
                                                <i class="fas fa-user text-gray-400 text-sm"></i>
                                                <span class="text-sm text-gray-600 dark:text-gray-400">${apunte.materia.profesor}</span>
                                            </div>
                                            <p class="text-gray-700 dark:text-gray-300 line-clamp-3">${apunte.texto}</p>
                                        </div>

                                        ${apunte.fotoUrl ? `
                                            <div class="mb-4">
                                                <a href="${apunte.fotoUrl}" data-fancybox data-caption="${apunte.materia.nombre} - ${apunte.dia} ${apunte.hora}">
                                                    <img src="${apunte.fotoUrl}" alt="Foto del apunte" class="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity">
                                                </a>
                                            </div>
                                        ` : ''}
                                        
                                        ${apunte.audioUrl ? `
                                            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                <div class="flex items-center space-x-2 mb-3">
                                                    <i class="fas fa-volume-up text-purple-500"></i>
                                                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Audio adjunto</span>
                                                </div>
                                                <audio controls id="audio-${apunteId}" class="w-full">
                                                    <source src="${apunte.audioUrl}" type="audio/mpeg">
                                                    Tu navegador no soporta el elemento audio.
                                                </audio>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                });
            }
            document.getElementById('apuntes-recientes').innerHTML = apuntes;

            // Inicializar Plyr para cada nuevo reproductor de audio
            const audioElements = document.querySelectorAll('#apuntes-recientes audio');
            audioElements.forEach(audio => {
                const player = new Plyr(audio);
            });

            // Reiniciar Fancybox si es necesario
            if (typeof lightbox !== 'undefined') {
                lightbox.reload();
            }
        })
        .catch((error) => {
            console.error("Error al cargar apuntes recientes:", error);
            document.getElementById('apuntes-recientes').innerHTML = `
                        <div class="col-span-full bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 text-center">
                            <div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">Error al cargar apuntes</h3>
                            <p class="text-red-600 dark:text-red-400">No se pudieron cargar los apuntes recientes</p>
                        </div>
                    `;
        });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarHorarioSemanal();
    cargarApuntesRecientes();
    document.getElementById('busqueda-input').addEventListener('input', buscarApuntes);
    document.getElementById('editar-horario').addEventListener('click', toggleEditarHorario);

    // Inicializar Fancybox
    if (typeof $.fancybox !== 'undefined') {
        $.fancybox.defaults.animationEffect = "fade";
        $.fancybox.defaults.transitionEffect = "fade";
    }
});
