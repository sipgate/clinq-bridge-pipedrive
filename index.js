const Clinq = require("@clinq/bridge");
const PipedriveClinq = require("./clinq-pipedrive-adapter");

const adapter = {
	getContacts: async ({ apiKey }) => {
		if (!apiKey) {
			throw new Error("Unauthorized");
		}
		return PipedriveClinq.getContactList(apiKey)
	}
};

Clinq.start(adapter);
