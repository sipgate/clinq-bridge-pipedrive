const Clinq = require("@clinq/bridge");
const {
  getContactList,
  createContact,
  updateContact,
  deleteContact
} = require("./clinq-pipedrive-adapter");

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
  },
  updateContact: async ({ apiKey }, id, contact) => {
    if (!apiKey) {
      Clinq.unauthorized();
    }
    return updateContact(apiKey, id, contact);
  },
  deleteContact: async ({ apiKey }, id) => {
    if (!apiKey) {
      Clinq.unauthorized();
    }
    return deleteContact(apiKey, id);
  }
};

Clinq.start(adapter);
