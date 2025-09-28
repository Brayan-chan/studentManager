import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

// Verificar que las variables de entorno se cargaron correctamente
console.log('Variables de entorno cargadas:', {
  hasAwsKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasAwsSecret: !!process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,
  bucketName: process.env.S3_BUCKET_NAME
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

// Importar rutas de Cloudinary
import cloudinaryRoutes from './routes/cloudinary.js'
app.use('/api', cloudinaryRoutes)

// Importar rutas para apuntes compartidos
import sharedNotesRoutes from './routes/shared-notes.js'
app.use('/api/shared', sharedNotesRoutes)
app.use('/shared', sharedNotesRoutes)

// Importar la ruta de generación de URL firmada
import getSignedUrlRoute from '../api/get-signed-url.js'
app.use('/api/get-signed-url', getSignedUrlRoute)

import AWS from 'aws-sdk';

// Configurar AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Endpoint para obtener las variables de configuración
app.get('/api/config', (req, res) => {
  // Validar que todas las variables necesarias estén definidas
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'S3_BUCKET_NAME',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_UPLOAD_PRESET',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('Faltan variables de entorno:', missingVars);
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }

  res.json({
    aws: {
      region: process.env.AWS_REGION
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    }
  })
})

// Endpoint para obtener URL firmada para subir audio
app.post('/api/get-signed-url', async (req, res) => {
  try {
    const fileName = `audios/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Expires: 60, // URL válida por 60 segundos
      ContentType: 'audio/webm'
    };

    const signedUrl = await s3.getSignedUrlPromise('putObject', params);
    
    res.json({
      signedUrl,
      fileName,
      bucketName: process.env.S3_BUCKET_NAME
    });
  } catch (error) {
    console.error('Error al generar URL firmada:', error);
    res.status(500).json({ error: 'Error al generar URL de subida' });
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})