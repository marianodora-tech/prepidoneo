# PrepIdóneo

Simulador **gratis** de práctica para el examen de Idoneidad CNV (Argentina).

Sitio: https://marianodora-tech.github.io/prepidoneo/

## Qué es
- Diagnóstico (12 preguntas)
- Práctica por módulo
- Repetir fallos
- Simulacro oficial: **60 preguntas / 45 minutos / 70% (42)**

Banco: Guía de Estudio oficial CNV (jun 2026), 721 enunciados. Las respuestas correctas son las de ese material. Los distractores son de práctica (otras respuestas del mismo módulo).

## Qué no es
No es el examen CNV. La CNV **no avala** cursos ni simuladores privados. Aprobar acá **no** inscribe en el Registro de Idóneos.

Oficial: https://www.argentina.gob.ar/servicio/rendir-el-examen-de-idoneidad

## Local
Serví la carpeta (cualquier static server). El banco está en `data/banco.json`.

```
python3 -m http.server 8080
```

Abrí http://localhost:8080
