/**
 * Clase SimulationController - Controlador principal de la simulación
 * Coordina la interacción entre el modelo físico y la vista
 */
class SimulationController {
  /**
   * Constructor del controlador
   * @param {HTMLCanvasElement} canvas - Canvas para renderizado
   * @param {HTMLCanvasElement} currentChartCanvas - Canvas para gráfica de corriente
   * @param {HTMLCanvasElement} impactChartCanvas - Canvas para gráfica de impactos
   */
  constructor(canvas, currentChartCanvas, impactChartCanvas) {
    // Componentes de la interfaz
    this.canvas = canvas;
    
    // Inicializar modelo
    this.components = [];
    this.particles = [];
    this.drawingLayer = [];
    
    // Inicializar vista
    this.renderer = new CanvasRenderer(canvas);
    this.chartManager = new ChartManager(currentChartCanvas, impactChartCanvas);
    
    // Inicializar física
    this.physicsSimulator = new PhysicsSimulator();
    
    // Estado de la simulación
    this.animationFrameId = null;
    this.isSimulationMode = true;
    this.isDrawing = false;
    this.drawingMode = 'free';
    this.brushSize = 5;
    this.currentBrush = 1;
    this.showTrajectories = false;
    this.showElectricField = false;
    
    // Parámetros de simulación
    this.timeElapsed = 0;
    this.deltaT = 0.1;
    this.photonCount = 10;
    this.seed = '';
    
    // Factores de conversión: metros por píxel
    this.mPerPxX = 1;
    this.mPerPxY = 1;
    
    // Variables para dibujo
    this.startX = 0;
    this.startY = 0;
  }
  
  /**
   * Inicializa la simulación con componentes por defecto
   */
  initialize() {
    // Limpiar estado
    this.components = [];
    this.particles = [];
    
    // Añadir componentes obligatorios
    this.addComponent('photocathode', 50, this.canvas.height / 2, -100, '#0000ff');
    this.addComponent('anode', this.canvas.width - 50, this.canvas.height / 2, 500, '#ff0000');
    
    // Añadir dinodos
    this.updateDynodeCount(8); // 8 dinodos por defecto
    
    // Actualizar vista
    this.render();
  }
  
  /**
   * Actualiza el número de dinodos y los redistribuye
   * @param {number} count - Número de dinodos
   */
  updateDynodeCount(count) {
    // Eliminar dinodos existentes
    this.components = this.components.filter(c => c.type !== 'dinode');
    
    // Crear nuevos dinodos distribuidos uniformemente
    for (let i = 0; i < count; i++) {
      const x = 50 + ((this.canvas.width - 100) * (i + 1) / (count + 1));
      this.addComponent('dinode', x, this.canvas.height / 2, 0, '#808080', 'simple');
    }
    
    this.render();
  }
  
  /**
   * Añade un componente al simulador
   * @param {string} type - Tipo de componente
   * @param {number} x - Posición X
   * @param {number} y - Posición Y
   * @param {number} voltage - Voltaje
   * @param {string} color - Color en formato hexadecimal
   * @param {string} model - Modelo físico a utilizar
   * @param {Array} vertices - Vértices para formas personalizadas
   * @returns {Component} - El componente creado
   */
  addComponent(type, x, y, voltage, color, model = "simple", vertices = null) {
    const component = new Component(type, x, y, voltage, color, model, vertices);
    this.components.push(component);
    this.physicsSimulator.setComponents(this.components);
    return component;
  }
  
  /**
   * Actualiza la configuración de la simulación
   * @param {Object} config - Objeto con parámetros de configuración
   */
  updateConfiguration(config) {
    if (config.deltaT !== undefined) this.deltaT = config.deltaT;
    if (config.photonCount !== undefined) this.photonCount = config.photonCount;
    if (config.seed !== undefined) this.seed = config.seed;
    if (config.showTrajectories !== undefined) {
      this.showTrajectories = config.showTrajectories;
      this.renderer.setShowTrajectories(config.showTrajectories);
    }
    if (config.showElectricField !== undefined) {
      this.showElectricField = config.showElectricField;
    }
  }
  
