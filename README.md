# ACME · Trabajo y energía

Laboratorio estático en español con tres escenas 3D: polea y roca, pista con cuatro pendientes y carrito con empuje constante. Incluye modelos originales suministrados por el usuario, controles, vectores, barras de energía, gráfica temporal y descarga CSV.

## Archivos

- `dist/index.html` y `dist/styles.css`: interfaz responsive.
- `dist/app.js`: interacción y registro.
- `dist/physics.js`: modelos físicos independientes del renderizado.
- `dist/scene.js`: escenas Three.js r170.
- `dist/character-motion.js`: articulación del Coyote con IK, agarre de cuerda/manubrio y locomoción del Correcaminos.
- `dist/assets/models`: GLB optimizados con texturas embebidas y procedencia.

Todas las bibliotecas y fuentes se sirven localmente. No requiere dependencias externas, cuentas adicionales ni conexión a un CDN.

La interfaz prioriza el simulador: controles táctiles grandes, entrada numérica junto a los deslizadores, zoom, ampliación de la escena y fórmulas desplegables. La distribución cambia para teléfono, tablet y computadora. El Correcaminos cruza repetidamente bajo una roca inicialmente suspendida; los datos de elevación siguen midiendo el cambio desde su posición inicial.

## Verificación

`node checks.mjs` comprueba balances de energía, ventaja mecánica, fricción, retorno en la pista, aceleración y frenado, archivos GLB e interfaz. La lógica física utiliza segundos, metros, kilogramos, newtons, joules y watts.

`node checks-animation.mjs` comprueba la deformación de los modelos reales, manos alternadas sobre la cuerda, contacto con el manubrio, ciclos de caminata/carrera, apoyo de pies y pausa. El Coyote camina hasta la cuerda antes de iniciar la medición; ese acercamiento visual no altera los cálculos físicos.

`node checks-routes.mjs` comprueba el regreso por gravedad en la pista, el seguimiento continuo del Correcaminos, la carretera y el terreno que se extienden alrededor del cohete y el cruce bajo la roca ya elevada. En recorridos prolongados, el historial reduce gradualmente la frecuencia de muestreo conservando sus tiempos reales.

## Modelos

La polea ideal analiza la elevación a rapidez constante y excluye arranque y frenado. La pista utiliza tramos rectos y un carrito ideal guiado, con uniones sin pérdida de rapidez. El cohete representa una fuerza constante aplicada a masa constante. Todas las suposiciones aparecen dentro de la web.

## Uso local

Desde la carpeta del proyecto, ejecuta `python -m http.server 8000` y abre `http://localhost:8000/dist/`.

## GitHub Pages

En Settings → Pages selecciona GitHub Actions como origen. El flujo incluido permite publicar `dist/` manualmente desde Actions → Publicar simulador → Run workflow cuando GitHub Pages esté habilitado para el repositorio.

## Comprobaciones

Ejecuta `npm run check`. No es necesario instalar dependencias.
