interface Env {
	ANTHROPIC_API_KEY: string
}

const ALLOWED_ORIGINS = new Set([
	'https://m-w-johnson-holdco.github.io',
])

function getCorsHeaders(origin: string) {
	const allowed = ALLOWED_ORIGINS.has(origin) ? origin : ''
	return {
		'Access-Control-Allow-Origin': allowed,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	}
}

function cors(body: string, origin: string, status = 200) {
	return new Response(body, {
		status,
		headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
	})
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin') || ''

		// Preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
		}

		if (request.method !== 'POST') {
			return cors(JSON.stringify({ error: 'Method not allowed' }), origin, 405)
		}

		let transcript: string
		try {
			const body = await request.json() as { transcript?: string }
			transcript = (body.transcript || '').trim()
		} catch {
			return cors(JSON.stringify({ error: 'Invalid JSON body' }), origin, 400)
		}

		if (!transcript) {
			return cors(JSON.stringify({ error: 'transcript is required' }), origin, 400)
		}

		const systemPrompt = `You are a roofing inspection data extractor for TC Roofing and Restorations LLC.
Extract structured data from the field inspection transcript and return ONLY valid JSON.
No preamble, no markdown fences, no explanation. Just the JSON object.

FLAGS: Add the JSON key name (e.g. "ridgeCapGrade") to the "flags" array whenever you are guessing, uncertain, or the transcript is ambiguous about that field. Do not flag fields you are confident about.

NORMALIZATION — return ONLY the exact values listed below for these fields. If the transcript is unclear, return null and add the key to flags.

Yes/No fields (yn): return exactly "Yes" or "No"

roof.shingleStyle: array, values from ["3-Tab","Architectural","Designer","Disco","Impact Resistant"]
roof.edgeFlashingType: "Drip Edge" or "Critter Guard"
roof.edgeMaterial: "Galvanized" or "Aluminum"
roof.underlaymentGrade: "Synthetic" or "Felt" or "Unknown"
roof.ridgeCapGrade: "3-Tab" or "H&R" or "Hi Profile"
roof.ridgeVentType: "Metal" or "Shingle Over"
roof.starterStyle: "Starter Strip" or "3-Tab"
roof.valleyStyle: "Ice & Water" or "W-Valley" or "Valley Metal"
roof.boxVentMaterial: "Metal" or "Plastic" or "Wood"
roof.turbineMaterial: "Metal" or "Plastic"
roof.pipeJackType: "3-in-1/Neoprene" or "Lead" or "Lifetime/Silicone"
roof.exhaustStackDamageTo: array, values from ["Flange","Stack","Cap"]
roof.kickoutsPresent: "Yes" or "No"
roof.kickoutsNeeded: "Yes" or "No"
roof.counterFlashingCondition: "Replace" or "Reuse"
roof.chimneySize: "Small" (width < 24in) or "Medium" (24–36in) or "Large" (> 36in)
roof.lowSlopeLocation: "Front Porch" or "Back Porch" or "Other"
roof.exposedRafters: "Yes" or "No"

elevations.[direction].gutterMaterial: "Aluminum" or "Steel" or "Copper" or "Vinyl"
elevations.[direction].gutterSize: "4\\"" or "5\\"" or "6\\""
elevations.[direction].downspoutMaterial: "Aluminum" or "Steel" or "Copper" or "Vinyl"
elevations.[direction].sidingMaterial: "Vinyl" or "Aluminum" or "Wood" or "Fiber Cement" or "Stucco" or "Brick" or "Stone" or "EIFS"
elevations.[direction].fasciaMaterial: "Wood" or "Aluminum" or "Vinyl" or "Fiber Cement"
elevations.[direction].soffitMaterial: "Wood" or "Aluminum" or "Vinyl" or "Fiber Cement"
elevations.[direction].shutterMaterial: "Wood" or "Vinyl" or "Aluminum" or "Composite"
elevations.[direction].doorMaterial: "Steel" or "Fiberglass" or "Wood" or "Aluminum"
elevations.[direction].garageDoorMaterial: "Steel" or "Wood" or "Aluminum" or "Fiberglass"
elevations.[direction].garageDoorPanelStyle: "Raised Panel" or "Flush Panel" or "Carriage Style"

exterior.fenceMaterial: array, values from ["Pine","Cedar","Other Wood","Vinyl","Aluminum","Rod Iron"]
exterior.fenceStyle: "Privacy" or "Board on Board" or "Picket"
exterior.fencePosts: "Metal Rod" or "4x4" or "6x6"
exterior.outdoorDamagedItems: array, values from ["Grill / Cover","Outdoor Furniture","Playset","Trampoline","Table Umbrella","Retractable Awning","Landscape Lighting","Potted Plants","Other"]

jobInfo.cust: if multiple customers, separate names with a comma and space (e.g. "John Jones, Mary Jones" or "Tim Cain, Cathy Trip")
jobInfo.residenceType: "Primary", "Secondary", or "Rental" property type
jobInfo.hasSeparateContact: "Yes" or "No" (Yes if a separate contact person is mentioned)
jobInfo.preferredContact: comma-separated from Phone, Email, Text
jobInfo.contactPreferredContact: comma-separated from Phone, Email, Text (for the separate contact)
jobInfo.claimFileDate: ISO date YYYY-MM-DD when the insurance claim was filed
jobInfo.stormDate: ISO date YYYY-MM-DD when the storm or loss event occurred

Return this exact structure (use null for any field not mentioned in the transcript):
{
  "jobInfo": {
    "cust": null, "phone": null, "email": null, "addr": null,
    "pm": null, "insp": null, "ins": null, "claim": null,
    "claimFileDate": null, "stormDate": null, "preferredContact": null, "residenceType": null,
    "tenantname": null, "tenantphone": null,
    "hasSeparateContact": null, "contactName": null, "contactPhone": null,
    "contactEmail": null, "contactPreferredContact": null
  },
  "roof": {
    "shingleStyle": null, "stories": null, "layers": null, "pitch": null,
    "edgeFlashingType": null, "edgeMaterial": null, "edgePainted": null,
    "underlaymentPresent": null, "underlaymentGrade": null, "underlaymentLayers": null,
    "ridgeCapGrade": null, "ridgeCapExposure": null,
    "starterPresent": null, "starterStyle": null,
    "valleyPresent": null, "valleyStyle": null,
    "ridgeVentLF": null, "ridgeVentType": null, "ridgeVentPainted": null,
    "boxVentQty": null, "boxVentMaterial": null, "boxVentPainted": null,
    "turbineQty": null, "turbineMaterial": null, "turbinePainted": null,
    "powerVentQty": null, "powerVentPainted": null,
    "solarVentQty": null,
    "pipeJackType": null, "pipeJack15qty": null, "pipeJack2qty": null,
    "pipeJack3qty": null, "pipeJack4qty": null, "pipeJackPainted": null,
    "exhaustStackDamaged": null, "exhaustStackDamageTo": null, "exhaustStackPainted": null,
    "kickoutsPresent": null, "kickoutsNeeded": null, "kickoutsPainted": null,
    "rainDiverterQty": null, "rainDiverterLF": null, "rainDiverterPainted": null,
    "powerMeterMastQty": null,
    "chimneyDamaged": null, "chimneySize": null, "chimneyQty": null, "cricketPresent": null,
    "chimneyPainted": null, "counterFlashingCondition": null, "chimneyConditionNotes": null,
    "stepFlashingPresent": null, "stepFlashingDamaged": null, "stepFlashingPainted": null,
    "counterFlashingPresent": null, "counterFlashingDamaged": null, "counterFlashingPainted": null,
    "lFlashingPresent": null, "lFlashingDamaged": null, "lFlashingPainted": null,
    "lowSlopeLocation": null, "lowSlopeGrade": null, "lowSlopePitch": null,
    "lowSlopeDamaged": null, "exposedRafters": null
  },
  "elevations": {
    "Front": {
      "sidingMaterial": null, "sidingDamage": null,
      "fasciaMaterial": null, "fasciaDamage": null,
      "soffitMaterial": null, "soffitDamage": null,
      "gutterMaterial": null, "gutterSize": null, "gutterDamage": null,
      "downspoutQty": null, "downspoutMaterial": null, "downspoutDamage": null,
      "screenQty": null, "screenDamage": null,
      "shutterMaterial": null, "shutterQty": null, "shutterDamage": null,
      "doorQty": null, "doorMaterial": null, "stormDoor": null, "doorDamage": null,
      "garageDoorQty": null, "garageDoorMaterial": null, "garageDoorPanelStyle": null, "garageDoorDamage": null,
      "acPresent": null, "acDamage": null,
      "notes": null
    },
    "Right": {
      "sidingMaterial": null, "sidingDamage": null,
      "fasciaMaterial": null, "fasciaDamage": null,
      "soffitMaterial": null, "soffitDamage": null,
      "gutterMaterial": null, "gutterSize": null, "gutterDamage": null,
      "downspoutQty": null, "downspoutMaterial": null, "downspoutDamage": null,
      "screenQty": null, "screenDamage": null,
      "shutterMaterial": null, "shutterQty": null, "shutterDamage": null,
      "doorQty": null, "doorMaterial": null, "stormDoor": null, "doorDamage": null,
      "garageDoorQty": null, "garageDoorMaterial": null, "garageDoorPanelStyle": null, "garageDoorDamage": null,
      "acPresent": null, "acDamage": null,
      "notes": null
    },
    "Rear": {
      "sidingMaterial": null, "sidingDamage": null,
      "fasciaMaterial": null, "fasciaDamage": null,
      "soffitMaterial": null, "soffitDamage": null,
      "gutterMaterial": null, "gutterSize": null, "gutterDamage": null,
      "downspoutQty": null, "downspoutMaterial": null, "downspoutDamage": null,
      "screenQty": null, "screenDamage": null,
      "shutterMaterial": null, "shutterQty": null, "shutterDamage": null,
      "doorQty": null, "doorMaterial": null, "stormDoor": null, "doorDamage": null,
      "garageDoorQty": null, "garageDoorMaterial": null, "garageDoorPanelStyle": null, "garageDoorDamage": null,
      "acPresent": null, "acDamage": null,
      "notes": null
    },
    "Left": {
      "sidingMaterial": null, "sidingDamage": null,
      "fasciaMaterial": null, "fasciaDamage": null,
      "soffitMaterial": null, "soffitDamage": null,
      "gutterMaterial": null, "gutterSize": null, "gutterDamage": null,
      "downspoutQty": null, "downspoutMaterial": null, "downspoutDamage": null,
      "screenQty": null, "screenDamage": null,
      "shutterMaterial": null, "shutterQty": null, "shutterDamage": null,
      "doorQty": null, "doorMaterial": null, "stormDoor": null, "doorDamage": null,
      "garageDoorQty": null, "garageDoorMaterial": null, "garageDoorPanelStyle": null, "garageDoorDamage": null,
      "acPresent": null, "acDamage": null,
      "notes": null
    }
  },
  "exterior": {
    "fenceMaterial": null, "fenceStyle": null, "fencePosts": null,
    "fencePostSpacing": null, "fenceHeight": null, "fenceStained": null,
    "fenceDamage": null, "gatesQty": null, "gatesMaterial": null, "gatesDamage": null,
    "poolCoverDamaged": null, "poolEquipmentDamaged": null, "poolDamageNotes": null,
    "outdoorDamagedItems": null, "outdoorNotes": null,
    "deliveryPlacement": null, "landscapingProtect": null,
    "okSaturdayBuild": null, "pestControlFlashing": null,
    "gateCode": null, "overheadClearanceIssue": null
  },
  "notes": {
    "summary": null, "concerns": null, "homeage": null, "crosssell": null,
    "roof": null, "roofage": null, "defects": null, "homeowner": null, "misc": null
  },
  "flags": []
}`

		const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': env.ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: 'claude-sonnet-4-6',
				max_tokens: 4096,
				system: systemPrompt,
				messages: [{ role: 'user', content: `TRANSCRIPT:\n\n${transcript}` }],
			}),
		})

		if (!anthropicResp.ok) {
			const err = await anthropicResp.text()
			return cors(JSON.stringify({ error: `Anthropic error: ${anthropicResp.status}`, detail: err }), origin, 502)
		}

		const anthropicData = await anthropicResp.json() as { content: { text: string }[] }
		let raw = anthropicData.content?.[0]?.text || ''

		// Strip markdown fences if present
		raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
		const jsonStart = raw.indexOf('{')
		const jsonEnd = raw.lastIndexOf('}')
		if (jsonStart > -1 && jsonEnd > jsonStart) raw = raw.substring(jsonStart, jsonEnd + 1)
		raw = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

		// Validate it's parseable before returning
		try {
			JSON.parse(raw)
		} catch {
			return cors(JSON.stringify({ error: 'AI returned malformed JSON', raw }), origin, 502)
		}

		return cors(raw, origin)
	},
}
