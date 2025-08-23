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
        alert('Error al cargar la configuración. Algunas funciones pueden no estar disponibles.');
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
        '#FFB6C1', '#FFD700', '#98FB98', '#87CEEB', '#DDA0DD',
        '#F0E68C', '#E6E6FA', '#20B2AA', '#FFA07A', '#87CEFA'
    ];
    return colores[parseInt(codigo) % colores.length];
}

function cargarHorarioSemanal() {
    const horario = cargarHorario();
    const horarioElement = document.getElementById('horario-semanal');

    let tabla = '<table class="w-full border-collapse border border-gray-300">';
    tabla += '<tr><th class="border p-2">Hora</th>' +
        horario.dias.map(dia => `<th class="border p-2">${dia}</th>`).join('') +
        '</tr>';

    horario.horas.forEach(hora => {
        tabla += `<tr>
                    <td class="border p-2">${hora}</td>
                    ${horario.dias.map(dia => {
            const materiaInfo = horario.materias[`${dia}-${hora}`] || {};
            const estiloMateria = materiaInfo.codigo ?
                `background-color: ${generarColorMateria(materiaInfo.codigo)}; cursor: pointer;` : '';

            return `
                            <td class="border p-2 relative group" 
                                data-dia="${dia}" 
                                data-hora="${hora}"
                                onclick="manejarClickCelda(this)"
                                style="${estiloMateria}">
                                ${materiaInfo.codigo ? `
                                    <div class="font-bold">${materiaInfo.codigo}</div>
                                    <div class="text-sm">${materiaInfo.nombre || ''}</div>
                                    <div class="text-xs text-gray-600">${materiaInfo.profesor || ''}</div>
                                ` : `
                                    <button class="opacity-0 group-hover:opacity-100 absolute inset-0 w-full h-full bg-gray-200 bg-opacity-50 flex items-center justify-center">
                                        ${editandoHorario ? 'Editar' : '+'}
                                    </button>
                                `}
                            </td>
                        `;
        }).join('')}
                </tr>`;
    });

    tabla += '</table>';
    horarioElement.innerHTML = tabla;
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
                <div class="modal-content bg-white p-4 w-full max-w-md mx-auto mt-20 rounded shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">${materiaExistente ? 'Editar' : 'Agregar'} Materia</h2>
                    <p class="mb-2">${dia} - ${hora}</p>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Código de la Materia</label>
                        <input type="text" id="codigo-materia" class="w-full p-2 border rounded" placeholder="Ej: 2569" value="${materiaExistente ? materiaExistente.codigo : ''}">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Nombre de la Materia</label>
                        <input type="text" id="nombre-materia" class="w-full p-2 border rounded" placeholder="Ej: Física III" value="${materiaExistente ? materiaExistente.nombre : ''}">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Profesor</label>
                        <input type="text" id="profesor-materia" class="w-full p-2 border rounded" placeholder="Nombre del profesor" value="${materiaExistente ? materiaExistente.profesor : ''}">
                    </div>
                    <button onclick="guardarMateria('${dia}', '${hora}')" class="bg-green-500 text-white p-2 rounded mr-2">Guardar</button>
                    ${materiaExistente ? `<button onclick="eliminarMateria('${dia}', '${hora}')" class="bg-red-500 text-white p-2 rounded mr-2">Eliminar</button>` : ''}
                    <button onclick="cerrarModalApuntes()" class="bg-gray-500 text-white p-2 rounded">Cancelar</button>
                </div>
            `;
}

function guardarMateria(dia, hora) {
    const codigo = document.getElementById('codigo-materia').value;
    const nombre = document.getElementById('nombre-materia').value;
    const profesor = document.getElementById('profesor-materia').value;

    if (!codigo || !nombre) {
        alert('Por favor, completa al menos el código y nombre de la materia.');
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
    if (confirm('¿Estás seguro de que quieres eliminar esta materia?')) {
        const horario = cargarHorario();
        delete horario.materias[`${dia}-${hora}`];
        guardarHorario(horario);
        cerrarModalApuntes();
        cargarHorarioSemanal();
    }
}

function toggleEditarHorario() {
    editandoHorario = !editandoHorario;
    const botonEditar = document.getElementById('editar-horario');
    botonEditar.textContent = editandoHorario ? 'Finalizar Edición' : 'Editar Horario';
    botonEditar.classList.toggle('bg-blue-500');
    botonEditar.classList.toggle('bg-green-500');
    cargarHorarioSemanal();
}

function abrirModalApuntes(dia, hora, materiaInfo) {
    const modal = document.getElementById('modal-apuntes');
    modal.classList.remove('hidden');
    modal.innerHTML = `
                <div class="modal-content bg-white p-4 w-full max-w-md mx-auto mt-20 rounded shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Registrar Apunte - ${materiaInfo.nombre}</h2>
                    <p class="mb-2">${dia} - ${hora}</p>
                    <p class="mb-4 text-sm text-gray-600">Profesor: ${materiaInfo.profesor}</p>
                    <textarea id="texto-apunte" class="w-full p-2 border rounded mb-4" placeholder="Escribe tu apunte aquí..."></textarea>
                    <button id="subir-foto" class="bg-blue-500 text-white p-2 rounded mr-2">Subir Foto</button>
                    <button id="grabar-audio" class="bg-blue-500 text-white p-2 rounded mr-2">Grabar Audio</button>
                    <button onclick="guardarApunte('${dia}', '${hora}', '${materiaInfo.codigo}')" class="bg-green-500 text-white p-2 rounded mr-2">Guardar Apunte</button>
                    <button onclick="cerrarModalApuntes()" class="bg-red-500 text-white p-2 rounded">Cerrar</button>
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
        alert('Error: La configuración de carga de imágenes no está lista. Por favor, intenta de nuevo en unos segundos.');
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
                const imgPreview = document.createElement('img');
                imgPreview.src = fotoUrl;
                imgPreview.alt = "Imagen subida";
                imgPreview.className = 'mt-2 max-w-full h-auto';
                document.querySelector('.modal-content').appendChild(imgPreview);
            } else if (error) {
                console.error('Error al subir la imagen:', error);
                alert('Error al subir la imagen: ' + (error.message || JSON.stringify(error)));
            } else if (result) {
                console.log('Evento del widget:', result.event);
            }
        });
        myWidget.open();
    } catch (error) {
        console.error('Error al crear el widget de Cloudinary:', error);
        alert('Error al preparar la subida de imágenes: ' + error.message);
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
        alert('Error al subir el audio: ' + error.message);
        return null;
    }
}

