import type { VirtualProfession, VirtualPerson } from "./WorldEngine";

const FIRST_NAMES = [
  "Mateo", "Laura", "Diego", "Sofía", "Nicolás", "Camila",
  "Bruno", "Valentina", "Lucas", "Martina", "Thiago", "Julieta",
  "Santiago", "Agustina", "Tomás", "Mía", "Gabriel", "Renata",
  "Facundo", "Emilia", "Benjamín", "Victoria", "Samuel", "Antonella",
  "Joaquín", "Paula", "Sebastián", "Daniela", "Adrián", "Carolina",
];

const LAST_NAMES = [
  "Benítez", "Gómez", "González", "Rodríguez", "Martínez",
  "López", "Fernández", "Ramírez", "Díaz", "Torres",
  "Acosta", "Vera", "Rojas", "Ortiz", "Franco",
  "Cáceres", "Ayala", "Sosa", "Mendoza", "Silva",
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

const PERSON_COUNT = 2000;

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function generatePerson(index: number): VirtualPerson {
  const firstName = pick(FIRST_NAMES, index * 7);
  const lastName = pick(LAST_NAMES, index * 11);

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
