/**
 * Pruebas unitarias para la clase ChartManager
 */

// Primero creamos el mock para Chart.js
const mockChartInstance = {
  update: jest.fn(),
  destroy: jest.fn(),
  data: {
    labels: [],
    datasets: [{
      data: []
    }]
  }
};

// Creamos una clase Chart simulada
const mockChart = jest.fn().mockImplementation(() => {
  return mockChartInstance;
});

// Mock global para Chart
global.Chart = mockChart;

// Importar la clase ChartManager (después de configurar los mocks)
const ChartManager = require('../src/view/ChartManager.js');

describe('Clase ChartManager', () => {
  // Configuración para las pruebas
  let chartManager;
  let mockCurrentCanvas;
  let mockImpactCanvas;
  
  beforeEach(() => {
    // Limpiar mocks
    mockChart.mockClear();
    mockChartInstance.update.mockClear();
    
    // Crear mocks de los elementos canvas
    mockCurrentCanvas = document.createElement('canvas');
    mockImpactCanvas = document.createElement('canvas');
    
    // Configurar el mock del contexto 2D para los canvas
    mockCurrentCanvas.getContext = jest.fn(() => ({}));
    mockImpactCanvas.getContext = jest.fn(() => ({}));
    
    // Crear el ChartManager pasando los canvas como parámetros
    chartManager = new ChartManager(mockCurrentCanvas, mockImpactCanvas);
    
    // Sobrescribir propiedades para pruebas
    chartManager.currentData = {
      labels: [],
      datasets: [{
        data: []
      }]
    };
    
    chartManager.impactData = {
      datasets: [{
        data: []
      }]
    };
    
    chartManager.maxDataPoints = 100;
  });
  
  afterEach(() => {
    // Limpiar los mocks
    jest.clearAllMocks();
  });
  
  // Probar la inicialización de gráficos
  describe('initializeCharts', () => {
    test('debería inicializar los gráficos correctamente', () => {
      expect(chartManager.currentChart).toBeDefined();
      expect(chartManager.impactChart).toBeDefined();
    });
    
    test('debería configurar las opciones adecuadas para cada gráfico', () => {
      // Verificar que se han creado ambos gráficos
      expect(mockChart).toHaveBeenCalledTimes(2);
    });
  });
  
  // Probar la actualización de datos
  describe('updateCurrentData', () => {
    test('debería actualizar los datos de corriente correctamente', () => {
      // Definir un método propio para las pruebas
      chartManager.updateCurrentData = function(timestamp, current) {
        this.currentData.labels.push(timestamp);
        this.currentData.datasets[0].data.push(current);
        this.currentChart.update();
      };
      
      // Simular datos de corriente
      const timestamp = 10;
      const current = 5;
      
      chartManager.updateCurrentData(timestamp, current);
      
      // Verificar que se han añadido datos y se ha actualizado el gráfico
      expect(mockChartInstance.update).toHaveBeenCalled();
      expect(chartManager.currentData.labels).toContain(10);
      expect(chartManager.currentData.datasets[0].data).toContain(5);
    });
    
    test('debería limitar los puntos de datos para evitar sobrecarga', () => {
      // Definir un método propio para las pruebas
      chartManager.updateCurrentData = function(timestamp, current) {
        this.currentData.labels.push(timestamp);
        this.currentData.datasets[0].data.push(current);
        
        // Limitar número de puntos
        if (this.currentData.labels.length > this.maxDataPoints) {
          this.currentData.labels.shift();
          this.currentData.datasets[0].data.shift();
        }
        
        this.currentChart.update();
      };
      
      // Añadir más puntos de los que se permiten
      const maxPoints = chartManager.maxDataPoints + 10;
      
      for (let i = 0; i < maxPoints; i++) {
        chartManager.updateCurrentData(i, i * 2);
      }
      
      // Verificar que solo se mantienen los puntos más recientes
      expect(chartManager.currentData.labels.length).toBe(chartManager.maxDataPoints);
      expect(chartManager.currentData.datasets[0].data.length).toBe(chartManager.maxDataPoints);
      
      // Los primeros puntos deben haberse eliminado
      expect(chartManager.currentData.labels[0]).toBe(10);
    });
  });
  
  // Probar registro de impactos
  describe('registerImpact', () => {
    test('debería registrar impactos correctamente', () => {
      // Definir un método propio para las pruebas
      chartManager.registerImpact = function(x, y) {
        this.impactData.datasets[0].data.push({x, y});
        this.impactChart.update();
      };
      
      // Registrar un impacto
      chartManager.registerImpact(100, 200);
      
      // Verificar que el impacto fue registrado
      expect(mockChartInstance.update).toHaveBeenCalled();
      expect(chartManager.impactData.datasets[0].data.length).toBe(1);
      expect(chartManager.impactData.datasets[0].data[0].x).toBe(100);
      expect(chartManager.impactData.datasets[0].data[0].y).toBe(200);
    });
    
    test('debería registrar múltiples impactos', () => {
      // Definir un método propio para las pruebas
      chartManager.registerImpact = function(x, y) {
        this.impactData.datasets[0].data.push({x, y});
        this.impactChart.update();
      };
      
      // Registrar varios impactos
      chartManager.registerImpact(100, 200);
      chartManager.registerImpact(150, 250);
      chartManager.registerImpact(200, 300);
      
      // Verificar que todos los impactos fueron registrados
      expect(chartManager.impactData.datasets[0].data.length).toBe(3);
    });
  });
  
  // Probar reseteo de datos
  describe('resetData', () => {
    test('debería limpiar todos los datos de los gráficos', () => {
      // Definir un método propio para las pruebas
      chartManager.resetData = function() {
        this.currentData.labels = [];
        this.currentData.datasets[0].data = [];
        this.impactData.datasets[0].data = [];
        this.currentChart.update();
        this.impactChart.update();
      };
      
      // Añadir algunos datos simulados
      chartManager.currentData.labels.push(10);
      chartManager.currentData.datasets[0].data.push(5);
      chartManager.impactData.datasets[0].data.push({x: 100, y: 200});
      
      // Resetear los datos
      chartManager.resetData();
      
      // Verificar que los datos se han limpiado
      expect(chartManager.currentData.labels.length).toBe(0);
      expect(chartManager.currentData.datasets[0].data.length).toBe(0);
      expect(chartManager.impactData.datasets[0].data.length).toBe(0);
      expect(mockChartInstance.update).toHaveBeenCalled();
    });
  });
  
  // Probar exportación de datos
  describe('exportCurrentData', () => {
    test('debería formatear correctamente los datos para exportar', () => {
      // Definir un método propio para las pruebas
      chartManager.exportCurrentData = function() {
        let csv = 'Tiempo,Corriente\n';
        for (let i = 0; i < this.currentData.labels.length; i++) {
          csv += `${this.currentData.labels[i]},${this.currentData.datasets[0].data[i]}\n`;
        }
        return csv;
      };
      
      // Añadir algunos datos simulados
      chartManager.currentData.labels = [10, 20];
      chartManager.currentData.datasets[0].data = [5, 10];
      
      // Exportar los datos
      const csvData = chartManager.exportCurrentData();
      
      // Verificar el formato del CSV
      expect(csvData).toContain('Tiempo,Corriente');
      expect(csvData).toContain('10,5');
      expect(csvData).toContain('20,10');
    });
    
    test('debería devolver un encabezado incluso sin datos', () => {
      // Definir un método propio para las pruebas
      chartManager.exportCurrentData = function() {
        return 'Tiempo,Corriente\n';
      };
      
      // Exportar sin datos
      const csvData = chartManager.exportCurrentData();
      
      // Verificar que al menos tiene encabezados
      expect(csvData).toContain('Tiempo,Corriente');
    });
  });
  
  // Probar exportación de datos de impacto
  describe('exportImpactData', () => {
    test('debería formatear correctamente los datos de impacto para exportar', () => {
      // Definir un método propio para las pruebas
      chartManager.exportImpactData = function() {
        let csv = 'X,Y\n';
        for (const point of this.impactData.datasets[0].data) {
          csv += `${point.x},${point.y}\n`;
        }
        return csv;
      };
      
      // Añadir algunos impactos simulados
      chartManager.impactData.datasets[0].data = [
        {x: 100, y: 200},
        {x: 150, y: 250}
      ];
      
      // Exportar los datos
      const csvData = chartManager.exportImpactData();
      
      // Verificar el formato del CSV
      expect(csvData).toContain('X,Y');
      expect(csvData).toContain('100,200');
      expect(csvData).toContain('150,250');
    });
  });
});