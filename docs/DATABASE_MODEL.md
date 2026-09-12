# DATABASE MODEL — ÑANDE Hacklab

Motor SQL real propio (`core/db/`): `tokenizer` → `parser` → `Database`. No es
un mock: las consultas (y las inyecciones de los labs) se ejecutan de verdad.

## Database
- `createTable(name, columns, rows)`, `insert(table, values)`, `query(sql)`.
- `query` devuelve `{ columns, rows }`; los errores salen con tono de motor
  real (para enseñar inyección basada en errores).
- Soporta SELECT con WHERE, comparaciones, y las construcciones que usan los
  labs de SQLi/UNION.

## DatabaseRuntime (catálogo)
`core/db/DatabaseRuntime.ts` agrupa bases con nombre. Base de práctica sembrada
`padron` (`personas`, `ciudades`). Comandos: `db-list`, `db-schema <db>`,
`db-query <db> <sql>`.

## Límites
- El tokenizer trabaja sobre ASCII en los literales; los datos con acentos se
  muestran bien pero conviene filtrar por campos numéricos/ASCII en consultas.
- No es PostgreSQL completo: sólo el subconjunto necesario para comportamiento
  consistente y para los laboratorios.

## Uso en labs
Las webs vulnerables (banco.nande, login.redix.nande, …) usan un `Database`
por lab; la inyección real se ejecuta contra él. El `DatabaseRuntime` agrega
además bases consultables directamente para practicar SQL seguro.
