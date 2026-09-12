import type { VirtualProfession, VirtualPerson } from "./WorldEngine";

const FIRST_NAMES = [
  "Mateo", "Laura", "Diego", "Sofía", "Nicolás", "Camila",
  "Bruno", "Valentina", "Lucas", "Martina", "Thiago", "Julieta",
  "Santiago", "Agustina", "Tomás", "Mía", "Gabriel", "Renata",
  "Facundo", "Emilia", "Benjamín", "Victoria", "Samuel", "Antonella",
  "Joaquín", "Paula", "Sebastián", "Daniela", "Adrián", "Carolina",
  "Iván", "Rocío", "Matías", "Fátima", "Ramiro", "Belén",
  "Aldo", "Noelia", "Cristian", "Larissa", "Gustavo", "Micaela",
  "Hugo", "Tamara", "Óscar", "Liz", "Pablo", "Cynthia",
  "Rodrigo", "Verónica", "Álvaro", "Jazmín", "Marcelo", "Lucía",
];

const LAST_NAMES = [
  "Benítez", "Gómez", "González", "Rodríguez", "Martínez",
  "López", "Fernández", "Ramírez", "Díaz", "Torres",
  "Acosta", "Vera", "Rojas", "Ortiz", "Franco",
  "Cáceres", "Ayala", "Sosa", "Mendoza", "Silva",
  "Giménez", "Duarte", "Villalba", "Núñez", "Riveros",
  "Aquino", "Meza", "Escobar", "Insfrán", "Bogado",
  "Fleitas", "Candia", "Peralta", "Barreto", "Colmán",
  "Verón", "Ojeda", "Chávez", "Romero", "Espinoza",
];

const PROFESSIONS: VirtualProfession[] = [
  "student",
  "developer",
  "security-analyst",
  "teacher",
  "journalist",
  "gamer",
  "designer",
  "merchant",
  "technician",
  "entrepreneur",
  "researcher",
  "user",
];

const INTERESTS = [
  "programación",
  "Linux",
  "redes",
  "ciberseguridad",
  "videojuegos",
  "música",
  "diseño",
  "tecnología",
  "ciencia",
  "educación",
  "negocios",
  "hardware",
  "Git",
  "video",
  "fotografía",
  "emprendimiento",
];

/**
 * Cuánta gente vive en el mundo virtual. Duplicado a 4.000 para un mundo más
 * poblado sin castigar al celular: el render está acotado (el mapa y el feed
 * muestran una muestra) y la economía avanza por lotes, así que el costo por
 * tick sube poco. Fuente única de la cifra — la UI y los tests la leen de acá.
 */
export const PERSON_COUNT = 4000;

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

/** Hash entero bien mezclado (finalizador estilo xxHash) para decorrelacionar
 *  el nombre y el apellido: con multiplicadores lineales (index*7, index*11)
 *  las combinaciones se repetían con período corto y salían ~60 nombres para
 *  miles de personas. */
function mixIndex(index: number, salt: number): number {
  let h = (index ^ (salt * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function generatePerson(index: number): VirtualPerson {
  const firstName = FIRST_NAMES[mixIndex(index, 1) % FIRST_NAMES.length];
  const lastName = LAST_NAMES[mixIndex(index, 2) % LAST_NAMES.length];

  const profession = pick(
    PROFESSIONS,
    index * 13,
  );

  const interestOne = pick(
    INTERESTS,
    index * 3,
  );

  const interestTwo = pick(
    INTERESTS,
    index * 5 + 1,
  );

  const interestThree = pick(
    INTERESTS,
    index * 7 + 2,
  );

  return {
    id: `person-${String(index + 1).padStart(5, "0")}`,
    name: `${firstName} ${lastName}`,
    age: 18 + (index % 43),
    profession,
    interests: [
      interestOne,
      interestTwo,
      interestThree,
    ],
    technicalLevel: 1 + (index % 10),
    activity: 30 + ((index * 17) % 71),
    online: index % 3 !== 0,
  };
}

export function generatePeople(
  count: number = PERSON_COUNT,
): VirtualPerson[] {
  return Array.from(
    { length: count },
    (_, index) => generatePerson(index),
  );
}

export function generatePersonAt(
  index: number,
): VirtualPerson {
  return generatePerson(index);
}
