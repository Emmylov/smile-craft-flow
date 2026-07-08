// FHIR mapping helpers (FHIR R4)
// Lightweight mappings from local DB rows to FHIR Patient / Encounter / Observation

export function mapPatientToFhir(dbPatient: any, hospital?: any) {
  return {
    resourceType: "Patient",
    id: dbPatient.id,
    identifier: [
      {
        system: hospital ? `urn:hospital:${hospital.workspace_id}` : "urn:internal:hospital",
        value: dbPatient.patient_code,
      },
    ],
    name: dbPatient.full_name ? [{ text: dbPatient.full_name }] : undefined,
    gender: dbPatient.gender ? dbPatient.gender.toLowerCase() : undefined,
    birthDate: dbPatient.date_of_birth ? dbPatient.date_of_birth : undefined,
    telecom: [
      dbPatient.phone ? { system: "phone", value: dbPatient.phone } : null,
      dbPatient.email ? { system: "email", value: dbPatient.email } : null,
    ].filter(Boolean),
    address: dbPatient.address ? [{ text: dbPatient.address }] : undefined,
  };
}

export function mapConsultationToEncounter(row: any) {
  return {
    resourceType: "Encounter",
    id: row.id,
    status: "finished",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
    subject: { reference: `Patient/${row.patient_id}` },
    period: row.created_at || row.updated_at ? { start: row.created_at, end: row.updated_at } : undefined,
    reasonCode: row.diagnosis_system && row.diagnosis_code ? [
      {
        coding: [
          {
            system: row.diagnosis_system === "ICD-10" ? "http://hl7.org/fhir/sid/icd-10" : "http://snomed.info/sct",
            code: row.diagnosis_code,
            display: row.diagnosis_display,
          },
        ],
      },
    ] : undefined,
  };
}

export function mapLabOrderToObservation(row: any) {
  const coding = row.result_system && row.result_code ? [
    {
      system: row.result_system === "ICD-10" ? "http://hl7.org/fhir/sid/icd-10" : "http://snomed.info/sct",
      code: row.result_code,
      display: row.result_display,
    },
  ] : undefined;

  const resource: any = {
    resourceType: "Observation",
    id: row.id,
    status: "final",
    code: coding ? { coding } : { text: row.test_name || row.results },
    subject: { reference: `Patient/${row.patient_id}` },
    effectiveDateTime: row.created_at,
  };

  if (row.results && typeof row.results === "string") {
    resource.valueString = row.results;
  }

  return resource;
}

export function mapVitalsToObservation(row: any) {
  // If observation_coded contains entries, map first one
  const coded = Array.isArray(row.observation_coded) ? row.observation_coded[0] : undefined;
  const coding = coded ? [
    {
      system: coded.system === "ICD-10" ? "http://hl7.org/fhir/sid/icd-10" : "http://snomed.info/sct",
      code: coded.code,
      display: coded.display,
    },
  ] : undefined;

  const resource: any = {
    resourceType: "Observation",
    id: row.id,
    status: "final",
    code: coding ? { coding } : { text: row.notes || row.blood_pressure || "vital sign" },
    subject: { reference: `Patient/${row.patient_id}` },
    effectiveDateTime: row.created_at,
  };

  // map simple numeric vitals where present
  if (row.heart_rate != null) {
    resource.component = resource.component || [];
    resource.component.push({ code: { text: "heart_rate" }, valueQuantity: { value: row.heart_rate, unit: "beats/min" } });
  }
  if (row.temperature != null) {
    resource.component = resource.component || [];
    resource.component.push({ code: { text: "temperature" }, valueQuantity: { value: Number(row.temperature), unit: "C" } });
  }

  return resource;
}
