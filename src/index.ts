import { Adapter, ServerError, start } from "@clinq/bridge";
import {
  createContact,
  deleteContact,
  getContactList,
  updateContact
} from "./clinq-pipedrive-adapter";

const adapter: Adapter = {
  getContacts: async ({ apiKey }) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return getContactList(apiKey);
  },
  createContact: async ({ apiKey }, contact) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return createContact(apiKey, contact);
  },
  updateContact: async ({ apiKey }, id, contact) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return updateContact(apiKey, id, contact);
  },
  deleteContact: async ({ apiKey }, id) => {
    if (!apiKey) {
      throw new ServerError(401, "Unauthorized");
    }
    return deleteContact(apiKey, id);
  }
};

start(adapter);
