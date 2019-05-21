export interface PipedriveOAuthResponse {
	access_token: string;
	refresh_token: string;
}

export interface PipedriveField {
	value: string;
	primary?: boolean;
}

export interface PipedrivePhone extends PipedriveField {
	label: string;
}

export interface PipedrivePerson {
	id: string;
	org_name: string;
	name: string;
	email: PipedriveField[];
	phone: PipedrivePhone[];
}

export interface PipedrivePersonTemplate {
	name: string;
	email: string;
	phone: PipedrivePhone[];
}

export interface PipedriveUser {
	id: string;
	name: string;
	email: string;
	company_domain: string;
}

export interface PipedrivePaginationInfo {
	start: 0;
	limit: 100;
	more_items_in_collection: true;
	next_start: 100;
}

export interface PipedriveAdditionalData {
	pagination: PipedrivePaginationInfo;
}

export interface PipedriveResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	additional_data: PipedriveAdditionalData;
}

export interface PipedrivePaginatedResponse<T> extends PipedriveResponse<T> {
	additional_data: PipedriveAdditionalData;
}
