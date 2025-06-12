/**
 * Clase ChartManager - Gestiona las gráficas de datos en tiempo real
 */
class ChartManager {
  /**
   * Constructor del gestor de gráficas
   * @param {HTMLCanvasElement} currentChartCanvas - Canvas para la gráfica de corriente
   * @param {HTMLCanvasElement} impactChartCanvas - Canvas para la gráfica de impactos
   */
  constructor(currentChartCanvas, impactChartCanvas) {
    this.currentChartCanvas = currentChartCanvas;
    this.impactChartCanvas = impactChartCanvas;
    this.currentChart = null;
    this.impactChart = null;
    this.timeElapsed = 0;
    
    this.initCharts();
  }

  /**
   * Inicializa las gráficas con configuración para Bootstrap
   */
  initCharts() {
    // Gráfica de corriente (electrones/segundo)
    const currentChartCtx = this.currentChartCanvas.getContext('2d');
    this.currentChart = new Chart(currentChartCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Corriente (electrones/s)',
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.2)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true },
          x: { 
            title: {
              display: true,
              text: 'Tiempo (s)'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.y.toFixed(2)} e⁻/s`;
              }
            }
          },
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Corriente vs Tiempo'
          }
        }
      }
    });

    // Gráfica de impactos (distribución espacial)
    const impactChartCtx = this.impactChartCanvas.getContext('2d');
    this.impactChart = new Chart(impactChartCtx, {
      type: 'scatter',
      data: { 
        datasets: [{ 
          label: 'Impactos', 
          data: [], 
          backgroundColor: 'rgba(255, 99, 132, 1)' 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Posición X'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Intensidad'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Posición: ${context.parsed.x.toFixed(2)}, Intensidad: ${context.parsed.y.toFixed(2)}`;
              }
            }
          },
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Distribución de Impactos'
          }
        }
      }
    });
  }

  /**
   * Actualiza las gráficas con nuevos datos
   * @param {Array} hits - Arreglo de impactos en el ánodo
   * @param {number} deltaT - Incremento de tiempo
   */
  updateCharts(hits, deltaT) {
    // Incrementar tiempo
    this.timeElapsed += deltaT;
    
    // Graficar corriente
    this.currentChart.data.labels.push(this.timeElapsed.toFixed(2));
    this.currentChart.data.datasets[0].data.push(hits.length);
    
    // Limitar datos para rendimiento (máximo 100 puntos)
    if (this.currentChart.data.labels.length > 100) {
      this.currentChart.data.labels.shift();
      this.currentChart.data.datasets[0].data.shift();
    }
    
    this.currentChart.update();
    
    // Graficar impactos espaciales
    hits.forEach(hit => {
      this.impactChart.data.datasets[0].data.push({ x: hit.x, y: 1 });
    });
    
    // Limitar datos para rendimiento (máximo 1000 puntos)
    if (this.impactChart.data.datasets[0].data.length > 1000) {
      this.impactChart.data.datasets[0].data = 
        this.impactChart.data.datasets[0].data.slice(-1000);
    }
    
    this.impactChart.update();
  }

  /**
   * Reinicia las gráficas
   */
  resetCharts() {
    this.timeElapsed = 0;
    
    if (this.currentChart) {
      this.currentChart.data.labels = [];
      this.currentChart.data.datasets[0].data = [];
      this.currentChart.update();
    }
    
    if (this.impactChart) {
      this.impactChart.data.datasets[0].data = [];
      this.impactChart.update();
    }
  }
  
  /**
   * Añade una serie de datos adicional a la gráfica de corriente
   * @param {string} label - Etiqueta para la nueva serie
   * @param {string} color - Color para la nueva serie (formato rgba)
   */
  addCurrentSeries(label, color) {
    this.currentChart.data.datasets.push({
      label: label,
      data: [],
      borderColor: color,
      tension: 0.1,
      fill: false
    });
    
    this.currentChart.update();
  }
  
  /**
   * Exporta los datos de las gráficas a CSV
   */
  exportData() {
    // Datos de corriente
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tiempo,Corriente\n";
    
    const labels = this.currentChart.data.labels;
    const data = this.currentChart.data.datasets[0].data;
    
    for (let i = 0; i < labels.length; i++) {
      csvContent += `${labels[i]},${data[i]}\n`;
    }
    
    // Crear enlace para descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "simulation_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Para compatibilidad con módulos ES y CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartManager;
} else if (typeof window !== 'undefined') {
  window.ChartManager = ChartManager;
}