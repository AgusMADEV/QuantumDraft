/**
 * Clase PhysicsSimulator - Encapsula la lógica de física de la simulación fotovoltaica
 * Gestiona el cálculo del campo eléctrico y las interacciones entre partículas y componentes
 */

class PhysicsSimulator {
  /**
   * Constructor del simulador de física
   * @param {Array} components - Componentes del fotomultiplicador
   */
  constructor(components = []) {
    this.components = components;
    // Constante de Coulomb (k) en unidades arbitrarias
    this.COULOMB_CONSTANT = 8.9875517923e9; // N·m²/C²
    this.MAX_PARTICLES = 1000; // Límite de partículas para control de rendimiento
    this.deltaT = 0.1; // Paso de tiempo para la simulación
    this.enableField = true; // Habilitar/deshabilitar campo eléctrico
    this.enableMagneticField = false; // Habilitar/deshabilitar campo magnético
    this.magneticField = { bx: 0, by: 0, bz: 0 }; // Campo magnético default
  }

  /**
   * Actualiza la lista de componentes
   * @param {Array} components - Nueva lista de componentes
   */
  setComponents(components) {
    this.components = components;
  }

  /**
   * Establece el paso de tiempo para la simulación
   * @param {number} dt - Paso de tiempo
   */
  setDeltaT(dt) {
    this.deltaT = dt;
  }

  /**
   * Habilita o deshabilita el cálculo del campo eléctrico
   * @param {boolean} enable - True para habilitar, false para deshabilitar
   */
  setEnableField(enable) {
    this.enableField = enable;
  }
  
  /**
   * Establece el valor del campo magnético
   * @param {number} bx - Componente x del campo magnético
   * @param {number} by - Componente y del campo magnético
   * @param {number} bz - Componente z del campo magnético
   */
  setMagneticField(bx, by, bz) {
    this.magneticField = { bx, by, bz };
  }
  
  /**
   * Habilita o deshabilita el campo magnético
   * @param {boolean} enable - True para habilitar, false para deshabilitar
   */
  setEnableMagneticField(enable) {
    this.enableMagneticField = enable;
  }
  
  /**
   * Obtiene el campo magnético actual
   * @returns {Object} - Componentes del campo magnético {bx, by, bz}
   */
  getMagneticField() {
    if (!this.enableMagneticField) {
      return { bx: 0, by: 0, bz: 0 };
    }
    return this.magneticField;
  }
  
  /**
   * Calcula el campo eléctrico en un punto dado
   * @param {number} x - Coordenada X del punto
   * @param {number} y - Coordenada Y del punto
   * @returns {Object} - Componentes del campo eléctrico {ex, ey}
   */
  calculateElectricField(x, y) {
    // Si el campo está deshabilitado, retornar cero
    if (!this.enableField) {
      return { ex: 0, ey: 0 };
    }
    
    // Vector de posición donde calculamos el campo
    const pos = { x, y };
    
    // Inicializar componentes del campo
    let ex = 0;
    let ey = 0;
    
    // Sumar contribuciones de cada componente
    for (const comp of this.components) {
      // Vector desde el componente hasta el punto
      const dx = pos.x - comp.x;
      const dy = pos.y - comp.y;
      
      // Distancia al cuadrado (para la ley de Coulomb)
      const distanceSquared = dx * dx + dy * dy;
      
      // Evitar división por cero
      if (distanceSquared < 0.0001) continue;
      
      // Magnitud del campo según la ley de Coulomb
      const fieldMagnitude = this.COULOMB_CONSTANT * comp.voltage / distanceSquared;
      
      // Componentes del vector unitario
      const distance = Math.sqrt(distanceSquared);
      const unitX = dx / distance;
      const unitY = dy / distance;
      
      // Contribución al campo total
      ex += fieldMagnitude * unitX;
      ey += fieldMagnitude * unitY;
    }
    
    return { ex, ey };
  }

