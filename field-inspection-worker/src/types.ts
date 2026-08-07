export interface Env {
	ANTHROPIC_API_KEY: string
	GOOGLE_CLIENT_ID: string
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
