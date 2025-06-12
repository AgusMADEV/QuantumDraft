/**
 * Pruebas unitarias para la clase Component
 */

// Importar la clase Component
const Component = require('../src/model/Component.js');

describe('Clase Component', () => {
  // Probar la inicialización del componente
  describe('Constructor', () => {
    test('debería inicializar correctamente un fotocátodo', () => {
      const photocathode = new Component('photocathode', 50, 100, -100, '#0000ff');
      
      expect(photocathode.type).toBe('photocathode');
      expect(photocathode.x).toBe(50);
      expect(photocathode.y).toBe(100);
      expect(photocathode.voltage).toBe(-100);
      expect(photocathode.color).toBe('#0000ff');
      expect(photocathode.model).toBe('simple');
      expect(photocathode.vertices).toBeNull();
    });
    
    test('debería inicializar correctamente un dinodo con modelo simple', () => {
      const dinode = new Component('dinode', 150, 100, 200, '#808080', 'simple');
      
      expect(dinode.type).toBe('dinode');
      expect(dinode.voltage).toBe(200);
      expect(dinode.model).toBe('simple');
      expect(dinode.params).toHaveProperty('r');
      expect(dinode.params).toHaveProperty('beta');
    });
    
    test('debería inicializar correctamente un componente con vértices personalizados', () => {
      const vertices = [{x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 10}, {x: 0, y: 10}];
      const custom = new Component('custom', 5, 5, 50, '#ff0000', 'simple', vertices);
      
      expect(custom.vertices).toBe(vertices);
    });
  });
  
  // Probar la inicialización de parámetros según el tipo
  describe('initializeParams', () => {
    test('debería establecer parámetros correctos para dinodos', () => {
      const dinode = new Component('dinode', 100, 100, 100, '#808080');
      
      // Parámetros modelo simple
      expect(dinode.params.r).toBe(2);
      expect(dinode.params.beta).toBe(0);
      
      // Parámetros modelo avanzado
      expect(dinode.params.phi_w).toBe(1);
      expect(dinode.params.phi_0).toBe(1);
      expect(dinode.params.sigma_E).toBe(2.2);
      expect(dinode.params.E_0).toBe(1);
      expect(dinode.params.alpha).toBe(1);
      expect(dinode.params.gamma).toBe(1);
      expect(dinode.params.lambda).toBe(1);
    });
    
    test('no debería establecer parámetros para componentes que no sean dinodos', () => {
      const anode = new Component('anode', 100, 100, 500, '#ff0000');
      
      expect(anode.params).toEqual({});
    });
  });
  
  // Probar el cálculo de ganancia
  describe('calculateGain', () => {
    test('debería calcular correctamente la ganancia con modelo simple', () => {
      const dinode = new Component('dinode', 100, 100, 100, '#808080', 'simple');
      dinode.params.r = 3;
      dinode.params.beta = 0.5;
      
      const gain = dinode.calculateGain(4);
      
      // gain = r * (deltaV)^beta = 3 * (4^0.5) = 3 * 2 = 6
      expect(gain).toBe(6);
    });
    
    test('debería calcular la ganancia con modelo avanzado', () => {
      const dinode = new Component('dinode', 100, 100, 100, '#808080', 'advanced');
      dinode.params.phi_w = 0.5;
      dinode.params.phi_0 = 2;
      dinode.params.E_0 = 2;
      dinode.params.alpha = 2;
      dinode.params.gamma = 2;
      dinode.params.lambda = 2;
      
      // Mockear Math.random para obtener un resultado predecible
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      const gain = dinode.calculateGain(10);
      
      // Con los valores dados y Math.random = 0.5, esperamos un valor específico
      // probability = Math.exp(-0.5/2) ≈ 0.7788
      // energy = 2 + (2.2 * 0.5) ≈ 3.1
      // gain = probability * energy * 2 * 2 * 2 ≈ 0.7788 * 3.1 * 8 ≈ 19.3
      expect(gain).toBeCloseTo(19.3, 1);
      
      // Restaurar Math.random
      mockRandom.mockRestore();
    });
    
    test('debería retornar 1 para modelos desconocidos', () => {
      const component = new Component('custom', 100, 100, 100, '#ff0000', 'unknown');
      
      const gain = component.calculateGain(5);
      
      expect(gain).toBe(1);
    });
  });
  
  // Probar la detección de colisiones
  describe('containsPoint', () => {
    test('debería detectar correctamente puntos dentro de un componente rectangular', () => {
      const component = new Component('dinode', 100, 100, 100, '#808080');
      
      // Punto central
      expect(component.containsPoint(100, 100)).toBe(true);
      
      // Puntos dentro del rectángulo (margen de 10px desde el centro)
      expect(component.containsPoint(95, 95)).toBe(true);
      expect(component.containsPoint(105, 105)).toBe(true);
      
      // Puntos fuera del rectángulo
      expect(component.containsPoint(85, 100)).toBe(false);
      expect(component.containsPoint(115, 100)).toBe(false);
      expect(component.containsPoint(100, 85)).toBe(false);
      expect(component.containsPoint(100, 115)).toBe(false);
    });
    
    test('debería detectar correctamente puntos dentro de un polígono personalizado', () => {
      const vertices = [
        {x: 100, y: 100},
        {x: 200, y: 100},
        {x: 200, y: 200},
        {x: 100, y: 200}
      ];
      const component = new Component('custom', 150, 150, 0, '#ff0000', 'simple', vertices);
      
      // Puntos dentro del polígono
      expect(component.containsPoint(150, 150)).toBe(true);
      expect(component.containsPoint(110, 110)).toBe(true);
      expect(component.containsPoint(190, 190)).toBe(true);
      
      // Puntos fuera del polígono
      expect(component.containsPoint(90, 150)).toBe(false);
      expect(component.containsPoint(210, 150)).toBe(false);
      expect(component.containsPoint(150, 90)).toBe(false);
      expect(component.containsPoint(150, 210)).toBe(false);
    });
  });
  
  // Probar algoritmo de punto en polígono
  describe('isPointInPolygon', () => {
    test('debería detectar correctamente si un punto está dentro de un polígono', () => {
      const component = new Component('custom', 0, 0, 0, '#ff0000');
      const vertices = [
        {x: 0, y: 0},
        {x: 10, y: 0},
        {x: 10, y: 10},
        {x: 0, y: 10}
      ];
      
      // Puntos dentro del polígono
      expect(component.isPointInPolygon({x: 5, y: 5}, vertices)).toBe(true);
      
      // Puntos fuera del polígono
      expect(component.isPointInPolygon({x: -5, y: 5}, vertices)).toBe(false);
      expect(component.isPointInPolygon({x: 15, y: 5}, vertices)).toBe(false);
    });
    
    test('debería manejar polígonos complejos', () => {
      const component = new Component('custom', 0, 0, 0, '#ff0000');
      // Polígono con forma de L
      const vertices = [
        {x: 0, y: 0},
        {x: 10, y: 0},
        {x: 10, y: 5},
        {x: 5, y: 5},
        {x: 5, y: 10},
        {x: 0, y: 10}
      ];
      
      // Puntos dentro del polígono
      expect(component.isPointInPolygon({x: 2, y: 2}, vertices)).toBe(true);
      expect(component.isPointInPolygon({x: 8, y: 2}, vertices)).toBe(true);
      expect(component.isPointInPolygon({x: 2, y: 8}, vertices)).toBe(true);
      
      // Puntos fuera del polígono
      expect(component.isPointInPolygon({x: 8, y: 8}, vertices)).toBe(false);
    });
  });
});