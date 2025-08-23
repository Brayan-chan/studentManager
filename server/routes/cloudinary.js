import express from 'express';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Configurar Cloudinary con las credenciales
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Endpoint para generar la firma de subida
router.post('/generate-signature', async (req, res) => {
    try {
        const timestamp = Math.round((new Date).getTime()/1000);
        
        // Parámetros para firmar
        const paramsToSign = {
            timestamp: timestamp,
            folder: 'student_manager',
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
        };
        
        // Generar la firma
        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        // Devolver los datos necesarios para la subida
        res.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder: 'student_manager',
            uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
        });
    } catch (error) {
        console.error('Error al generar la firma:', error);
        res.status(500).json({ error: 'Error al generar la firma de subida' });
    }
});

export default router;