function grabarAudio() {
    const button = document.getElementById('grabar-audio');

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        button.textContent = 'Grabar Audio';
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            button.textContent = 'Detener Grabación';

            audioChunks = [];
            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                audioUrl = await subirAudio(blob);
                if (audioUrl) {
                    // Remover audio anterior si existe
                    const existingAudio = document.querySelector('.modal-content audio');
                    if (existingAudio) {
                        existingAudio.remove();
                    }
                    
                    const audioElement = document.createElement('audio');
                    audioElement.src = audioUrl;
                    audioElement.controls = true;
                    audioElement.className = 'mt-2';
                    document.querySelector('.modal-content').appendChild(audioElement);
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
        alert('Por favor, escribe algún contenido en el apunte.');
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
        alert('Error al guardar el apunte. Por favor, intenta de nuevo.');
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
            apuntesUnicos.forEach((apunte) => {
                resultadosHTML += `
                            <div class="mb-4 p-4 bg-white rounded shadow">
                                <p class="font-bold">${apunte.materia.nombre} (${apunte.materia.codigo})</p>
                                <p class="text-sm text-gray-600">Profesor: ${apunte.materia.profesor}</p>
                                <p class="text-sm text-gray-600">${apunte.dia} - ${apunte.hora}</p>
                                <p class="mt-2">${apunte.texto}</p>
                                <p class="text-sm text-gray-500 mt-2">${apunte.fecha.toDate().toLocaleString()}</p>
                                ${apunte.fotoUrl ? `
                                    <a href="${apunte.fotoUrl}" data-fancybox data-caption="Single image" data-title="${apunte.materia.nombre} - ${apunte.dia} ${apunte.hora}">
                                        <img src="${apunte.fotoUrl}" alt="Foto del apunte" class="mt-2 max-w-full h-auto cursor-pointer">
                                    </a>` : ''}
                                ${apunte.audioUrl ? `<audio controls src="${apunte.audioUrl}" class="mt-2">Tu navegador no soporta el elemento audio.</audio>` : ''}
                            </div>
                        `;
            });
        } else {
            resultadosHTML = '<p>No se encontraron resultados.</p>';
        }

        // Mostrar resultados en la interfaz
        resultadosDiv.innerHTML = resultadosHTML;

        // Reiniciar Fancybox si es necesario
        if (typeof lightbox !== 'undefined') {
            lightbox.reload();
        }
    }).catch((error) => {
        console.error("Error al buscar apuntes:", error);
        resultadosDiv.innerHTML = '<p>Error al realizar la búsqueda.</p>';
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
            querySnapshot.forEach((doc) => {
                const apunte = doc.data();
                const apunteId = doc.id; // Agregar ID del apunte

                apuntes += `
                        <div class="mb-4 p-4 bg-white rounded shadow">
                            <p class="font-bold">${apunte.materia.nombre} (${apunte.materia.codigo})</p>
                            <p class="text-sm text-gray-600">Profesor: ${apunte.materia.profesor}</p>
                            <p class="text-sm text-gray-600">${apunte.dia} - ${apunte.hora}</p>
                            <p class="mt-2">${apunte.texto}</p>
                            <p class="text-sm text-gray-500 mt-2">${apunte.fecha.toDate().toLocaleString()}</p>
                            ${apunte.fotoUrl ? `
                                <a href="${apunte.fotoUrl}" data-fancybox data-caption="${apunte.materia.nombre} - ${apunte.dia} ${apunte.hora}" data-title="${apunte.materia.nombre} - ${apunte.dia} ${apunte.hora}">
                                    <img src="${apunte.fotoUrl}" alt="Foto del apunte" class="mt-2 max-w-full h-auto cursor-pointer">
                                </a>` : ''}
                            ${apunte.audioUrl ? `
                                <audio controls id="audio-${apunteId}" class="mt-2">
                                    <source src="${apunte.audioUrl}" type="audio/mpeg">
                                    Tu navegador no soporta el elemento audio.
                                </audio>` : ''}
                        </div>
                        `;
            });
            document.getElementById('apuntes-recientes').innerHTML = apuntes || '<p>No hay apuntes recientes.</p>';

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