  /**
   * Aplica el algoritmo de Boris para actualizar partículas considerando campos EM
   * @param {Particle} particle - Partícula a actualizar
   */
  applyBorisAlgorithm(particle) {
    if (particle.type !== 'electron' && particle.type !== 'ion') return;
    
    // Obtener campos
    const e = this.calculateElectricField(particle.x, particle.y);
    const b = this.getMagneticField();
    
    // Carga y masa (utilizamos valores normalizados para electrones)
    const q = particle.type === 'electron' ? -1 : 1;
    const m = particle.mass || 1;
    
    // Vector de campos
    const E = [e.ex, e.ey, 0]; // Convertimos a vector 3D
    const B = [b.bx, b.by, b.bz];
    
    // Velocidad actual
    const v = [particle.vx, particle.vy, 0];
    
    // Implementación simplificada del algoritmo de Boris
    const dt = this.deltaT;
    const qdt_2m = (q * dt) / (2 * m);
    
    // Medio impulso desde el campo eléctrico
    const v_minus = [
      v[0] + E[0] * qdt_2m,
      v[1] + E[1] * qdt_2m,
      v[2] + E[2] * qdt_2m
    ];
    
    // Rotación magnética
    if (this.enableMagneticField) {
      const t = [
        B[0] * qdt_2m,
        B[1] * qdt_2m,
        B[2] * qdt_2m
      ];
      
      // Magnitud de t al cuadrado
      const t2 = t[0]*t[0] + t[1]*t[1] + t[2]*t[2];
      
      // Coeficiente s para la rotación
      const s = 2 / (1 + t2);
      
      // Vector v' (primera parte de la rotación)
      const v_prime = [
        v_minus[0] + v_minus[1]*t[2] - v_minus[2]*t[1],
        v_minus[1] + v_minus[2]*t[0] - v_minus[0]*t[2],
        v_minus[2] + v_minus[0]*t[1] - v_minus[1]*t[0]
      ];
      
      // Vector v+ (final de la rotación)
      v_minus[0] = v_minus[0] + s * (v_prime[1]*t[2] - v_prime[2]*t[1]);
      v_minus[1] = v_minus[1] + s * (v_prime[2]*t[0] - v_prime[0]*t[2]);
      v_minus[2] = v_minus[2] + s * (v_prime[0]*t[1] - v_prime[1]*t[0]);
    }
    
    // Medio impulso final desde campo eléctrico
    const v_plus = [
      v_minus[0] + E[0] * qdt_2m,
      v_minus[1] + E[1] * qdt_2m,
      v_minus[2] + E[2] * qdt_2m
    ];
    
    // Actualizar velocidades
    particle.vx = v_plus[0];
    particle.vy = v_plus[1];
  }

  /**
   * Verifica si una partícula colisiona con algún componente
   * @param {Particle} particle - Partícula a verificar
   * @returns {Component|null} - Componente con el que colisiona o null
   */
  checkCollision(particle) {
    for (const component of this.components) {
      if (component.containsPoint(particle.x, particle.y)) {
        return component;
      }
    }
    return null;
  }

  /**
   * Procesa la colisión entre una partícula y un componente
   * @param {Particle} particle - Partícula que colisiona
   * @param {Component} component - Componente con el que colisiona
   * @returns {Object} - Resultado de la colisión
   */
  processCollision(particle, component) {
    const result = {
      newParticles: [],
      removeOriginal: false,
      impact: false,
      impactLocation: null
    };

    // No procesar tipos desconocidos
    if (!particle || !component) {
      return result;
    }

    // Fotón colisiona con fotocátodo: genera un electrón
    if (particle.type === 'photon' && component.type === 'photocathode') {
      const electron = new Particle(
        'electron',
        particle.x,
        particle.y,
        1, // Velocidad inicial en X
        0, // Velocidad inicial en Y
        [{x: particle.x, y: particle.y}]
      );
      result.newParticles.push(electron);
      result.removeOriginal = true;
    }
    
    // Electrón colisiona con dinodo: genera electrones secundarios
    else if (particle.type === 'electron' && component.type === 'dinode') {
      const deltaV = Math.abs(component.voltage);
      const gain = component.calculateGain ? component.calculateGain(deltaV) : 3;
      
      const newElectrons = particle.generateElectrons ? 
                          particle.generateElectrons(gain) : 
                          this.generateSecondaryElectrons(particle, gain);
      result.newParticles.push(...newElectrons);
      result.removeOriginal = true;
    }
    
    // Electrón colisiona con ánodo: registrar impacto
    else if (particle.type === 'electron' && component.type === 'anode') {
      result.impact = true;
      result.impactLocation = { x: particle.x, y: particle.y };
      result.removeOriginal = true;
    }
    
    return result;
  }

