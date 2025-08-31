import AWS from "aws-sdk"
import { v4 as uuidv4 } from "uuid"

// Configurar AWS
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || "us-east-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" })
  }

  try {
    const { fileName, fileType } = req.body
    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName y fileType son requeridos" })
    }

    const bucketName = process.env.S3_BUCKET_NAME
    const key = `uploads/${uuidv4()}-${fileName}`

    const params = {
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
      Expires: 60 * 5, // URL válida por 5 minutos
    }

    const signedUrl = s3.getSignedUrl("putObject", params)

    // Construir la URL pública del archivo
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-2"}.amazonaws.com/${key}`

    res.status(200).json({
      signedUrl,
      fileUrl,
      fileName,
      bucketName,
    })
  } catch (error) {
    console.error("Error al generar URL firmada:", error)
    res.status(500).json({ error: "Error al generar URL firmada" })
  }
}
