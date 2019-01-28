const Clinq = require("@clinq/bridge");
const { getContactList, createContact } = require("./clinq-pipedrive-adapter");

const adapter = {
  getContacts: async ({ apiKey }) => {
    if (!apiKey) {
      Clinq.unauthorized();
    }
    return getContactList(apiKey);
  },
  createContact: async ({ apiKey }, contact) => {
    if (!apiKey) {
      Clinq.unauthorized();
    }
    return createContact(apiKey, contact);
  }
};

Clinq.start(adapter);