  /**
   * Emite fotones desde el fotocátodo
   */
  emitPhotons() {
    const photocathode = this.components.find(c => c.type === 'photocathode');
    if (!photocathode) return;
    
    // Inicializar semilla para reproducibilidad si está especificada
    if (this.seed) {
      Math.seedrandom(this.seed);
    }
    
    // Emitir fotones
    for (let i = 0; i < this.photonCount; i++) {
      this.particles.push(new Particle(
        'photon',
        photocathode.x,
        photocathode.y,
        2 + Math.random() * 1,          // Velocidad X: 2-3
        (Math.random() - 0.5) * 2,      // Velocidad Y: -1 a 1
        [{x: photocathode.x, y: photocathode.y}]
      ));
    }
  }
  
  /**
   * Inicia la simulación
   */
  start() {
    if (this.animationFrameId) return; // Ya está corriendo
    
    this.emitPhotons();
    this.updateSimulation();
  }
  
  /**
   * Detiene la simulación
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Reinicia la simulación
   */
  reset() {
    this.stop();
    this.particles = [];
    this.timeElapsed = 0;
    this.chartManager.resetCharts();
    this.render();
  }
  
  /**
   * Actualiza el estado de la simulación (bucle principal)
   */
  updateSimulation() {
    // Actualizar física
    const result = this.physicsSimulator.updateParticleMotion(this.particles);
    
    // Añadir nuevas partículas generadas
    this.particles = this.particles.concat(result.particlesToAdd);
    
    // Eliminar partículas marcadas
    this.particles = this.particles.filter(p => !p.shouldRemove());
    
    // Actualizar gráficas
    this.chartManager.updateCharts(result.anodeHits, this.deltaT);
    
    // Actualizar visualización
    this.render();
    
    // Incrementar tiempo
    this.timeElapsed += this.deltaT;
    
    // Continuar bucle
    this.animationFrameId = requestAnimationFrame(() => this.updateSimulation());
  }
  
  /**
   * Renderiza el estado actual
   */
  render() {
    this.renderer.clear();
    
    // Dibujar campo eléctrico si está habilitado
    if (this.showElectricField) {
      this.renderer.drawElectricField(this.physicsSimulator, 40);
    }
    
    // Dibujar componentes
    this.components.forEach(component => {
      this.renderer.drawComponent(component);
    });
    
    // Dibujar capa de dibujo manual
    this.renderer.drawDrawingLayer(this.drawingLayer);
    
    // Dibujar partículas
    this.particles.forEach(particle => {
      this.renderer.drawParticle(particle);
    });
    
    // Dibujar indicador de modo
    this.renderer.drawModeIndicator(
      this.isSimulationMode ? 'simulation' : 'drawing',
      this.drawingMode
    );
  }
  
  /**
   * Cambia entre modo simulación y dibujo
   * @param {string} mode - 'simulation' o 'drawing'
   */
  setMode(mode) {
    this.isSimulationMode = (mode === 'simulation');
    
    // Si cambiamos a modo dibujo, pausar la simulación
    if (!this.isSimulationMode && this.animationFrameId) {
      this.stop();
    }
    
    this.render();
  }
  
  /**
   * Establece el modo de dibujo
   * @param {string} drawingMode - 'free', 'line', 'rectangle' o 'circle'
   */
  setDrawingMode(drawingMode) {
    this.drawingMode = drawingMode;
    this.render();
  }
  
