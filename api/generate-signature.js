import dotenv from "dotenv"
import { v2 as cloudinary } from "cloudinary"

dotenv.config()

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Generar timestamp para la firma
      const timestamp = Math.round(new Date().getTime() / 1000)

      // Generar firma
      const signature = cloudinary.utils.api_sign_request(
        {
          timestamp: timestamp,
          folder: "apuntes", // Carpeta donde se guardarán las imágenes
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        },
        process.env.CLOUDINARY_API_SECRET,
      )

      // Devolver los datos necesarios para la subida
      res.json({
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder: "apuntes",
      })
    } catch (error) {
      console.error("Error al generar la firma:", error)
      res.status(500).json({ error: "Error al generar la firma" })
    }
  } else {
    res.status(405).json({ error: "Método no permitido" })
  }
}
