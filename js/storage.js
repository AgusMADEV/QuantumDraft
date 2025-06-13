// ===================================================================
// GUARDADO Y CARGA DE DATOS - Simulador Fotomultiplicador 2D
// ===================================================================

// Guardar configuración
function saveConfiguration() {
    const config = {
        pmtConfig: pmtConfig,
        timestamp: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmt-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Cargar configuración
function loadConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const config = JSON.parse(e.target.result);
                    pmtConfig = config.pmtConfig || config;
                    updateDynodeTable();
                    engine.render();
                } catch (error) {
                    alert('Error al cargar la configuración: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Exportar resultados en formato JSON
function exportResults() {
    const results = {
        statistics: simulationState.statistics,
        configuration: pmtConfig,
        timestamp: new Date().toISOString(),
        photonPaths: simulationState.photons.map(p => ({
            id: p.id,
            generation: p.generation,
            path: p.path,
            energy: p.energy
        }))
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmt-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Exportar resultados en formato CSV
function exportResultsCSV() {
    // Preparar encabezados
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Información de configuración
    csvContent += "# Configuración del Simulador PMT\n";
    csvContent += `# Fecha y hora: ${new Date().toISOString()}\n`;
    csvContent += `# Modelo: ${pmtConfig.amplificationModel}\n`;
    csvContent += `# Número de dinodos: ${pmtConfig.dynodes.filter(d => d.type === 'dynode').length}\n\n`;
    
    // Estadísticas generales
    csvContent += "# ESTADÍSTICAS GENERALES\n";
    csvContent += "Métrica,Valor\n";
    csvContent += `Fotones totales,${simulationState.statistics.totalPhotons}\n`;
    csvContent += `Fotones detectados,${simulationState.statistics.detectedPhotons}\n`;
    csvContent += `Eficiencia cuántica (%),${simulationState.statistics.quantumEfficiency.toFixed(2)}\n`;
    csvContent += `Ganancia promedio,${simulationState.statistics.averageGain.toFixed(2)}\n`;
    csvContent += `Tiempo de tránsito (ns),${simulationState.statistics.transitTime.toFixed(2)}\n\n`;
    
    // Configuración de dinodos
    csvContent += "# CONFIGURACIÓN DE DINODOS\n";
    csvContent += "Número,Tipo,Voltaje (V),Ganancia\n";
    
    pmtConfig.dynodes.forEach((dynode, index) => {
        const gain = calculateDynodeGain ? calculateDynodeGain(dynode, index) : 1.0;
        csvContent += `${index + 1},${dynode.type},${dynode.voltage},${gain.toFixed(2)}\n`;
    });
    
    // Datos de trayectoria si hay fotones
    if (simulationState.photons.length > 0) {
        csvContent += "\n# TRAYECTORIAS DE PARTÍCULAS\n";
        csvContent += "ID,Generación,Tiempo (ms),PosX,PosY,Energía (eV)\n";
        
        simulationState.photons.forEach(photon => {
            photon.path.forEach(point => {
                csvContent += `${photon.id},${photon.generation},${point.t * 1000},${point.x},${point.y},${photon.energy}\n`;
            });
        });
    }
    
    // Generar descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pmt-data-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}