export interface SchoolUnitOption {
  id: number;
  name: string;
  classes: string[];
}

export const SCHOOL_UNITS: SchoolUnitOption[] = [
  {
    id: 1,
    name: "KB",
    classes: ["KB"],
  },
  {
    id: 2,
    name: "RA",
    classes: [
      "A1",
      "A2",
      "A3",
      "A4",
      "B1",
      "B2",
      "B3",
      "B4",
    ],
  },
  {
    id: 3,
    name: "SD",
    classes: [
      "1 Marwa", "1 Mina", "1 Shofa",
      "2 Marwa", "2 Mina", "2 Shofa",
      "3 Marwa", "3 Mina", "3 Shofa",
      "4 Marwa", "4 Mina", "4 Shofa",
      "5 Marwa", "5 Mina", "5 Shofa",
      "6 Marwa", "6 Mina", "6 Shofa",
    ],
  },
];

export const ALL_PRESET_CLASSES: string[] = SCHOOL_UNITS.flatMap((u) => u.classes);

export const getClassesByUnitId = (unitId: number): string[] => {
  const unit = SCHOOL_UNITS.find((u) => u.id === unitId);
  return unit ? unit.classes : [];
};
