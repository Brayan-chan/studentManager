import dotenv from 'dotenv'

dotenv.config()

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Validar variables de entorno requeridas
    const requiredEnvVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'S3_BUCKET_NAME',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_UPLOAD_PRESET',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      console.error('Faltan variables de entorno:', missingVars)
      return res.status(500).json({ 
        error: 'Error de configuración del servidor',
        missingVars,
        debug: {
          cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
        }
      })
    }

    // Log de depuración
    console.log('Enviando configuración:', {
      hasCloudinaryName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasUploadPreset: !!process.env.CLOUDINARY_UPLOAD_PRESET,
      cloudinaryName: process.env.CLOUDINARY_CLOUD_NAME
    })

    // Establecer headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    // Enviar configuración al frontend
    res.json({
      aws: {
        region: process.env.AWS_REGION
      },
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
        apiKey: process.env.CLOUDINARY_API_KEY
      }
    })
  } else {
    res.status(405).json({ error: 'Método no permitido' })
  }
}
