import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configurar AWS
const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'us-east-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const fileName = `audio-${uuidv4()}.webm`;
        const bucketName = process.env.AWS_BUCKET_NAME;

        const params = {
            Bucket: bucketName,
            Key: fileName,
            ContentType: 'audio/webm',
            Expires: 60 * 5 // URL válida por 5 minutos
        };

        const signedUrl = s3.getSignedUrl('putObject', params);

        res.status(200).json({
            signedUrl,
            fileName,
            bucketName
        });
    } catch (error) {
        console.error('Error al generar URL firmada:', error);
        res.status(500).json({ error: 'Error al generar URL firmada' });
    }
}
