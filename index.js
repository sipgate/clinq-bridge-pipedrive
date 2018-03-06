const Clinq = require("clinq-crm-bridge");
const PipedriveClinq = require("./clinq-pipedrive-adapter");

const adapter = {
	getContacts: async ({ apiKey, apiUrl }) => {
        return PipedriveClinq.getContactList(apiKey)
	}
};

Clinq.start(adapter);