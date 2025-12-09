import crypto from 'crypto';

// Función para generar ID único para compartir
function generateShareId() {
  return crypto.randomBytes(16).toString('hex');
}

// Función para crear un hash del contenido para usar como clave
function createContentHash(noteData) {
  const contentString = JSON.stringify(noteData);
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

export default function handler(req, res) {
  // Solo permitir POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const noteData = req.body;
    
    if (!noteData || !noteData.id) {
      return res.status(400).json({ error: 'Datos del apunte no válidos' });
    }
    
    // Generar un ID de compartir basado en el contenido del apunte
    // Esto asegura que el mismo apunte siempre tenga el mismo ID
    const contentHash = createContentHash(noteData);
    const shareId = contentHash.substring(0, 16); // Usar primeros 16 caracteres
    
    // TODO: Guardar la relación shareId -> apunteId en Firebase
    // await firestore.collection('sharedNotes').doc(shareId).set({
    //   apunteId: noteData.id,
    //   createdAt: new Date(),
    //   expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    //   noteData: noteData // Opcional: guardar una copia del apunte
    // });
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://studentman-beta.vercel.app';
    
    const shareUrl = `${baseUrl}/nota/${shareId}`;

    // Responder con el enlace
    res.json({
      shareId,
      shareUrl,
      shortUrl: `/nota/${shareId}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expira en 30 días
      noteId: noteData.id
    });
    
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Error al crear enlace de compartir' });
  }
}