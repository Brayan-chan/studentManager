// Firebase Client SDK para el backend
// Usando fetch para hacer llamadas HTTP a la REST API de Firestore

const firebaseConfig = {
  apiKey: "AIzaSyB-5z-xwAmReLjNGPdnwB2Ff7jjtCk9_aQ",
  authDomain: "studentman-13c8f.firebaseapp.com",
  projectId: "studentman-13c8f",
  storageBucket: "studentman-13c8f.firebasestorage.app",
  messagingSenderId: "380344615554",
  appId: "1:380344615554:web:a7c15289f49c49e7ff2a9b",
};

const FIRESTORE_REST_API = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

/**
 * Obtiene un documento de Firestore usando la REST API
 */
async function getDocument(collection, documentId) {
  try {
    const url = `${FIRESTORE_REST_API}/${collection}/${documentId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error al obtener documento: ${response.statusText}`);
    }
    
    const data = await response.json();
    return parseFirestoreDocument(data);
  } catch (error) {
    console.error('Error en getDocument:', error);
    return null;
  }
}

/**
 * Parsea un documento de Firestore REST API al formato normal
 */
function parseFirestoreDocument(doc) {
  if (!doc || !doc.fields) return null;
  
  const result = { id: doc.name.split('/').pop() };
  
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = parseFirestoreValue(value);
  }
  
  return result;
}

/**
 * Parsea un valor de Firestore REST API
 */
function parseFirestoreValue(value) {
  if (!value) return null;
  
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.nullValue !== undefined) return null;
  
  if (value.arrayValue) {
    return value.arrayValue.values 
      ? value.arrayValue.values.map(v => parseFirestoreValue(v))
      : [];
  }
  
  if (value.mapValue) {
    const obj = {};
    if (value.mapValue.fields) {
      for (const [k, v] of Object.entries(value.mapValue.fields)) {
        obj[k] = parseFirestoreValue(v);
      }
    }
    return obj;
  }
  
  return null;
}

/**
 * Crea o actualiza un documento en Firestore
 */
async function setDocument(collection, documentId, data) {
  try {
    const url = `${FIRESTORE_REST_API}/${collection}/${documentId}`;
    const firestoreData = convertToFirestoreFormat(data);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: firestoreData })
    });
    
    if (!response.ok) {
      throw new Error(`Error al guardar documento: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error en setDocument:', error);
    return false;
  }
}

/**
 * Convierte datos normales al formato de Firestore REST API
 */
function convertToFirestoreFormat(data) {
  const result = {};
  
  for (const [key, value] of Object.entries(data)) {
    result[key] = convertValue(value);
  }
  
  return result;
}

function convertValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) 
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => convertValue(v))
      }
    };
  }
  
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = convertValue(v);
    }
    return { mapValue: { fields } };
  }
  
  return { stringValue: String(value) };
}

export { getDocument, setDocument, firebaseConfig };