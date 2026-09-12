# ACADEMY ARCHITECTURE — ÑANDE Hacklab

La academia enseña **haciendo** y verifica mirando el comando y su salida
reales, no con multiple-choice.

## Lección (`core/academy/Lessons.ts`)
```
Lesson { id, title, level, summary, concept, reward, steps[] }
LessonStep { explain, task, hint, check(command, output) => boolean, debrief }
```
El flujo por paso: explicar → tarea → el alumno usa una herramienta REAL →
`check` confirma mirando comando+salida → `debrief` (por qué funcionó y cómo
defenderse). Todo dentro del sandbox.

## Contenido
Clásicos (nmap, SQLi, rutas ocultas, privesc, cmdi, SSRF, config, auth,
defensa, OWASP) + **nuevas del mega update**:
- `l-servicios`: prender/apagar servicios y ver el efecto en curl/nmap.
- `l-codigo`: crear, compilar, instalar y correr una herramienta propia.
- `l-pivoting`: conectarse, escanear la red interna y pivotar a la caja.

## Progresión (niveles 0→6)
De computación básica y redes → Linux/servicios → web/OWASP → infra/nube/
DevSecOps → SOC/Blue Team → Purple/capstone. Las lecciones nuevas cubren los
sistemas del runtime transformado.

## Verificación
`newLessons.test.ts` ejecuta el comando de cada paso de las lecciones nuevas
contra un kernel real y comprueba que su `check` da true: son **completables**,
no sólo están bien escritas.

## Mentor (La Mani)
Ayuda en escalera (empujón → pista → comando → "hacelo conmigo") y se gradúa por
tema. Puede apoyarse en la IA (offline por defecto; conectada con la clave del
jugador).
