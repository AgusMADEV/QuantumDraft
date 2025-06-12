/**
 * Clase Particle - Representa una partícula en la simulación
 * Puede ser un fotón o un electrón
 */
class Particle {
  /**
   * Constructor de partícula
   * @param {string} type - Tipo de partícula: 'photon' o 'electron'
   * @param {number} x - Posición inicial X
   * @param {number} y - Posición inicial Y
   * @param {number} vx - Velocidad inicial en X
   * @param {number} vy - Velocidad inicial en Y
   * @param {Array} [path] - Trayectoria opcional para registrar movimiento
   */
  constructor(type, x, y, vx, vy, path = null) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.path = path ? path : [{x, y}]; // Registra la posición inicial en la trayectoria
    this.toRemove = false;
  }

  /**
   * Actualiza la posición de la partícula basada en su velocidad
   */
  updatePosition() {
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.path) {
      this.path.push({x: this.x, y: this.y});
    }
  }

  /**
   * Actualiza la velocidad de la partícula basada en la aceleración
   * @param {number} ax - Aceleración en X
   * @param {number} ay - Aceleración en Y
   */
  updateVelocity(ax, ay) {
    this.vx += ax;
    this.vy += ay;
  }

  /**
   * Calcula la energía cinética de la partícula
   * @returns {number} - Energía cinética
   */
  getKineticEnergy() {
    return 0.5 * (this.vx * this.vx + this.vy * this.vy);
  }

  /**
   * Marca la partícula para ser eliminada
   */
  markForRemoval() {
    this.toRemove = true;
  }

  /**
   * Comprueba si la partícula debe ser eliminada
   * @returns {boolean} - Verdadero si debe eliminarse
   */
  shouldRemove() {
    return this.toRemove;
  }
  
  /**
   * Crea un electrón con propiedades aleatorias desde esta posición
   * @param {number} gain - Factor de ganancia (cuántos electrones se generan)
   * @returns {Array<Particle>} - Nuevos electrones generados
   */
  generateElectrons(gain) {
    const electrons = [];
    const count = Math.floor(gain);
    
    for (let i = 0; i < count; i++) {
      electrons.push(new Particle(
        'electron',
        this.x,
        this.y,
        Math.random() * 2 - 1, // Velocidad aleatoria entre -1 y 1
        Math.random() * 2 - 1,
        [{x: this.x, y: this.y}]
      ));
    }
    
    return electrons;
  }
}

// Para compatibilidad con módulos ES y CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Particle;
} else if (typeof window !== 'undefined') {
  window.Particle = Particle;
}