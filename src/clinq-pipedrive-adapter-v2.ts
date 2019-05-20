import { Config, Contact, ContactTemplate, ContactUpdate } from "@clinq/bridge";
import axios from "axios";
import { Request } from "express";
import { stringify } from "querystring";
import parseEnvironment from "./parse-environment";

async function getClient({ apiKey, apiUrl }: Config) {
	const { clientId, clientSecret } = parseEnvironment();
	const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

	const { data } = await axios.post<{
		access_token: string;
		refresh_token: string;
	}>(
		"https://oauth.pipedrive.com/oauth/token",
		stringify({
			grant_type: "refresh_token",
			refresh_token: apiKey
		}),
		{
			headers: {
				Authorization: `Basic ${auth}`,
				"Content-Type": "application/x-www-form-urlencoded"
			}
		}
	);

	return axios.create({
		baseURL: apiUrl,
		headers: {
			Authorization: `Bearer ${data.access_token}`
		}
	});
}

export async function getContacts(config: Config) {
	return [];
}

export async function createContact(
	config: Config,
	contact: ContactTemplate
): Promise<Contact> {
	return {
		id: "foo",
		email: "foo@example.com",
		firstName: "Foo",
		lastName: "Foo",
		organization: "Foo",
		phoneNumbers: [],
		avatarUrl: null,
		contactUrl: null,
		name: "Foo"
	};
}

export async function updateContact(
	config: Config,
	id: string,
	contact: ContactUpdate
) {
	return {
		id: "foo",
		email: "foo@example.com",
		firstName: "Foo",
		lastName: "Foo",
		organization: "Foo",
		phoneNumbers: [],
		avatarUrl: null,
		contactUrl: null,
		name: "Foo"
	};
}

export async function deleteContact(config: Config, id: string) {}

export async function getOAuth2RedirectUrl() {
	const { clientId, redirectUrl } = parseEnvironment();
	const query = {
		client_id: clientId,
		redirect_uri: redirectUrl
	};
	return `https://oauth.pipedrive.com/oauth/authorize?${stringify(query)}`;
}

export async function handleOAuth2Callback(req: Request) {
	const { clientId, clientSecret, redirectUrl } = parseEnvironment();
	const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

	try {
		const { data } = await axios.post<{
			access_token: string;
			refresh_token: string;
		}>(
			"https://oauth.pipedrive.com/oauth/token",
			stringify({
				grant_type: "authorization_code",
				code: req.query.code,
				redirect_uri: redirectUrl
			}),
			{
				headers: {
					Authorization: `Basic ${auth}`,
					"Content-Type": "application/x-www-form-urlencoded"
				}
			}
		);
		return {
			apiKey: data.refresh_token,
			apiUrl: "https://api-proxy.pipedrive.com"
		};
	} catch (error) {
		console.error(error);
		throw error;
	}
}
