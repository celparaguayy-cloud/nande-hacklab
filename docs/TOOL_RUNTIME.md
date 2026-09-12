# TOOL RUNTIME — ÑANDE Hacklab

`core/code/ToolRuntime.ts` — registro de **herramientas funcionales** creadas
dentro de ÑANDE por el jugador o por los NPC. Una tool no es un adorno: es
código que compila, pasa pruebas, se instala y `run <nombre>` la ejecuta de
verdad en el sandbox. **Persiste** en `localStorage` (`nande-tools`).

## Artefacto

```ts
ToolArtifact = {
  manifest: { name, version, description, capabilities[], author, input?, output? },
  source: string,
  createdTick: number,
  origin: "player" | "npc",
}
```

Las **capacidades** se infieren del código (`inferCapabilities`): usar
`nande.scan` añade `network.virtual.inspect`, `nande.http` añade
`http.virtual.request`, `nande.resolve` añade `dns.resolve`; `print` siempre.
Se pueden declarar explícitamente en el manifiesto.

## Pipeline (el del prompt)

```
code new <n>  → escribe un starter en /home/student/tools/<n>.js
(editar)      → app Archivos
compile <n>   → valida (no instala)
tool-install  → compila + registra + persiste
run <n> args  → ejecuta en el sandbox con sus capacidades
```

`ToolRuntime.test(name, cases)` corre una batería de pruebas (lo usan el jugador
y los NPC antes de publicar).

## NPCs desarrolladores (Experimento D)

Un NPC "que programa" produce lo mismo: `install(source, manifest, "npc")`.
Si el código **no compila**, `install` devuelve `ok:false` y **no** queda nada
registrado. Si compila y pasa sus tests, queda como artefacto ejecutable e
inspeccionable por el jugador (`tool-info`, `code`), y corre en el mismo
sandbox capado. (El motor de NPCs que genera y corrige ese código es la
siguiente fase; el runtime que lo hace real ya está.)

## Persistencia (Experimento C)

`run` una tool, cerrá la app, volvé: sigue ahí. En tests se prueba construyendo
un `ToolRuntime` nuevo sobre el mismo `localStorage` y comprobando que la
reencuentra y la ejecuta.

## Integración

- `VirtualKernel.toolRuntime` + `VirtualKernel.sandbox`.
- `makeSandboxHost()` en el kernel: la ÚNICA superficie del sandbox al mundo
  (HostRuntime.scan, DNS.resolve, browser.request). Nada de APIs del dispositivo.
- Terminal: `code`, `compile`, `tool-install`, `tool-list`, `tool-info`,
  `tool-remove`, y `run` (que primero busca una tool instalada).

## Pendiente

- App/IDE gráfica para escribir código en el celular (editor + botón correr).
- Motor de NPCs que redacta, prueba y publica tools solo.
- Tools que se pueden **vender/compartir** en la Internet virtual (git.nande).
