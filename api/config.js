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
      'CLOUDINARY_UPLOAD_PRESET'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      console.error('Faltan variables de entorno:', missingVars)
      return res.status(500).json({ error: 'Error de configuración del servidor' })
    }

    // Enviar solo la configuración necesaria al frontend
    res.json({
      aws: {
        region: process.env.AWS_REGION
      },
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
      }
    })
  } else {
    res.status(405).json({ error: 'Método no permitido' })
  }
}
