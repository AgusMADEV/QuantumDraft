/**
 * Clase Component - Representa un componente del fotomultiplicador
 * Puede ser photocathode, anode, dinode, grid, accelerator, etc.
 */
class Component {
  /**
   * Constructor de componente
   * @param {string} type - Tipo de componente (photocathode, anode, dinode, etc)
   * @param {number} x - Posición X del centro del componente
   * @param {number} y - Posición Y del centro del componente
   * @param {number} voltage - Voltaje del componente
   * @param {string} color - Color en formato hexadecimal (#RRGGBB)
   * @param {string} [model="simple"] - Modelo de comportamiento físico
   * @param {Array} [vertices=null] - Vértices para componentes personalizados
   */
  constructor(type, x, y, voltage, color, model = "simple", vertices = null) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.voltage = voltage;
    this.color = color;
    this.model = model;
    this.vertices = vertices;
    this.params = {};

    // Inicializar parámetros por defecto según el tipo de componente
    this.initializeParams();
  }

  /**
   * Inicializa parámetros según el tipo de componente
   */
  initializeParams() {
    if (this.type === 'dinode') {
      // Parámetros para modelo simple
      this.params.r = 2;
      this.params.beta = 0;
      
      // Parámetros para modelo avanzado
      this.params.phi_w = 1;
      this.params.phi_0 = 1;
      this.params.sigma_E = 2.2;
      this.params.E_0 = 1;
      this.params.alpha = 1;
      this.params.gamma = 1;
      this.params.lambda = 1;
    }
  }

  /**
   * Calcula la ganancia de amplificación según el modelo configurado
   * @param {number} deltaV - Diferencia de voltaje
   * @returns {number} - Factor de ganancia calculado
   */
  calculateGain(deltaV) {
    if (this.model === 'simple') {
      const r = this.params?.r || 2;
      const beta = this.params?.beta || 0;
      return r * Math.pow(deltaV, beta);
    } else if (this.model === 'advanced') {
      const { phi_w, phi_0, sigma_E, E_0, alpha, gamma, lambda } = this.params || {};
      // Implementación del modelo avanzado
      const probability = Math.exp(-phi_w / (E_0 || 1));
      const energy = (phi_0 || 1) + (sigma_E || 2.2) * Math.random();
      return probability * energy * (alpha || 1) * (gamma || 1) * (lambda || 1);
    }
    return 1; // Sin amplificación
  }

  /**
   * Verifica si un punto está dentro de este componente
   * @param {number} pointX - Coordenada X del punto
   * @param {number} pointY - Coordenada Y del punto
   * @returns {boolean} - Verdadero si el punto está dentro
   */
  containsPoint(pointX, pointY) {
    if (this.vertices) {
      // Para componentes con forma personalizada, usar algoritmo de punto en polígono
      return this.isPointInPolygon({x: pointX, y: pointY}, this.vertices);
    } else {
      // Para componentes cuadrados simples (ancho y alto = 20)
      return (
        pointX >= this.x - 10 &&
        pointX <= this.x + 10 &&
        pointY >= this.y - 10 &&
        pointY <= this.y + 10
      );
    }
  }

  /**
   * Algoritmo de Ray Casting para determinar si un punto está en un polígono
   * @param {Object} point - Punto con coordenadas {x, y}
   * @param {Array} vertices - Array de vértices del polígono
   * @returns {boolean} - Verdadero si el punto está dentro del polígono
   */
  isPointInPolygon(point, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      if (((vertices[i].y > point.y) !== (vertices[j].y > point.y)) &&
          (point.x < (vertices[j].x - vertices[i].x) * (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  }
}

// Para compatibilidad con módulos ES y CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Component;
} else if (typeof window !== 'undefined') {
  window.Component = Component;
}