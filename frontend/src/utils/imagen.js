/**
 * Convierte un archivo de imagen a un data URL comprimido y redimensionado.
 * Así la foto queda liviana (~30-60 KB) y viaja dentro de la base de datos.
 *
 * @param {File} file        - archivo de imagen elegido por el usuario
 * @param {number} maxSize   - lado máximo en px (se mantiene la proporción)
 * @param {number} quality   - calidad JPEG 0..1
 * @returns {Promise<string>} data URL (image/jpeg)
 */
export function comprimirImagen(file, maxSize = 500, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxSize) {
          height = Math.round(height * (maxSize / width)); width = maxSize
        } else if (height > maxSize) {
          width = Math.round(width * (maxSize / height)); height = maxSize
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        // Fondo blanco (por si la imagen es PNG con transparencia)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
