# Checklist del Proyecto QuantumDraft - Simulador de Fotomultiplicador 2D

## ✅ Ya implementado

### Interfaz de usuario
- ✅ Interfaz principal con tres columnas (controles, canvas, tabla de dinodos)
- ✅ Canvas para visualización de la simulación
- ✅ Controles para configurar elementos principales (fotocátodo, acelerador, grid, ánodo)
- ✅ Botones para controlar la simulación (inicio, pausa, detención)
- ✅ Herramientas de dibujo (rectángulo, elipse, polígono, selección)
- ✅ Panel de estadísticas de simulación
- ✅ Opciones para guardar/cargar configuraciones
- ✅ Exportación de resultados (JSON, CSV)

### Elementos del fotomultiplicador
- ✅ Fotocátodo (obligatorio)
- ✅ Dinodos (configurables, 4-20)
- ✅ Acelerador (opcional)
- ✅ Grid (opcional)
- ✅ Ánodo (obligatorio)

### Modelo físico
- ✅ Modelo simple de amplificación (r*DiferenciaVoltaje^beta)
- ✅ Modelo avanzado de amplificación (8 parámetros)
- ✅ Simulación de fotones/electrones con física básica
- ✅ Cálculo y visualización de campos eléctricos
- ✅ Gestión de colisiones entre partículas y elementos
- ✅ Sistema de trazas para seguimiento de partículas
- ✅ Pool de objetos para gestión eficiente de partículas

### Generación y visualización
- ✅ Generación de fotones iniciales desde el fotocátodo
- ✅ Visualización de las trazas de partículas
- ✅ Efectos visuales para impactos en elementos
- ✅ Control de velocidad de simulación
- ✅ Botón "play" para iniciar emisión de fotones
- ✅ Configuración de número de fotones iniciales

## 🔲 Pendiente por implementar

### Modelo físico avanzado
- 🔲 Integrar ecuaciones de movimiento del archivo Matlab proporcionado
- 🔲 Mejorar cálculo de campos eléctricos (posiblemente usando librerías externas)
- 🔲 Implementar física relativista completa para partículas de alta energía

### Configuración y geometría
- 🔲 Permitir cargar geometrías en formato JSON
- 🔲 Reorganizar el formato de geometrías a JSON como solicitado
- 🔲 Cargar voltajes automáticamente desde archivo
- 🔲 Implementar todas las características específicas por tipo de elemento en la tabla

### Mejoras en la interfaz de usuario
- 🔲 Mejorar la tabla de dinodos con todas las características solicitadas
- 🔲 Checkbox para activar/desactivar grid y acelerador en la tabla
- 🔲 Mostrar elementos opcionales en gris cuando están desactivados
- 🔲 Mejorar visualización de errores y validaciones
- 🔲 Implementación completa del sistema de archivos para guardar/cargar configuraciones

### Optimizaciones y validación
- 🔲 Pruebas exhaustivas del modelo físico
- 🔲 Validación de resultados con modelos teóricos
- 🔲 Optimización para mejor rendimiento con muchas partículas
- 🔲 Documentación completa del código y guía del usuario

## Notas sobre prioridades
Según los correos intercambiados, las prioridades actuales son:
1. Implementar las ecuaciones de movimiento del archivo Matlab en JavaScript
2. Mejorar la tabla para configurar todos los elementos (dinodos, fotocátodo, grid, acelerador, ánodo)
3. Implementar la carga de geometrías en formato JSON
4. Calcular campos eléctricos adecuadamente

## Referencias clave
- Paper mencionado: https://www.sciencedirect.com/science/article/pii/S0924424723007082?via%3Dihub
- Archivo Matlab con ecuaciones de movimiento (para traducir a JavaScript)