  /**
   * Genera electrones secundarios (alternativa para cuando Particle no implementa el método)
   * @param {Particle} particle - Partícula primaria
   * @param {number} gain - Ganancia (número de electrones a generar)
   * @returns {Array} - Lista de nuevas partículas
   */
  generateSecondaryElectrons(particle, gain) {
    const electrons = [];
    const count = Math.round(gain);
    
    for (let i = 0; i < count; i++) {
      // Generar velocidades aleatorias con distribución hacia abajo
      const angle = (Math.random() * Math.PI) - Math.PI/2; // Entre -90° y +90°
      const speed = 1 + Math.random() * 2; // Entre 1 y 3
      
      const vx = speed * Math.cos(angle);
      const vy = speed * Math.sin(angle);
      
      const electron = new Particle(
        'electron',
        particle.x,
        particle.y,
        vx,
        vy,
        [{x: particle.x, y: particle.y}]
      );
      
      electrons.push(electron);
    }
    
    return electrons;
  }

  /**
   * Calcula la energía cinética total de todas las partículas
   * @param {Array<Particle>} particles - Lista de partículas
   * @returns {number} - Energía cinética total
   */
  calculateTotalEnergy(particles) {
    if (!particles || particles.length === 0) {
      return 0;
    }
    
    let totalEnergy = 0;
    
    for (const particle of particles) {
      // Calcular energía cinética: KE = 0.5 * m * v^2
      const vSquared = particle.vx * particle.vx + particle.vy * particle.vy;
      const mass = particle.mass || 1; // usar masa = 1 si no está definida
      
      const particleEnergy = 0.5 * mass * vSquared;
      totalEnergy += particleEnergy;
    }
    
    return totalEnergy;
  }

  /**
   * Actualiza el movimiento de todas las partículas y gestiona colisiones
   * @param {Array<Particle>} particles - Lista de partículas a actualizar
   * @returns {Array} - Información sobre impactos en el ánodo
   */
  updateParticleMotion(particles) {
    const impacts = [];
    const particlesToAdd = [];
    const particlesToRemove = [];
    
    // Recorrer todas las partículas y actualizar su posición
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      
      if (particle.type === 'electron' || particle.type === 'ion') {
        // Aplicar el algoritmo de Boris para la actualización EM
        this.applyBorisAlgorithm(particle);
      } else {
        // Para otros tipos de partículas, simplemente actualizar posición
        particle.updatePosition();
      }
      
      // Detectar colisiones con componentes
      const collidedComponent = this.checkCollision(particle);
      if (collidedComponent) {
        const collisionResult = this.processCollision(particle, collidedComponent);
        
        if (collisionResult.newParticles.length > 0) {
          particlesToAdd.push(...collisionResult.newParticles);
        }
        
        if (collisionResult.removeOriginal) {
          particlesToRemove.push(i);
        }
        
        if (collisionResult.impact) {
          impacts.push({
            x: collisionResult.impactLocation.x,
            y: collisionResult.impactLocation.y,
            time: Date.now(),
            energy: particle.energy || 1
          });
        }
      }
      
      // Eliminar partículas que salen del área visible
      const margin = 100; // margen extra para no eliminar partículas justo en el borde
      if (
        particle.x < -margin || 
        particle.x > 1000 + margin || 
        particle.y < -margin || 
        particle.y > 600 + margin
      ) {
        particlesToRemove.push(i);
      }
    }
    
    // Eliminar partículas marcadas para eliminar (en orden inverso para no afectar índices)
    particlesToRemove.sort((a, b) => b - a);
    for (const index of particlesToRemove) {
      particles.splice(index, 1);
    }
    
    // Agregar nuevas partículas generadas
    particles.push(...particlesToAdd);
    
    // Limitar número total de partículas para control de rendimiento
    if (particles.length > this.MAX_PARTICLES) {
      particles.splice(0, particles.length - this.MAX_PARTICLES);
    }
    
    return impacts;
  }
}

// Asegurar que PhysicsSimulator esté disponible globalmente
if (typeof window !== 'undefined') {
  window.PhysicsSimulator = PhysicsSimulator;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhysicsSimulator;
}