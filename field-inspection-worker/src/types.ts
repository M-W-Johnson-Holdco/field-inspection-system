export interface Env {
	ANTHROPIC_API_KEY: string
	GOOGLE_CLIENT_ID: string
	/** Comma-separated OAuth client IDs of the TC/PT portals (ID-token audiences). */
	PORTAL_GOOGLE_CLIENT_IDS: string
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
