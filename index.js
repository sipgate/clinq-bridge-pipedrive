const Clinq = require("@clinq/bridge");
const PipedriveClinq = require("./clinq-pipedrive-adapter");

const adapter = {
	getContacts: async ({ apiKey }) => {
		if (!apiKey) {
			Clinq.unauthorized();
		}
		return PipedriveClinq.getContactList(apiKey)
	}
};

Clinq.start(adapter);
