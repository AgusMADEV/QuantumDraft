/**
 * Clase CanvasRenderer - Se encarga del renderizado en el canvas
 */
class CanvasRenderer {
  /**
   * Constructor del renderizador
   * @param {HTMLCanvasElement} canvas - Elemento canvas para dibujar
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showTrajectories = false;
  }

  /**
   * Limpia el canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Configura la opción de mostrar trayectorias
   * @param {boolean} show - Si se deben mostrar las trayectorias
   */
  setShowTrajectories(show) {
    this.showTrajectories = show;
  }

  /**
   * Dibuja una partícula
   * @param {Particle} particle - Partícula a dibujar
   */
  drawParticle(particle) {
    // Dibujar trayectoria si está habilitado
    if (this.showTrajectories && particle.path && particle.path.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(particle.path[0].x, particle.path[0].y);
      particle.path.forEach(pt => this.ctx.lineTo(pt.x, pt.y));
      this.ctx.strokeStyle = particle.type === 'photon' ? 'rgba(255,255,0,0.5)' : 'rgba(0,0,0,0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.closePath();
    }
    
    // Dibujar la partícula actual
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = particle.type === 'photon' ? 'yellow' : 'black';
    this.ctx.fill();
    this.ctx.closePath();
  }

  /**
   * Dibuja un componente
   * @param {Component} component - Componente a dibujar
   */
  drawComponent(component) {
    this.ctx.fillStyle = component.color;
    
    if (component.vertices) {
      // Dibujar forma personalizada
      this.ctx.beginPath();
      component.vertices.forEach((v, i) => {
        if (i === 0) this.ctx.moveTo(v.x, v.y);
        else this.ctx.lineTo(v.x, v.y);
      });
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      // Dibujar como un cuadrado
      this.ctx.fillRect(component.x - 10, component.y - 10, 20, 20);
    }
  }
  
  /**
   * Dibuja una capa de dibujo personalizado
   * @param {Array} drawingLayer - Capa con elementos de dibujo
   */
  drawDrawingLayer(drawingLayer) {
    drawingLayer.forEach(stroke => {
      this.ctx.strokeStyle = stroke.color || '#000000';
      this.ctx.lineWidth = stroke.width || 1;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      if (stroke.type === 'free') {
        this.ctx.beginPath();
        stroke.points.forEach((point, index) => {
          if (index === 0) {
            this.ctx.moveTo(point.x, point.y);
          } else {
            this.ctx.lineTo(point.x, point.y);
          }
        });
        this.ctx.stroke();
      } else if (stroke.type === 'line') {
        this.ctx.beginPath();
        this.ctx.moveTo(stroke.start.x, stroke.start.y);
        this.ctx.lineTo(stroke.end.x, stroke.end.y);
        this.ctx.stroke();
      } else if (stroke.type === 'rectangle') {
        this.ctx.strokeRect(
          stroke.start.x,
          stroke.start.y,
          stroke.end.x - stroke.start.x,
          stroke.end.y - stroke.start.y
        );
      } else if (stroke.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(stroke.end.x - stroke.start.x, 2) + 
          Math.pow(stroke.end.y - stroke.start.y, 2)
        );
        this.ctx.beginPath();
        this.ctx.arc(stroke.start.x, stroke.start.y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
      }
    });
  }
  
  /**
   * Dibuja un indicador de modo en el canvas
   * @param {string} mode - Modo actual (simulación o dibujo)
   * @param {string} submodeText - Texto adicional para el modo
   */
  drawModeIndicator(mode, submodeText = "") {
    const text = mode === 'simulation' ? 'Modo: Simulación' : `Modo: Dibujo (${submodeText})`;
    
    this.ctx.save();
    this.ctx.fillStyle = mode === 'simulation' ? 'rgba(0,128,0,0.7)' : 'rgba(128,0,0,0.7)';
    this.ctx.fillRect(this.canvas.width - 150, 10, 140, 25);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, this.canvas.width - 80, 22);
    this.ctx.restore();
  }
  
  /**
   * Dibuja el campo eléctrico como flechas vectoriales
   * @param {PhysicsSimulator} physicsSimulator - El simulador de física
   * @param {number} gridSpacing - Espaciado entre vectores de campo
   */
  drawElectricField(physicsSimulator, gridSpacing = 30) {
    this.ctx.save();
    
    // Configuración para dibujar los vectores
    this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
    this.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
    
    // Dibujar vectores en una cuadrícula
    for (let x = 0; x < this.canvas.width; x += gridSpacing) {
      for (let y = 0; y < this.canvas.height; y += gridSpacing) {
        const field = physicsSimulator.calculateElectricField(x, y);
        
        // Normalizar y escalar el vector para visualización
        const magnitude = Math.sqrt(field.ex * field.ex + field.ey * field.ey);
        const scale = 5 / (1 + Math.log(magnitude + 1)); // Escala logarítmica para mejor visualización
        
        const fieldX = field.ex * scale;
        const fieldY = field.ey * scale;
        
        // Dibujar línea del vector
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + fieldX, y + fieldY);
        this.ctx.stroke();
        
        // Dibujar punta de flecha
        const angle = Math.atan2(fieldY, fieldX);
        this.ctx.beginPath();
        this.ctx.moveTo(x + fieldX, y + fieldY);
        this.ctx.lineTo(
          x + fieldX - 3 * Math.cos(angle - Math.PI / 6),
          y + fieldY - 3 * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
          x + fieldX - 3 * Math.cos(angle + Math.PI / 6),
          y + fieldY - 3 * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
    
    this.ctx.restore();
  }
}

// Para compatibilidad con módulos ES y CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasRenderer;
} else if (typeof window !== 'undefined') {
  window.CanvasRenderer = CanvasRenderer;
}