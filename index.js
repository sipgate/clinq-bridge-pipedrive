const {
  ServerError,
  start
} = require("@clinq/bridge");
const {
  getContactList,
  createContact,
  updateContact,
  deleteContact
} = require("./clinq-pipedrive-adapter");

const adapter = {
  getContacts: async ({
    apiKey
  }) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return getContactList(apiKey);
  },
  createContact: async ({
    apiKey
  }, contact) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return createContact(apiKey, contact);
  },
  updateContact: async ({
    apiKey
  }, id, contact) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return updateContact(apiKey, id, contact);
  },
  deleteContact: async ({
    apiKey
  }, id) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return deleteContact(apiKey, id);
  }
};

start(adapter);
