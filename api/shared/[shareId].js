import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { getDocument } from '../firebase-admin.js';

// Función para recrear el hash del contenido
function recreateContentHash(shareId) {
  // Por ahora, esto es temporal. En una implementación real,
  // almacenarías la relación shareId -> originalApunteId en una base de datos
  return shareId;
}

// Función para formatear fecha
function formatDate(date) {
  if (!date) return 'Fecha no disponible';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Fecha no disponible';
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
  };
  
  return iconMap[fileType.toLowerCase()] || iconMap['default'];
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { shareId } = req.query;
    
    console.log('=== API REQUEST ===');
    console.log('shareId recibido:', shareId);
    console.log('req.query:', req.query);
    console.log('req.url:', req.url);
    
    if (!shareId) {
      console.log('Error: shareId no proporcionado');
      return res.status(400).json({ error: 'ID de compartir no proporcionado' });
    }

    console.log('Buscando apunte compartido:', shareId);

    // Buscar el apunte compartido COMPLETO desde sharedNotes
    const sharedData = await getDocument('sharedNotes', shareId);
    
    if (sharedData) {
      console.log('Apunte compartido encontrado:', sharedData);
      
      // Verificar si el enlace ha expirado
      if (sharedData.expiresAt && new Date(sharedData.expiresAt) < new Date()) {
        return res.status(410).json({ error: 'Este enlace ha expirado' });
      }
      
      // sharedData YA contiene todos los datos del apunte
      // No necesitamos consultar la colección apuntes
      console.log('Devolviendo datos del apunte desde sharedNotes');
      return res.status(200).json(sharedData);
    }
    
    console.log('Referencia de apunte compartido no encontrada, usando datos de ejemplo');
    
    // Si no se encuentra en Firebase, devolver datos de ejemplo
    const apunteData = {
      id: shareId,
      titulo: 'Apunte Compartido (Modo Demo)',
      contenido: '<p>Este es un apunte de ejemplo.</p><p><strong>Nota:</strong> El apunte compartido no se encontró en la base de datos. Esto puede deberse a:</p><ul><li>El enlace es antiguo o no válido</li><li>El apunte fue eliminado</li><li>Hay un problema de conexión con Firebase</li></ul>',
      materia: 'Matemáticas',
      tipo: 'Apunte',
      fecha: new Date().toISOString(),
      dia: 'Lunes',
      horaInicio: '08:00',
      horaFin: '10:00',
      codigoMateria: '578',
      archivos: [],
      multimedia: {
        foto: null,
        audio: null
      }
    };

    console.log('Enviando respuesta de ejemplo');
    return res.status(200).json(apunteData);
    
  } catch (error) {
    console.error('=== ERROR EN API ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Error al obtener el apunte compartido',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

function generateTemporaryHTML(shareId) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StudentMan - Apunte Compartido</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link rel="icon" type="image/png" href="/images/studentman_metua5.ico">
    </head>
    <body class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div class="container mx-auto px-4 py-8 max-w-2xl">
            <!-- Header -->
            <header class="text-center mb-8">
                <div class="inline-flex items-center mb-4">
                    <img src="/images/studentman_metua5.png" alt="StudentMan" class="w-8 h-8 mr-2">
                    <h1 class="text-2xl font-bold text-gray-800">StudentMan</h1>
                </div>
                <p class="text-gray-600">Sistema de gestión de apuntes</p>
            </header>

            <!-- Status Card -->
            <div class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div class="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white">
                    <div class="flex items-center justify-center">
                        <i class="fas fa-tools text-4xl mb-4"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-center mb-2">Funcionalidad en Mantenimiento</h2>
                    <p class="text-center text-orange-100">La funcionalidad de compartir apuntes está siendo migrada</p>
                </div>

                <div class="p-6">
                    <div class="text-center mb-6">
                        <p class="text-gray-700 mb-4">
                            Estamos actualizando nuestro sistema de compartir apuntes para ofrecerte una mejor experiencia.
                        </p>
                        <p class="text-gray-600 mb-6">
                            Esta funcionalidad estará disponible nuevamente muy pronto.
                        </p>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-info-circle text-blue-600 mr-3 mt-1"></i>
                            <div>
                                <h4 class="font-semibold text-blue-800 mb-1">¿Qué está pasando?</h4>
                                <p class="text-blue-700 text-sm">
                                    Estamos migrando el sistema de almacenamiento a una solución más robusta 
                                    para garantizar que tus apuntes compartidos estén siempre disponibles.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-rocket text-green-600 mr-3 mt-1"></i>
                            <div>
                                <h4 class="font-semibold text-green-800 mb-1">Mientras tanto...</h4>
                                <p class="text-green-700 text-sm mb-2">
                                    Puedes continuar creando y organizando tus apuntes en la aplicación principal.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Reference ID -->
                    <div class="text-xs text-gray-400 bg-gray-50 p-2 rounded font-mono text-center">
                        ID de referencia: ${shareId}
                    </div>
                </div>
            </div>

            <!-- Call to action -->
            <div class="text-center mt-8">
                <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">¿Necesitas organizar tus apuntes?</h3>
                    <p class="text-gray-600 mb-4">Usa StudentMan para organizar tus apuntes y horarios</p>
                    <a href="/" class="inline-flex items-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                        <i class="fas fa-home mr-2"></i>
                        Ir a la aplicación
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateErrorHTML(errorMessage) {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - StudentMan</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body class="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-md mx-4">
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
                <p class="text-gray-600 mb-4">Algo salió mal al cargar este apunte.</p>
                <p class="text-sm text-gray-500 mb-6">${errorMessage}</p>
                <a href="/" class="inline-flex items-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                    <i class="fas fa-home mr-2"></i>
                    Volver al inicio
                </a>
            </div>
        </div>
    </body>
    </html>
  `;
}