  /**
   * Convierte la capa de dibujo en componentes
   */
  convertDrawingToComponents() {
    if (this.drawingLayer.length === 0) {
      return false;
    }
    
    // Calcular el bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    this.drawingLayer.forEach(stroke => {
      if (stroke.type === 'free') {
        stroke.points.forEach(point => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      } else {
        minX = Math.min(minX, stroke.start.x, stroke.end.x);
        minY = Math.min(minY, stroke.start.y, stroke.end.y);
        maxX = Math.max(maxX, stroke.start.x, stroke.end.x);
        maxY = Math.max(maxY, stroke.start.y, stroke.end.y);
      }
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Recolectar vértices para crear un polígono
    const vertices = [];
    this.drawingLayer.forEach(stroke => {
      if (stroke.type === 'free') {
        vertices.push(...stroke.points);
      } else if (stroke.type === 'rectangle') {
        vertices.push(
          { x: stroke.start.x, y: stroke.start.y },
          { x: stroke.end.x, y: stroke.start.y },
          { x: stroke.end.x, y: stroke.end.y },
          { x: stroke.start.x, y: stroke.end.y }
        );
      }
    });
    
    // Crear componente personalizado
    this.addComponent('custom', centerX, centerY, 0, '#808080', 'simple', vertices);
    
    // Limpiar dibujo
    this.drawingLayer = [];
    
    this.render();
    return true;
  }
  
  /**
   * Inicia un trazo al hacer clic
   * @param {number} x - Coordenada X del ratón
   * @param {number} y - Coordenada Y del ratón
   */
  startDrawing(x, y) {
    if (this.isSimulationMode) return;
    
    this.isDrawing = true;
    this.startX = x;
    this.startY = y;
    
    if (this.drawingMode === 'free') {
      this.drawingLayer.push({
        type: 'free',
        points: [{ x, y }],
        color: this.getCurrentBrushColor(),
        width: this.brushSize
      });
    }
    
    this.render();
  }
  
  /**
   * Continúa un trazo al mover el ratón
   * @param {number} x - Coordenada X del ratón
   * @param {number} y - Coordenada Y del ratón
   */
  continueDrawing(x, y) {
    if (!this.isDrawing || this.isSimulationMode) return;
    
    if (this.drawingMode === 'free') {
      const currentStroke = this.drawingLayer[this.drawingLayer.length - 1];
      currentStroke.points.push({ x, y });
    }
    
    this.render();
  }
  
  /**
   * Finaliza un trazo al soltar el ratón
   * @param {number} x - Coordenada X del ratón
   * @param {number} y - Coordenada Y del ratón
   */
  endDrawing(x, y) {
    if (!this.isDrawing || this.isSimulationMode) return;
    
    if (this.drawingMode !== 'free') {
      this.drawingLayer.push({
        type: this.drawingMode,
        start: { x: this.startX, y: this.startY },
        end: { x, y },
        color: this.getCurrentBrushColor(),
        width: this.brushSize
      });
    }
    
    this.isDrawing = false;
    this.render();
  }
  
  /**
   * Obtiene el color del pincel actual
   * @returns {string} - Color en formato hexadecimal
   */
  getCurrentBrushColor() {
    const brushColors = ['#000000', '#ff0000', '#0000ff'];
    return brushColors[this.currentBrush - 1] || '#000000';
  }
  
  /**
   * Cambia el pincel actual
   * @param {number} brushNumber - Número de pincel (1, 2, 3)
   */
  setBrush(brushNumber) {
    this.currentBrush = brushNumber;
  }
  
  /**
   * Establece el tamaño del pincel
   * @param {number} size - Tamaño del pincel en píxeles
   */
  setBrushSize(size) {
    this.brushSize = size;
  }
  
  /**
   * Limpia la capa de dibujo
   */
  clearDrawing() {
    this.drawingLayer = [];
    this.render();
  }
  
  /**
   * Carga una configuración completa
   * @param {Object} config - Configuración a cargar
   */
  loadConfiguration(config) {
    // Restaurar componentes
    this.components = [];
    for (const compConfig of config.components) {
      this.addComponent(
        compConfig.type,
        compConfig.x,
        compConfig.y,
        compConfig.voltage,
        compConfig.color,
        compConfig.model,
        compConfig.vertices
      );
    }
    
    // Restaurar dibujos
    this.drawingLayer = config.drawings || [];
    
    // Restaurar parámetros
    this.updateConfiguration({
      deltaT: config.deltaT,
      photonCount: config.photonCount,
      seed: config.seed,
      showTrajectories: config.showTrajectories
    });
    
    // Actualizar vista
    this.render();
  }
  
  /**
   * Exporta la configuración actual
   * @returns {Object} - Configuración completa
   */
  exportConfiguration() {
    return {
      components: this.components,
      drawings: this.drawingLayer,
      deltaT: this.deltaT,
      photonCount: this.photonCount,
      seed: this.seed,
      showTrajectories: this.showTrajectories
    };
  }
}

// Para compatibilidad con módulos ES y CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimulationController;
} else if (typeof window !== 'undefined') {
  window.SimulationController = SimulationController;
}