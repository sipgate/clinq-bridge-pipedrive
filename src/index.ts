import { Adapter, ServerError, start } from "@clinq/bridge";
import {
	createContact as createContactV1,
	deleteContact as deleteContactV1,
	getContacts as getContactsV1,
	updateContact as updateContactV1,
	handleCallEvent as handleCallEventV1
} from "./v1";
import {
	createContact as createContactV2,
	deleteContact as deleteContactV2,
	getContacts as getContactListV2,
	getOAuth2RedirectUrl,
	handleOAuth2Callback,
	updateContact as updateContactV2
} from "./v2";

const adapter: Adapter = {
	getContacts: async config => {
		if (!config.apiKey) {
			throw new ServerError(401, "Unauthorized");
		}

		if (config.apiUrl) {
			return getContactListV2(config);
		}

		return getContactsV1(config.apiKey);
	},
	createContact: async (config, contact) => {
		if (!config.apiKey) {
			throw new ServerError(401, "Unauthorized");
		}

		if (config.apiUrl) {
			return createContactV2(config, contact);
		}

		return createContactV1(config.apiKey, contact);
	},
	updateContact: async (config, id, contact) => {
		if (!config.apiKey) {
			throw new ServerError(401, "Unauthorized");
		}

		if (config.apiUrl) {
			return updateContactV2(config, id, contact);
		}

		return updateContactV1(config.apiKey, id, contact);
	},
	deleteContact: async (config, id) => {
		if (!config.apiKey) {
			throw new ServerError(401, "Unauthorized");
		}

		if (config.apiUrl) {
			return deleteContactV2(config, id);
		}

		return deleteContactV1(config.apiKey, id);
	},
	getOAuth2RedirectUrl,
	handleOAuth2Callback,
	handleCallEvent: async (config, callEvent) => {
		if (!config.apiKey) {
			throw new ServerError(401, "Unauthorized");
		}

		if (config.apiUrl) {
			return;
		}

		return handleCallEventV1(config.apiKey, callEvent);
	},
};

start(adapter);
