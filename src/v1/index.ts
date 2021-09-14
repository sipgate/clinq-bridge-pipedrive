import {
	CallDirection,
	CallEvent,
	Contact,
	ContactTemplate,
	ContactUpdate,
	PhoneNumberLabel,
	ServerError,
} from "@clinq/bridge";
import { Client } from "pipedrive";
import { promisify } from "util";
import { formatDate, formatDuration, formatTime } from "./date-utils";
import { parsePhoneNumber } from "./parse-phone-number";

const HARD_MAX = 40000;

function anonymizeKey(apiKey: string) {
	return `*****${apiKey.substr(apiKey.length - 5)}`;
}

const mapResult = (contacts: any[], companyDomain?: string) =>
	contacts
		.filter((contact) => contact.name)
		.filter((contact) => contact.phone.length > 0)
		.map((contact) => convertFromPipedriveContact(contact, companyDomain));

const getAll = async (client: any, params: any) => {
	return new Promise((resolve) => {
		client.Persons.getAll(params, (error: any, data: any, additional: any) => {
			resolve({
				contacts: data,
				info: additional,
			});
		});
	});
};

const loadPage = async (
	offset: number,
	accumulator: any,
	client: any,
	companyDomain?: string
): Promise<Contact[]> => {
	const options = {
		start: offset,
		limit: 100,
	};
	return getAll(client, options).then((data: any) => {
		const mapped = mapResult(data.contacts, companyDomain).concat(accumulator);
		if (
			data.info.pagination.more_items_in_collection &&
			mapped.length <= HARD_MAX
		) {
			offset = data.info.pagination.limit + data.info.pagination.start;
			return loadPage(offset, mapped, client, companyDomain);
		} else {
			return mapped;
		}
	});
};

const getCompanyDomain = async (client: any) => {
	const user = await promisify(client.Users.get)("me");
	if (!user.company_domain) {
		return null;
	}
	return user.company_domain;
};

function convertToPipedriveContact(contact: any) {
	const phone = contact.phoneNumbers
		? contact.phoneNumbers.map((phoneNumber: any) => ({
				label: parseToPipedriveLabel(phoneNumber.label),
				value: phoneNumber.phoneNumber,
		  }))
		: [];
	return {
		name: contact.name,
		email: contact.email ? contact.email : null,
		phone,
	};
}

function convertFromPipedriveContact(contact: any, companyDomain?: string) {
	return {
		id: String(contact.id),
		name: contact.name,
		firstName: null,
		lastName: null,
		organization: contact.org_name || null,
		email: contact.email.length > 0 ? contact.email[0].value : null,
		contactUrl: companyDomain
			? `https://${companyDomain}.pipedrive.com/person/${contact.id}`
			: null,
		avatarUrl: null,
		phoneNumbers: contact.phone
			.filter((phoneNumber: any) => phoneNumber.value)
			.map((phoneNumber: any) => ({
				label: parseFromPipedriveLabel(phoneNumber.label),
				phoneNumber: phoneNumber.value,
			})),
	};
}

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
			return "work";
		case PhoneNumberLabel.HOME:
			return "home";
		case PhoneNumberLabel.MOBILE:
			return "mobile";
		default:
			return "";
	}
}

async function getClient(apiKey: string): Promise<any> {
	const client = new Client(apiKey, {
		strictMode: true,
	});

	const anonymizedKey = anonymizeKey(apiKey);

	try {
		await promisify(client.Currencies.getAll)();
	} catch (error) {
		console.log(`Unauthorized for ${anonymizedKey}`);
		throw new ServerError(401, "Unauthorized");
	}

	return client;
}

async function findPerson(client: any, term: string): Promise<any> {
	const persons = await promisify(client.Persons.find)({ term });
	return persons.find(Boolean);
}

export async function getContacts(apiKey: string) {
	const client = await getClient(apiKey);
	const companyDomain = await getCompanyDomain(client);

	return loadPage(0, [], client, companyDomain);
}

export async function createContact(apiKey: string, contact: ContactTemplate) {
	const client = await getClient(apiKey);
	const companyDomain = await getCompanyDomain(client);
	const convertedContact = convertToPipedriveContact(contact);
	const response = await promisify(client.Persons.add)(convertedContact);

	return convertFromPipedriveContact(response, companyDomain);
}

export async function updateContact(
	apiKey: string,
	id: string,
	contact: ContactUpdate
) {
	const client = await getClient(apiKey);
	const companyDomain = await getCompanyDomain(client);
	const convertedContact = convertToPipedriveContact(contact);
	const response = await promisify(client.Persons.update)(id, convertedContact);

	return convertFromPipedriveContact(response, companyDomain);
}

export async function deleteContact(apiKey: string, id: string) {
	const client = await getClient(apiKey);

	await promisify(client.Persons.remove)(id);
}

export async function handleCallEvent(
	apiKey: string,
	{ from, to, start, end, direction, channel }: CallEvent
) {
	try {
		const client = await getClient(apiKey);
		const types = await promisify(client.ActivityTypes.getAll)();
		const callTypeSupported = types.some(
			(type: any) => type.key_string === "call"
		);
		if (!callTypeSupported) {
			return;
		}
		const phoneNumber = parsePhoneNumber(
			direction === CallDirection.IN ? from : to
		);
		const persons = await Promise.all([
			findPerson(client, phoneNumber.e164),
			findPerson(client, phoneNumber.e164.replace(/\D/g, "")),
			findPerson(client, phoneNumber.localized),
			findPerson(client, phoneNumber.localized.replace(/\D/g, "")),
		]);
		const person = persons.find(Boolean);
		if (!person) {
			console.warn(`Could not find person for ${phoneNumber.e164}`);
			return;
		}
		const directionInfo =
			direction === CallDirection.IN ? "Incoming" : "Outgoing";
		const duration = formatDuration(end - start);
		const date = formatDate(start);
		const timeOfDay = formatTime(start);
		const activity = {
			type: "call",
			subject: `${directionInfo} CLINQ call in "${channel.name}"`,
			done: 1,
			duration,
			due_date: date,
			due_time: timeOfDay,
			person_id: person.id,
		};
		await promisify(client.Activities.add)(activity);
	} catch (error) {
		console.error("Could not save call event", error.message);
		throw new ServerError(400, "Could not save call event");
	}
}
