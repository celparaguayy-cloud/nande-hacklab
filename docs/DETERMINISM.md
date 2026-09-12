# DETERMINISM — ÑANDE Hacklab

El mundo se genera con semillas, no con azar real. Misma seed + mismo estado
inicial + misma secuencia de acciones → mismo resultado. Esto hace el OSINT
consistente y los tests reproducibles.

## Fuentes de determinismo
- **Personas** (`VirtualPeople`): datos derivados del índice/id con hashes
  (`mixIndex`), no de `Math.random`. 4000 personas estables.
- **Sandbox**: `nande.rng()` usa un PRNG sembrado (mulberry32) del kernel;
  `nande.now()` es el tick del mundo. Nada de `Date.now`/`Math.random` en el
  código del jugador.
- **NpcToolForge**: elige plantilla y NPC por `hash(id, tick)`; las tools
  sembradas al arranque son las mismas con la misma seed (hay test).
- **HostRuntime**: el mapa de puertos inicial es idéntico entre dos kernels con
  la misma seed (hay test).

## Dónde hay azar (acotado)
`kernel.tick()` usa `Math.random` para pequeños adornos vivos (algún chat/tool
entrante). No afecta la generación del mundo ni los laboratorios, y los tests
no dependen de él (usan APIs directas o `seedRandom()`).

## En tests
`seedRandom()` fija la semilla y `resetStorage()` limpia el estado; por eso los
409→445 tests son estables corrida tras corrida.
