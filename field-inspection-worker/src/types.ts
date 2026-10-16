export interface Env {
	ANTHROPIC_API_KEY: string
	GOOGLE_CLIENT_ID: string
	/** "TC:<client id>,PT:<client id>" — OAuth clients of the portals (ID-token audiences). */
	PORTAL_GOOGLE_CLIENTS: string
	/** Per-portal Google Sheets access for reading each portal's UserPermissions tab. */
	TC_GS_CLIENT_ID?: string
	TC_GS_CLIENT_SECRET?: string
	TC_GS_REFRESH_TOKEN?: string
	TC_GS_SHEET_ID?: string
	PT_GS_CLIENT_ID?: string
	PT_GS_CLIENT_SECRET?: string
	PT_GS_REFRESH_TOKEN?: string
	PT_GS_SHEET_ID?: string
	SESSION_SECRET: string
	INSPECTIONS: R2Bucket
	PERMISSIONS: KVNamespace
}

export type Role = 'sales' | 'supervisor' | 'admin'

export type PermissionsDoc = {
	users: Array<{ email: string; role: Role }>
}

export type AuthUser = {
	email: string
	name: string
	picture?: string
	role: Role
	org: 'PT' | 'TC'
}
