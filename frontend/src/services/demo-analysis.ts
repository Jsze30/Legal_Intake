import type { TranscriptCase } from '../types';
import type { IntakeResult } from './intakes-api';

type DemoPolicy = IntakeResult['insurancePolicies'][number];
type DemoTreatment = IntakeResult['treatments'][number];

interface DemoFixture {
  client: NonNullable<IntakeResult['client']>;
  incident: NonNullable<IntakeResult['incident']>;
  allegedFault: string | null;
  policies: DemoPolicy[];
  treatments: DemoTreatment[];
  policeReport?: NonNullable<IntakeResult['policeReport']>;
  witnesses?: IntakeResult['witnesses'];
}

const reportedPolicy = (
  insuranceType: string,
  carrierName: string,
  policyLimit: number | null = null,
): DemoPolicy => ({
  insuranceType,
  carrierName,
  policyNumber: null,
  coverageStatus: 'reported',
  policyLimit,
});

const treatment = (
  treatmentType: string,
  diagnosis: string,
  provider: string,
  billedAmount: number,
  notes: string,
): DemoTreatment => ({
  treatmentType,
  diagnosis,
  notes,
  billedAmount,
  provider: { name: provider, providerType: null },
});

const demoFixtures: Record<string, DemoFixture> = {
  "693ef972-975d-518c-9388-df4da5e6b427": {
    "client": {
      "firstName": "Elena Sofia",
      "lastName": "Morales"
    },
    "incident": {
      "incidentType": "premises liability",
      "occurredAt": null,
      "occurredAtText": "April 19, 2025",
      "location": "Cedar Basket Market, Maple Avenue, Portland",
      "description": "I was at Cedar Basket Market on Maple Avenue in Portland on April 19, 2025. There was clear liquid leaking out of the flower display onto the tile. I didn't see it until my feet went out from under me. There wasn't a cone or a mat there."
    },
    "allegedFault": "The store allegedly left a leaking flower display without a warning or mat.",
    "policies": [],
    "treatments": [
      {
        "treatmentType": "Urgent care and physical therapy",
        "diagnosis": "Left wrist sprain and lumbar strain",
        "provider": {
          "name": "Rosebridge Medical Center and Maple Rehabilitation",
          "providerType": null
        },
        "billedAmount": 5600,
        "notes": "I've done ten physical therapy visits at Maple Rehabilitation. My back is better, but twisting a jar open still sets off the wrist. They're talking about a referral if it doesn't improve after the next few visits."
      }
    ],
    "witnesses": [
      {
        "firstName": "Owen",
        "lastName": "Price",
        "statementSummary": "Reported a leak to store staff before the fall and helped the caller afterward."
      }
    ]
  },
  "0e48d69a-6193-566e-80de-cbb72cd932c9": {
    "client": {
      "firstName": "Nisha Anjali",
      "lastName": "Shah"
    },
    "incident": {
      "incidentType": "rideshare collision",
      "occurredAt": null,
      "occurredAtText": "February 27, 2025",
      "location": "East Harbor Expressway near Exit 12, Tampa",
      "description": "On February 27, 2025, my Uber slowed with traffic on East Harbor Expressway near Exit 12 in Tampa. A delivery van hit us from behind. I was in the rear seat with my belt on, looking at directions on my phone."
    },
    "allegedFault": "The van driver allegedly failed to stop for slowing traffic.",
    "policies": [
      {
        "insuranceType": "auto liability",
        "carrierName": "Progressive",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      },
      {
        "insuranceType": "rideshare commercial",
        "carrierName": "Uber",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Emergency evaluation and physical therapy",
        "diagnosis": "C6-C7 disc protrusion and right shoulder strain",
        "provider": {
          "name": "Bayshore Community Hospital and Harbor Spine Therapy",
          "providerType": null
        },
        "billedAmount": 21500,
        "notes": "Harbor Spine Therapy has me going twice a week. I've finished twelve visits. An injection was discussed, but it hasn't happened and I don't want it counted as treatment I've already had."
      }
    ],
    "witnesses": [],
    "policeReport": {
      "agencyName": "Tampa Police",
      "reportNumber": "25-TP-18462",
      "reportStatus": "mentioned",
      "notes": null
    }
  },
  "e2240b1f-76ed-5d79-9d37-f316ffe95cc5": {
    "client": {
      "firstName": "Andre Malik",
      "lastName": "Brooks"
    },
    "incident": {
      "incidentType": "motor vehicle collision",
      "occurredAt": null,
      "occurredAtText": "August 9, 2024",
      "location": "Walnut Street and 18th Avenue, Philadelphia",
      "description": "It happened August 9, 2024, at Walnut Street and 18th Avenue in Philadelphia. I had a green light. A silver SUV came from the side and hit my driver's door. I didn't see it until it was right there."
    },
    "allegedFault": "The SUV driver allegedly entered the intersection against a red light.",
    "policies": [
      {
        "insuranceType": "auto liability",
        "carrierName": "Geico",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      },
      {
        "insuranceType": "first-party auto",
        "carrierName": "Liberty Mutual",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Physical therapy and lumbar injection",
        "diagnosis": "Lumbar radiculopathy and aggravation of degenerative disc disease",
        "provider": {
          "name": "Fairhill Medical Center and Cityline Spine Clinic",
          "providerType": null
        },
        "billedAmount": 16750,
        "notes": "I've completed fourteen physical therapy sessions and one lumbar injection. The injection helped for about two weeks. Surgery hasn't been recommended. I still can't sit through a full movie without getting up."
      }
    ],
    "witnesses": [
      {
        "firstName": "Rosa",
        "lastName": "Kim",
        "statementSummary": "Reported seeing the SUV enter the intersection on red."
      }
    ],
    "policeReport": {
      "agencyName": "Philadelphia Police",
      "reportNumber": "24-PH-30718",
      "reportStatus": "mentioned",
      "notes": null
    }
  },
  "8eee119c-dcf1-5ee1-b850-b25f83eb49db": {
    "client": {
      "firstName": "Daniel Jun",
      "lastName": "Mercer"
    },
    "incident": {
      "incidentType": "commercial truck collision",
      "occurredAt": null,
      "occurredAtText": "March 6, 2025",
      "location": "I-40 near mile marker 162, Albuquerque",
      "description": "On March 6, 2025, I was driving a service pickup on I-40 near mile marker 162 in Albuquerque. A Canyon Freight box truck came into my lane in blowing dust and pushed me into the barrier. I'd slowed down because visibility was terrible."
    },
    "allegedFault": "The truck driver allegedly changed lanes unsafely in reduced visibility.",
    "policies": [
      {
        "insuranceType": "first-party auto",
        "carrierName": "State Farm",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      },
      {
        "insuranceType": "workers compensation",
        "carrierName": "Hartford",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Inpatient trauma care and neurological rehabilitation",
        "diagnosis": "Four fractured ribs, pulmonary contusion, and concussion",
        "provider": {
          "name": "Mesa Regional Trauma Center and Sandstone Rehabilitation",
          "providerType": null
        },
        "billedAmount": 93600,
        "notes": "Sandstone Rehabilitation is helping with balance and memory, plus breathing exercises. Neurology says we need to watch the headaches. My wife drives me because I get overwhelmed when trucks pass close by."
      }
    ],
    "witnesses": [],
    "policeReport": {
      "agencyName": "New Mexico State Police",
      "reportNumber": "25-NM-46281",
      "reportStatus": "mentioned",
      "notes": null
    }
  },
  "249c5497-2004-529c-bb0b-336d780d97a1": {
    "client": {
      "firstName": "Leah Christine",
      "lastName": "Bennett"
    },
    "incident": {
      "incidentType": "dog bite",
      "occurredAt": null,
      "occurredAtText": "May 17, 2025",
      "location": "Willow Court, Lakewood",
      "description": "On May 17, 2025, Noah was on the sidewalk along Willow Court in Lakewood. Our neighbor's dog pushed through an unlatched gate and bit his cheek and forearm. I was just a few steps behind him."
    },
    "allegedFault": "The owner allegedly failed to secure a gate after prior complaints about the dog escaping.",
    "policies": [
      {
        "insuranceType": "homeowners liability",
        "carrierName": "Allstate",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Plastic surgery and counseling",
        "diagnosis": "Facial laceration, forearm puncture wounds, and trauma symptoms",
        "provider": {
          "name": "Willow Pediatric Hospital",
          "providerType": null
        },
        "billedAmount": 38900,
        "notes": "He's started counseling and has had three appointments. He sleeps with the light on and won't go to soccer if we have to pass that house. The surgeon hasn't decided whether another procedure will be needed."
      }
    ],
    "witnesses": [
      {
        "firstName": "Paige",
        "lastName": "Foster",
        "statementSummary": "Reported two earlier escapes by the same dog."
      }
    ],
    "policeReport": {
      "agencyName": "Lakewood Animal Services",
      "reportNumber": "25-LA-11809",
      "reportStatus": "mentioned",
      "notes": null
    }
  },
  "dcb01eb2-1487-5e4b-866a-0a181d324689": {
    "client": {
      "firstName": "Terrell Isaiah",
      "lastName": "Coleman"
    },
    "incident": {
      "incidentType": "construction site injury",
      "occurredAt": null,
      "occurredAtText": "January 23, 2025",
      "location": "Riverbend Commons construction site, Charlotte",
      "description": "On January 23, 2025, I was at Riverbend Commons in Charlotte installing ductwork. The platform shifted and I fell about twelve feet. Afterward the crew photographed a missing locking pin on the scaffold frame."
    },
    "allegedFault": "The site contractor allegedly permitted use of scaffolding with a missing locking pin.",
    "policies": [
      {
        "insuranceType": "workers compensation",
        "carrierName": "Hartford",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Knee fixation surgery and rehabilitation",
        "diagnosis": "Right tibial plateau fracture, torn meniscus, and lumbar compression fracture",
        "provider": {
          "name": "Piedmont Valley Hospital and Riverbend Rehabilitation",
          "providerType": null
        },
        "billedAmount": 118400,
        "notes": "Riverbend Rehabilitation is working on transfers and knee motion. I'm still using a wheelchair for distance and a walker indoors. They haven't cleared me for full weight-bearing yet."
      }
    ],
    "witnesses": [
      {
        "firstName": "Mateo",
        "lastName": "Ruiz",
        "statementSummary": "Witnessed the scaffold platform shift and photographed the frame."
      },
      {
        "firstName": "Ellis",
        "lastName": "Ward",
        "statementSummary": "Witnessed the fall while working on the same crew."
      }
    ]
  },
  "1b498a83-9668-5881-9ac0-b6166aa7c1b7": {
    "client": {
      "firstName": "Owen Patrick",
      "lastName": "Reed"
    },
    "incident": {
      "incidentType": "product liability",
      "occurredAt": null,
      "occurredAtText": "July 11, 2024",
      "location": "A home kitchen in Sacramento",
      "description": "On July 11, 2024, I was making pesto at home in Sacramento with a Northstar FP-8 food processor. The lid latch broke while it was running and a blade fragment cut my right hand. I was using the normal pulse setting."
    },
    "allegedFault": "The food processor allegedly failed during ordinary use when its lid latch broke.",
    "policies": [],
    "treatments": [
      {
        "treatmentType": "Tendon repair surgery and hand therapy",
        "diagnosis": "Right hand laceration with flexor tendon injury",
        "provider": {
          "name": "Sacramento Valley Medical Center and Oak Hand Therapy",
          "providerType": null
        },
        "billedAmount": 31200,
        "notes": "Oak Hand Therapy made a custom splint. I've had sixteen sessions and still can't fully close my hand. The surgeon says recovery takes time but hasn't promised full strength."
      }
    ],
    "witnesses": [
      {
        "firstName": "Avery",
        "lastName": "Chen",
        "statementSummary": "Heard the product break and observed the immediate hand injury."
      }
    ]
  },
  "cd1c3d41-444f-56dd-8d31-aca3aea63499": {
    "client": {
      "firstName": "Gabriel Tomas",
      "lastName": "Vega"
    },
    "incident": {
      "incidentType": "motorcycle collision",
      "occurredAt": null,
      "occurredAtText": "June 7, 2025",
      "location": "Harbor Boulevard and Pine Street, San Diego",
      "description": "June 7, 2025, at Harbor Boulevard and Pine Street in San Diego. A white SUV moved into my lane without signaling and knocked the bike out from under me. I had a helmet and riding jacket on, and I stayed in my lane."
    },
    "allegedFault": "The SUV driver allegedly changed lanes without signaling into an occupied lane.",
    "policies": [
      {
        "insuranceType": "auto liability",
        "carrierName": "AAA",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      },
      {
        "insuranceType": "motorcycle",
        "carrierName": "Geico",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Clavicle fixation surgery and wound care",
        "diagnosis": "Left clavicle fracture, wrist fracture, and extensive road rash",
        "provider": {
          "name": "Pacific Crest Medical Center",
          "providerType": null
        },
        "billedAmount": 62400,
        "notes": "I'm starting physical therapy next week, so those bills aren't included yet. At the moment I have a sling, a wrist brace and dressing changes. Sleeping on my left side is impossible."
      }
    ],
    "witnesses": [
      {
        "firstName": "Ben",
        "lastName": "Walsh",
        "statementSummary": "Provided dashcam video showing the SUV crossing into the motorcycle lane."
      }
    ],
    "policeReport": {
      "agencyName": "San Diego Police",
      "reportNumber": "25-SD-55204",
      "reportStatus": "mentioned",
      "notes": null
    }
  },
  "ff70ec1f-326d-5fc7-8f10-96c4f490d59c": {
    "client": {
      "firstName": "Imani Rochelle",
      "lastName": "Davis"
    },
    "incident": {
      "incidentType": "pedestrian collision",
      "occurredAt": null,
      "occurredAtText": "April 3, 2025",
      "location": "Central Avenue and Monroe Street, Phoenix",
      "description": "It was April 3, 2025, at Central Avenue and Monroe Street in Phoenix. The walk sign was on. A sedan turned right and struck me before I reached the other curb. I remember seeing the driver looking down, but I can't say what he was looking at."
    },
    "allegedFault": "The turning driver allegedly failed to yield to a pedestrian with a walk signal.",
    "policies": [
      {
        "insuranceType": "auto liability",
        "carrierName": "Farmers",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Intramedullary rodding and physical therapy",
        "diagnosis": "Left tibia and fibula fractures and concussion",
        "provider": {
          "name": "Sonoran Community Hospital and Desert Path Therapy",
          "providerType": null
        },
        "billedAmount": 81400,
        "notes": "Desert Path Therapy has me working on balance and walking. I've had nine sessions. The leg is healing but stairs are slow, and I still get headaches when I read for too long."
      }
    ],
    "witnesses": [],
    "policeReport": {
      "agencyName": "Phoenix Police",
      "reportNumber": "25-PH-28406",
      "reportStatus": "mentioned",
      "notes": null
    }
  },
  "b0911f58-896d-5a02-b1e5-c2c5c8a8d337": {
    "client": {
      "firstName": "Ethan Min",
      "lastName": "Park"
    },
    "incident": {
      "incidentType": "minor motor vehicle collision",
      "occurredAt": null,
      "occurredAtText": "May 30, 2025",
      "location": "Oak Street near the transit center, Minneapolis",
      "description": "On May 30, 2025, I was stopped on Oak Street near the transit center in Minneapolis. The car behind me rolled forward into my bumper. There was a little jolt and a scrape, but both cars drove away."
    },
    "allegedFault": "The other driver allegedly rolled into a stopped vehicle.",
    "policies": [
      {
        "insuranceType": "auto liability",
        "carrierName": "State Farm",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [],
    "witnesses": []
  },
  "ba166362-bd75-560d-a73a-b89be1de240d": {
    "client": {
      "firstName": "Lucia Marisol",
      "lastName": "Ortega"
    },
    "incident": {
      "incidentType": "premises liability",
      "occurredAt": null,
      "occurredAtText": "February 5, 2025",
      "location": "Birchview Apartments parking lot, Madison",
      "description": "February 5, 2025, at Birchview Apartments in Madison. Meltwater from a blocked downspout had frozen across the parking-lot walkway. I slipped carrying my work bag. It hadn't snowed that morning, and there was no salt on the patch."
    },
    "allegedFault": "Management allegedly failed to address recurring ice from a blocked downspout after written complaints.",
    "policies": [],
    "treatments": [
      {
        "treatmentType": "Emergency care, physical therapy, and epidural injection",
        "diagnosis": "Sacral fracture and L5-S1 disc protrusion",
        "provider": {
          "name": "Lakeview Community Hospital and North Shore Spine",
          "providerType": null
        },
        "billedAmount": 29700,
        "notes": "I've had eleven therapy visits. The injection reduced the leg pain but didn't fix the sitting problem. I use a cushion at work and have to stand up during client appointments."
      }
    ],
    "witnesses": [
      {
        "firstName": "Samuel",
        "lastName": "Ortiz",
        "statementSummary": "Saw the fall and photographed the untreated ice immediately afterward."
      }
    ]
  },
  "202b6e02-4089-5e56-830e-d8417cfaec63": {
    "client": {
      "firstName": "Peter James",
      "lastName": "Callahan"
    },
    "incident": {
      "incidentType": "premises liability",
      "occurredAt": null,
      "occurredAtText": "June 14, 2025",
      "location": "A private home in Richmond",
      "description": "On June 14, 2025, I went into my friend's kitchen in Richmond to get ice. The tile had just been mopped. I stepped around a chair and slipped. He says he called out that it was wet, but I didn't hear it from outside."
    },
    "allegedFault": "The caller reports a wet kitchen floor; whether a warning was given is disputed.",
    "policies": [
      {
        "insuranceType": "renters liability",
        "carrierName": "Lemonade",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": null
      }
    ],
    "treatments": [
      {
        "treatmentType": "Urgent care evaluation and home exercises",
        "diagnosis": "Hip contusion and mild lumbar strain",
        "provider": {
          "name": "Brookfield Urgent Care",
          "providerType": null
        },
        "billedAmount": 950,
        "notes": "It's been improving each day. I'm walking normally and only notice soreness if I sit on a hard chair. No therapy, injections or specialist referral."
      }
    ],
    "witnesses": []
  },
  "27d92d39-cf2d-53d9-8557-2c2b3e64ef45": {
    "client": {
      "firstName": "Alyssa Renee",
      "lastName": "Thompson"
    },
    "incident": {
      "incidentType": "rideshare collision",
      "occurredAt": null,
      "occurredAtText": "March 22, 2025",
      "location": "Ashland Avenue and Birch Street, Atlanta",
      "description": "On March 22, 2025, I was in a Lyft going to a training session. At Ashland Avenue and Birch Street in Atlanta, the driver went through a stop sign and a sedan hit the passenger side. That's where I was sitting. The ride was already underway in the app."
    },
    "allegedFault": "The Lyft driver allegedly entered the intersection without stopping at a stop sign.",
    "policies": [
      {
        "insuranceType": "rideshare commercial",
        "carrierName": "Lyft",
        "policyNumber": null,
        "coverageStatus": "reported",
        "policyLimit": 1000000
      }
    ],
    "treatments": [
      {
        "treatmentType": "Wrist fixation surgery and psychiatric care",
        "diagnosis": "Left distal-radius fracture, cervical strain, and PTSD",
        "provider": {
          "name": "Peachtree Regional Hospital",
          "providerType": null
        },
        "billedAmount": 58400,
        "notes": "I'm in a removable brace and have started hand therapy. Psychiatry sees me every other week. The cast is off, but lifting a classroom supply box is still out of reach. The panic is slowly improving, not gone."
      }
    ],
    "witnesses": [],
    "policeReport": {
      "agencyName": "Atlanta Police",
      "reportNumber": "25-AT-64182",
      "reportStatus": "mentioned",
      "notes": null
    }
  },
  "6bc0e688-e65a-50eb-bfde-6cc077cd1f01": {
    "client": {
      "firstName": "Megan Claire",
      "lastName": "Sullivan"
    },
    "incident": {
      "incidentType": "municipal premises liability",
      "occurredAt": null,
      "occurredAtText": "April 12, 2025",
      "location": "Riverside Greenway near the boat launch, Boise",
      "description": "April 12, 2025, on Riverside Greenway near the boat launch in Boise. A concrete slab was raised where a tree root had pushed it up. My shoe caught the edge and I fell forward. There wasn't a cone or paint marking the change in height."
    },
    "allegedFault": "The city allegedly left a raised walkway slab unmarked on a public greenway.",
    "policies": [],
    "treatments": [
      {
        "treatmentType": "Emergency evaluation and physical therapy",
        "diagnosis": "Grade three ankle sprain with ATFL tear",
        "provider": {
          "name": "Foothill Community Hospital and Greenway Physical Therapy",
          "providerType": null
        },
        "billedAmount": 10800,
        "notes": "Greenway Physical Therapy has seen me eight times. The ankle still gives way on uneven ground. The orthopedist mentioned possible reconstruction only if therapy fails; no surgery is scheduled."
      }
    ],
    "witnesses": [
      {
        "firstName": "Tessa",
        "lastName": "Lane",
        "statementSummary": "Witnessed the fall and photographed the raised walkway edge."
      }
    ]
  }
};

const liabilityCarriers = [
  'Progressive',
  'Geico',
  'Liberty Mutual',
  'State Farm',
  'Allstate',
  'Hartford',
  'AAA',
  'Farmers',
  'Lemonade',
  'Lyft',
  'Uber',
];

function firstCallerTurn(transcript: TranscriptCase, pattern: RegExp): string | null {
  return transcript.transcript.find((turn) => (
    turn.speaker.toLowerCase().includes('caller') && pattern.test(turn.text)
  ))?.text ?? null;
}

function inferFallback(transcript: TranscriptCase): DemoFixture {
  const allText = transcript.transcript.map((turn) => turn.text).join(' ');
  const incidentDescription = firstCallerTurn(
    transcript,
    /accident|collision|crash|fell|fall|slip|struck|hit|attack|injur|broke|failed/i,
  ) ?? transcript.preview;
  const medicalText = firstCallerTurn(
    transcript,
    /hospital|doctor|diagnos|fracture|surgery|therapy|treatment|injur|pain|sprain|strain/i,
  );
  const deniesTreatment = /no doctor|not really hurt|never (?:saw|went to) (?:a )?doctor/i.test(allText);
  const amountMatch = allText.match(/\$\s?([\d,]+(?:\.\d{2})?)/);
  const billedAmount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;
  const policies = liabilityCarriers
    .filter((carrier) => new RegExp(`\\b${carrier.replace(' ', '\\s+')}\\b`, 'i').test(allText))
    .map((carrier) => reportedPolicy('reported insurance', carrier));
  const reportNumber = allText.match(/\b(?:\d{2,4}-[A-Z]{2,4}-\d{4,6}|\d{2}-[A-Z]{2}-\d{4,6})\b/i)?.[0] ?? null;
  const liabilityText = firstCallerTurn(
    transcript,
    /fault|rear-ended|red light|stop sign|no warning|without signal|distract|unsafe|failed|speed/i,
  );

  let incidentType = 'personal injury intake';
  if (/rideshare|\bLyft\b|\bUber\b/i.test(allText)) incidentType = 'rideshare collision';
  else if (/motorcycle/i.test(allText)) incidentType = 'motorcycle collision';
  else if (/dog|bite|attack/i.test(allText)) incidentType = 'dog bite';
  else if (/product|blender|device|defect/i.test(allText)) incidentType = 'product liability';
  else if (/scaffold|job site|workplace/i.test(allText)) incidentType = 'workplace injury';
  else if (/slip|trip|fell|fall/i.test(allText)) incidentType = 'premises liability';
  else if (/car|vehicle|truck|collision|crash|rear-ended/i.test(allText)) incidentType = 'motor vehicle collision';

  return {
    client: { firstName: null, lastName: null },
    incident: {
      incidentType,
      occurredAt: null,
      occurredAtText: null,
      location: null,
      description: incidentDescription,
    },
    allegedFault: liabilityText,
    policies,
    treatments: medicalText && !deniesTreatment
      ? [treatment(
        /surgery/i.test(medicalText) ? 'Reported surgery and follow-up care' : 'Reported medical treatment',
        'Injuries described in the intake',
        'Provider named in the transcript',
        billedAmount,
        medicalText,
      )]
      : [],
    policeReport: reportNumber
      ? { agencyName: null, reportNumber, reportStatus: 'mentioned', notes: null }
      : undefined,
    witnesses: /witness/i.test(allText)
      ? [{ firstName: null, lastName: null, statementSummary: 'The caller identified possible witness evidence.' }]
      : [],
  };
}

export function createDemoIntakeResult(transcript: TranscriptCase): IntakeResult {
  const fixture = demoFixtures[transcript.id] ?? inferFallback(transcript);

  return {
    intake: { id: transcript.id, status: 'completed', failureReason: null },
    client: fixture.client,
    incident: fixture.incident,
    defendants: fixture.allegedFault
      ? [{ firstName: null, lastName: null, vehicleDescription: null, allegedFault: fixture.allegedFault }]
      : [],
    insurancePolicies: fixture.policies,
    treatments: fixture.treatments,
    servicesRendered: [],
    policeReport: fixture.policeReport ?? null,
    witnesses: fixture.witnesses ?? [],
  };
}

export function waitForDemoResult(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was cancelled.', 'AbortError'));
      return;
    }

    const timeout = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);

    function handleAbort() {
      window.clearTimeout(timeout);
      reject(new DOMException('The request was cancelled.', 'AbortError'));
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}
