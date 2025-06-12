/**
 * Pruebas unitarias para la clase Particle
 */

// Importar la clase Particle
const Particle = require('../src/model/Particle.js');

describe('Clase Particle', () => {
  // Probar la inicialización de la partícula
  describe('Constructor', () => {
    test('debería inicializar correctamente un fotón', () => {
      const photon = new Particle('photon', 10, 20, 1, 2);
      
      expect(photon.type).toBe('photon');
      expect(photon.x).toBe(10);
      expect(photon.y).toBe(20);
      expect(photon.vx).toBe(1);
      expect(photon.vy).toBe(2);
      expect(photon.path).toEqual([{x: 10, y: 20}]);
      expect(photon.toRemove).toBe(false);
    });
    
    test('debería inicializar correctamente un electrón', () => {
      const electron = new Particle('electron', 5, 15, -1, -2);
      
      expect(electron.type).toBe('electron');
      expect(electron.x).toBe(5);
      expect(electron.y).toBe(15);
      expect(electron.vx).toBe(-1);
      expect(electron.vy).toBe(-2);
      expect(electron.path).toEqual([{x: 5, y: 15}]);
      expect(electron.toRemove).toBe(false);
    });
    
    test('debería permitir especificar una trayectoria personalizada', () => {
      const path = [{x: 1, y: 1}, {x: 2, y: 2}];
      const particle = new Particle('photon', 3, 3, 1, 1, path);
      
      expect(particle.path).toBe(path);
    });
  });
  
  // Probar la actualización de posición
  describe('updatePosition', () => {
    test('debería actualizar correctamente la posición', () => {
      const particle = new Particle('electron', 10, 20, 3, 4);
      
      particle.updatePosition();
      
      expect(particle.x).toBe(13);
      expect(particle.y).toBe(24);
      expect(particle.path).toEqual([{x: 10, y: 20}, {x: 13, y: 24}]);
    });
  });
  
  // Probar la actualización de velocidad
  describe('updateVelocity', () => {
    test('debería actualizar correctamente la velocidad', () => {
      const particle = new Particle('electron', 0, 0, 1, 2);
      
      particle.updateVelocity(2, 3);
      
      expect(particle.vx).toBe(3);
      expect(particle.vy).toBe(5);
    });
  });
  
  // Probar el cálculo de energía cinética
  describe('getKineticEnergy', () => {
    test('debería calcular correctamente la energía cinética', () => {
      const particle = new Particle('photon', 0, 0, 3, 4);
      
      const energy = particle.getKineticEnergy();
      
      // KE = 0.5 * (vx^2 + vy^2) = 0.5 * (9 + 16) = 0.5 * 25 = 12.5
      expect(energy).toBe(12.5);
    });
    
    test('debería retornar 0 para partículas estacionarias', () => {
      const particle = new Particle('electron', 0, 0, 0, 0);
      
      const energy = particle.getKineticEnergy();
      
      expect(energy).toBe(0);
    });
  });
  
  // Probar la marcación para eliminación
  describe('markForRemoval y shouldRemove', () => {
    test('debería marcar la partícula para eliminación', () => {
      const particle = new Particle('photon', 0, 0, 0, 0);
      
      particle.markForRemoval();
      
      expect(particle.toRemove).toBe(true);
      expect(particle.shouldRemove()).toBe(true);
    });
    
    test('shouldRemove debería retornar false inicialmente', () => {
      const particle = new Particle('electron', 0, 0, 0, 0);
      
      expect(particle.shouldRemove()).toBe(false);
    });
  });
  
  // Probar la generación de electrones
  describe('generateElectrons', () => {
    test('debería generar el número correcto de electrones', () => {
      const particle = new Particle('photon', 10, 20, 1, 1);
      
      const electrons = particle.generateElectrons(3.2); // Debería generar 3 electrones
      
      expect(electrons.length).toBe(3);
      electrons.forEach(electron => {
        expect(electron.type).toBe('electron');
        expect(electron.x).toBe(10);
        expect(electron.y).toBe(20);
        expect(electron.path[0]).toEqual({x: 10, y: 20});
      });
    });
    
    test('debería generar 0 electrones para gain < 1', () => {
      const particle = new Particle('photon', 10, 20, 1, 1);
      
      const electrons = particle.generateElectrons(0.5);
      
      expect(electrons.length).toBe(0);
    });
  });
});