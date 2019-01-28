const { ServerError } = require("@clinq/bridge");
const { promisify } = require("util");
const Pipedrive = require("pipedrive");
const HARD_MAX = 40000;
const cache = [];

function anonymizeKey(apiKey) {
  return `*****${apiKey.substr(apiKey.length - 5)}`;
}

const formatNumber = number => {
  let p = number.replace(/[^0-9+]/gi, "");
  p = p.replace(/^00/, "");
  p = p.replace(/^\+/, "");
  p = "+" + p.replace(/^0/, "49");
  return p;
};

const capitalizeFirstLetter = string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const mapResult = (contacts, companyIdentifier) =>
  contacts
    .filter(contact => contact.name)
    .filter(contact => contact.phone.length > 0)
    .map(contact => convertFromPipedriveContact(contact, companyIdentifier));

const getAll = async (client, params) => {
  return new Promise(resolve => {
    client.Persons.getAll(params, function(error, data, additional) {
      resolve({ contacts: data, info: additional });
    });
  });
};

const loadPage = async (offset, cache, client, companyIdentifier) => {
  const options = {
    start: offset,
    limit: 100
  };
  return getAll(client, options).then(data => {
    const mapped = mapResult(data.contacts, companyIdentifier).concat(cache);
    if (
      data.info["pagination"]["more_items_in_collection"] &&
      mapped.length <= HARD_MAX
    ) {
      offset =
        data.info["pagination"]["limit"] + data.info["pagination"]["start"];
      return loadPage(offset, mapped, client);
    } else {
      return mapped;
    }
  });
};

const getCompanyIdentifier = async client => {
  const user = await promisify(client.Users.get)("self");
  if (!(user.companies && user.company_id)) {
    return null;
  }
  const company = user.companies[user.company_id];
  return (company && company.identifier) || null;
};

function convertToPipedriveContact(contact) {
  return {
    name: contact.name,
    email: contact.email ? contact.email : null,
    phone: contact.phoneNumbers.map(phoneNumber => ({
      label: phoneNumber.label ? phoneNumber.label : "Other",
      value: phoneNumber.phoneNumber
    }))
  };
}

function convertFromPipedriveContact(contact, companyIdentifier) {
  return {
    id: String(contact.id),
    name: contact.name,
    company: contact.org_name || null,
    email: contact.email.length > 0 ? contact.email[0].value : null,
    contactUrl: companyIdentifier
      ? `https://${companyIdentifier}.pipedrive.com/person/${contact.id}`
      : null,
    avatarUrl: null,
    phoneNumbers: contact.phone
      .filter(phoneNumber => phoneNumber.value)
      .map(phoneNumber => ({
        label: phoneNumber.label
          ? capitalizeFirstLetter(phoneNumber.label)
          : null,
        phoneNumber: formatNumber(phoneNumber.value)
      }))
  };
}

async function getContactList(apiKey) {
  const client = new Pipedrive.Client(apiKey, { strictMode: true });
  const anonymizedKey = anonymizeKey(apiKey);

  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unautherized for ${anonymizedKey}`);
    throw new ServerError(401, "Unautherized");
  }

  const companyIdentifier = await getCompanyIdentifier(client);
  loadPage(0, [], client, companyIdentifier).then(response => {
    cache[apiKey] = response;
  });

  return cache[apiKey] || [];
}

async function createContact(apiKey, contact) {
  const client = new Pipedrive.Client(apiKey, { strictMode: true });
  const companyIdentifier = await getCompanyIdentifier(client);

  const anonymizedKey = anonymizeKey(apiKey);
  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unautherized for ${anonymizedKey}`);
    throw new ServerError(401, "Unauthorized");
  }
  const convertedContact = convertToPipedriveContact(contact);
  const response = await promisify(client.Persons.add)(convertedContact);

  return convertFromPipedriveContact(response, companyIdentifier);
}

async function updateContact(apiKey, id, contact) {
  const client = new Pipedrive.Client(apiKey, { strictMode: true });
  const companyIdentifier = await getCompanyIdentifier(client);
  const anonymizedKey = anonymizeKey(apiKey);
  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unautherized for ${anonymizedKey}`);
    throw new ServerError(401, "Unauthorized");
  }
  const convertedContact = convertToPipedriveContact(contact);
  const response = await promisify(client.Persons.update)(id, convertedContact);

  return convertFromPipedriveContact(response, companyIdentifier);
}

async function deleteContact(apiKey, id) {
  const client = new Pipedrive.Client(apiKey, { strictMode: true });
  const anonymizedKey = anonymizeKey(apiKey);
  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unautherized for ${anonymizedKey}`);
    throw new ServerError(401, "Unauthorized");
  }
  const response = await promisify(client.Persons.remove)(id);
}

module.exports = {
  getContactList,
  createContact,
  updateContact,
  deleteContact
};
