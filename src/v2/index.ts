import {
	Config,
	Contact,
	ContactTemplate,
	ContactUpdate,
	PhoneNumber,
	PhoneNumberLabel,
	ServerError
} from "@clinq/bridge";
import axios, { AxiosInstance } from "axios";
import { Request } from "express";
import { stringify } from "querystring";
import parseEnvironment from "../parse-environment";
import {
	PipedrivePaginatedResponse,
	PipedrivePerson,
	PipedrivePersonTemplate,
	PipedrivePhone,
	PipedriveResponse,
	PipedriveUser
} from "./pipedrive.model";

function parseFromPipedriveLabel(label: string) {
	switch (label.toLowerCase()) {
		case "work":
			return PhoneNumberLabel.WORK;
		case "home":
			return PhoneNumberLabel.HOME;
		case "mobile":
			return PhoneNumberLabel.MOBILE;
		default:
			return PhoneNumberLabel.WORK;
	}
}

function parseToPipedriveLabel(label: PhoneNumberLabel) {
	switch (label) {
		case PhoneNumberLabel.WORK:
			return "Work";
		case PhoneNumberLabel.HOME:
			return "Home";
		case PhoneNumberLabel.MOBILE:
			return "Mobile";
		default:
			return "Other";
	}
}

const getCompanyDomain = async (client: AxiosInstance) => {
	try {
		const {
			data: { data: user }
		} = await client.get<PipedriveResponse<PipedriveUser>>("/users/me");
		return user ? user.company_domain : null;
	} catch (error) {
		return null;
	}
};

const paginatePersons = async (
	client: AxiosInstance,
	accumulator: Contact[],
	offset: number,
	companyDomain: string | null
): Promise<Contact[]> => {
	const options = {
		start: offset,
		limit: 100
	};

	const {
		data: {
			data: persons,
			additional_data: {
				pagination: { more_items_in_collection, limit, start }
			}
		}
	} = await client.get<PipedrivePaginatedResponse<PipedrivePerson[]>>(
		`/persons?${stringify(options)}`
	);

	const mapped = persons
		? [...accumulator, ...persons.map(convertPersonToContact(companyDomain))]
		: accumulator;

	if (more_items_in_collection) {
		offset = limit + start;
		console.log({ more_items_in_collection, limit, start });
		return paginatePersons(client, mapped, offset, companyDomain);
	} else {
		return mapped;
	}
};

function convertPersonToContact(companyDomain: string | null) {
	return (person: PipedrivePerson): Contact => {
		const email = person.email.find(Boolean);
		return {
			id: String(person.id),
			name: person.name,
			firstName: null,
			lastName: null,
			organization: person.org_name || null,
			email: email && email.value ? email.value : null,
			contactUrl: companyDomain
				? `https://${companyDomain}.pipedrive.com/person/${person.id}`
				: null,
			avatarUrl: null,
			phoneNumbers: person.phone
				.filter((phoneNumber: PipedrivePhone) => phoneNumber.value)
				.map((phoneNumber: PipedrivePhone) => ({
					label: parseFromPipedriveLabel(phoneNumber.label),
					phoneNumber: phoneNumber.value
				}))
		};
	};
}

function convertToPipedriveContact(
	contact: ContactTemplate
): PipedrivePersonTemplate {
	const phone = contact.phoneNumbers
		? contact.phoneNumbers.map(
				(phoneNumber: PhoneNumber): PipedrivePhone => ({
					label: parseToPipedriveLabel(phoneNumber.label),
					value: phoneNumber.phoneNumber
				})
		  )
		: [];

	return {
		name: contact.name || "",
		email: contact.email || "",
		phone
	};
}

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
	try {
		const client = await getClient(config);
		const companyDomain = await getCompanyDomain(client);
		const contacts = await paginatePersons(client, [], 0, companyDomain);
		return contacts;
	} catch (error) {
		throw new ServerError(
			500,
			`Could not get contacts. (${error.response.data.error})`
		);
	}
}

export async function createContact(config: Config, contact: ContactTemplate) {
	const client = await getClient(config);
	const companyDomain = await getCompanyDomain(client);

	const convertedContact = convertToPipedriveContact(contact);

	const { data } = await client.post<PipedriveResponse<PipedrivePerson>>(
		"/persons",
		convertedContact
	);

	if (!data.data) {
		throw new ServerError(400, "Could not create contact");
	}

	return convertPersonToContact(companyDomain)(data.data);
}

export async function updateContact(
	config: Config,
	id: string,
	contact: ContactUpdate
) {
	const client = await getClient(config);
	const companyDomain = await getCompanyDomain(client);

	const convertedContact = convertToPipedriveContact(contact);

	const { data } = await client.post<PipedriveResponse<PipedrivePerson>>(
		`/persons/${id}`,
		convertedContact
	);

	if (!data.data) {
		throw new ServerError(400, "Could not update contact");
	}

	return convertPersonToContact(companyDomain)(data.data);
}

export async function deleteContact(config: Config, id: string) {
	const client = await getClient(config);
	await client.delete(`/persons/${id}`);
}

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
