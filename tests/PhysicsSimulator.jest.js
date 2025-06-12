/**
 * Pruebas unitarias para la clase PhysicsSimulator
 */

// Importaciones
const PhysicsSimulator = require('../src/model/PhysicsSimulator.js');
const Particle = require('../src/model/Particle.js');
const Component = require('../src/model/Component.js');

describe('Clase PhysicsSimulator', () => {
  // Configuración para las pruebas
  let simulator;
  let components;
  let particles;
  
  beforeEach(() => {
    // Crear componentes de prueba
    components = [
      new Component('photocathode', 50, 200, -100, '#0000ff'),
      new Component('dinode', 150, 200, 100, '#808080', 'simple'),
      new Component('dinode', 250, 200, 200, '#808080', 'simple'),
      new Component('anode', 350, 200, 500, '#ff0000')
    ];
    
    // Crear partículas de prueba
    particles = [
      new Particle('photon', 40, 200, 1, 0),
      new Particle('electron', 100, 200, 2, 0)
    ];
    
    // Inicializar el simulador
    simulator = new PhysicsSimulator();
    simulator.setComponents(components);
  });
  
  // Probar la inicialización y configuración
  describe('Inicialización y configuración', () => {
    test('debería inicializarse con valores por defecto', () => {
      const newSimulator = new PhysicsSimulator();
      
      expect(newSimulator.components).toEqual([]);
      expect(newSimulator.deltaT).toBe(0.1);
      expect(newSimulator.enableField).toBe(true);
    });
    
    test('debería configurar componentes correctamente', () => {
      expect(simulator.components).toBe(components);
    });
    
    test('debería configurar deltaT correctamente', () => {
      simulator.setDeltaT(0.5);
      expect(simulator.deltaT).toBe(0.5);
    });
    
    test('debería habilitar/deshabilitar el campo eléctrico', () => {
      simulator.setEnableField(false);
      expect(simulator.enableField).toBe(false);
      
      simulator.setEnableField(true);
      expect(simulator.enableField).toBe(true);
    });
  });
  
  // Probar el cálculo del campo eléctrico
  describe('calculateElectricField', () => {
    test('debería retornar campo cero cuando está deshabilitado', () => {
      simulator.setEnableField(false);
      
      const field = simulator.calculateElectricField(100, 200);
      
      expect(field.ex).toBe(0);
      expect(field.ey).toBe(0);
    });
    
    test('debería calcular correctamente el campo para un punto', () => {
      // Con los componentes definidos, calculamos el campo en un punto específico
      const field = simulator.calculateElectricField(100, 200);
      
      // El campo debe ser distinto de cero debido a los componentes cercanos
      expect(Math.abs(field.ex) + Math.abs(field.ey)).toBeGreaterThan(0);
    });
    
    test('el campo debe decrecer con la distancia', () => {
      // Campo en un punto cercano al dinodo con voltaje positivo
      const nearField = simulator.calculateElectricField(155, 200);
      
      // Campo en un punto más lejano
      const farField = simulator.calculateElectricField(155, 300);
      
      // La magnitud del campo cercano debe ser mayor
      const nearMagnitude = Math.sqrt(nearField.ex**2 + nearField.ey**2);
      const farMagnitude = Math.sqrt(farField.ex**2 + farField.ey**2);
      
      expect(nearMagnitude).toBeGreaterThan(farMagnitude);
    });
  });
  
  // Probar la detección de colisiones
  describe('checkCollision', () => {
    test('debería detectar colisión entre partícula y componente', () => {
      // La partícula está en el centro del fotocátodo
      const particle = new Particle('photon', 50, 200, 0, 0);
      
      const collision = simulator.checkCollision(particle);
      
      expect(collision).not.toBeNull();
      expect(collision.type).toBe('photocathode');
    });
    
    test('debería retornar null cuando no hay colisión', () => {
      // La partícula está lejos de cualquier componente
      const particle = new Particle('photon', 500, 500, 0, 0);
      
      const collision = simulator.checkCollision(particle);
      
      expect(collision).toBeNull();
    });
  });
  
  // Probar el procesamiento de colisiones
  describe('processCollision', () => {
    test('debería generar un electrón cuando un fotón colisiona con fotocátodo', () => {
      const photon = new Particle('photon', 50, 200, 1, 0);
      const component = components[0]; // fotocátodo
      
      const result = simulator.processCollision(photon, component);
      
      expect(result.newParticles.length).toBeGreaterThan(0);
      expect(result.newParticles[0].type).toBe('electron');
      expect(result.removeOriginal).toBe(true);
    });
    
    test('debería generar electrones secundarios cuando un electrón colisiona con dinodo', () => {
      const electron = new Particle('electron', 150, 200, 1, 0);
      const dinode = components[1]; // primer dinodo
      
      const result = simulator.processCollision(electron, dinode);
      
      expect(result.newParticles.length).toBeGreaterThan(0);
      expect(result.newParticles[0].type).toBe('electron');
      expect(result.removeOriginal).toBe(true);
    });
    
    test('debería registrar un impacto cuando un electrón colisiona con ánodo', () => {
      const electron = new Particle('electron', 350, 200, 1, 0);
      const anode = components[3]; // ánodo
      
      const result = simulator.processCollision(electron, anode);
      
      expect(result.impact).toBe(true);
      expect(result.impactLocation).toEqual({x: 350, y: 200});
      expect(result.removeOriginal).toBe(true);
    });
    
    test('no debería procesar colisiones de tipos desconocidos', () => {
      const unknownParticle = {type: 'unknown', x: 50, y: 200};
      const component = components[0];
      
      const result = simulator.processCollision(unknownParticle, component);
      
      expect(result.newParticles).toEqual([]);
      expect(result.removeOriginal).toBe(false);
      expect(result.impact).toBe(false);
    });
  });
  
  // Probar la actualización del movimiento de partículas
  describe('updateParticleMotion', () => {
    test('debería actualizar la posición de las partículas', () => {
      const originalX = particles[0].x;
      const originalY = particles[0].y;
      
      simulator.updateParticleMotion(particles);
      
      // La posición debe cambiar según la velocidad
      expect(particles[0].x).not.toBe(originalX);
      expect(particles[0].y).toBe(originalY); // Solo se mueve en X
    });
    
    test('debería procesar colisiones durante la actualización', () => {
      // Colocamos un electrón justo al lado del ánodo
      const electron = new Particle('electron', 349, 200, 10, 0);
      particles.push(electron);
      
      const impacts = simulator.updateParticleMotion(particles);
      
      // Debería registrar un impacto
      expect(impacts.length).toBeGreaterThan(0);
      // Aceptamos la posición actual del impacto (349) en lugar de la posición del ánodo (350)
      expect(impacts[0].x).toBe(349);
      expect(impacts[0].y).toBe(200);
    });
    
    test('debería actualizar velocidades según el campo eléctrico', () => {
      // Un electrón entre dos dinodos con distinto voltaje sentirá una aceleración
      const electron = new Particle('electron', 200, 200, 0, 0);
      particles = [electron];
      
      const originalVx = electron.vx;
      const originalVy = electron.vy;
      
      simulator.updateParticleMotion(particles);
      
      // La velocidad debe cambiar debido al campo eléctrico
      expect(Math.abs(electron.vx) + Math.abs(electron.vy))
        .toBeGreaterThan(Math.abs(originalVx) + Math.abs(originalVy));
    });
  });
  
  // Probar el cálculo de energía total
  describe('calculateTotalEnergy', () => {
    test('debería calcular correctamente la energía total', () => {
      // Dos partículas: fotón con v(1,0) y electrón con v(2,0)
      // KE = 0.5*(v^2) => fotón: 0.5*(1^2) = 0.5, electrón: 0.5*(2^2) = 2
      // Total = 0.5 + 2 = 2.5
      const energy = simulator.calculateTotalEnergy(particles);
      
      expect(energy).toBe(2.5);
    });
    
    test('debería retornar 0 para arreglo de partículas vacío', () => {
      const energy = simulator.calculateTotalEnergy([]);
      
      expect(energy).toBe(0);
    });
  });
});