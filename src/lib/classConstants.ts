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
      "RA-A1",
      "RA-A2",
      "RA-A3",
      "RA-A4",
      "RA-B1",
      "RA-B2",
      "RA-B3",
      "RA-B4",
    ],
  },
  {
    id: 3,
    name: "SD",
    classes: [
      "SD 1 MINA", "SD 1 SHOFA", "SD 1 MARWA",
      "SD 2 MINA", "SD 2 SHOFA", "SD 2 MARWA",
      "SD 3 MINA", "SD 3 SHOFA", "SD 3 MARWA",
      "SD 4 MINA", "SD 4 SHOFA", "SD 4 MARWA",
      "SD 5 MINA", "SD 5 SHOFA", "SD 5 MARWA",
      "SD 6 MINA", "SD 6 SHOFA", "SD 6 MARWA",
    ],
  },
  {
    id: 4,
    name: "TPA",
    classes: ["TPA"],
  },
];

export const ALL_PRESET_CLASSES: string[] = SCHOOL_UNITS.flatMap((u) => u.classes);

export const getClassesByUnitId = (unitId: number): string[] => {
  const unit = SCHOOL_UNITS.find((u) => u.id === unitId);
  return unit ? unit.classes : [];
};
