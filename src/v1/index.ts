
import { Contact, ContactTemplate, ContactUpdate, PhoneNumberLabel, ServerError } from "@clinq/bridge";
import { Client } from "pipedrive";
import { promisify } from "util";

const HARD_MAX = 40000;

function anonymizeKey(apiKey: string) {
  return `*****${apiKey.substr(apiKey.length - 5)}`;
}

const formatNumber = (phoneNumber: string) => {
  let p = phoneNumber.replace(/[^0-9+]/gi, "");
  p = p.replace(/^00/, "");
  p = p.replace(/^\+/, "");
  p = "+" + p.replace(/^0/, "49");
  return p;
};

const mapResult = (contacts:any[], companyIdentifier?:string) =>
  contacts
    .filter(contact => contact.name)
    .filter(contact => contact.phone.length > 0)
    .map(contact => convertFromPipedriveContact(contact, companyIdentifier));

const getAll = async (client:any, params:any) => {
  return new Promise(resolve => {
    client.Persons.getAll(params, (error:any, data:any, additional:any) => {
      resolve({
        contacts: data,
        info: additional
      });
    });
  });
};

const loadPage = async (offset:number, accumulator:any, client:any, companyIdentifier?:string): Promise<Contact[]> => {
  const options = {
    start: offset,
    limit: 100
  };
  return getAll(client, options).then((data:any) => {
    const mapped = mapResult(data.contacts, companyIdentifier).concat(
      accumulator
    );
    if (
      data.info.pagination.more_items_in_collection &&
      mapped.length <= HARD_MAX
    ) {
      offset =
        data.info.pagination.limit + data.info.pagination.start;
      return loadPage(offset, mapped, client);
    } else {
      return mapped;
    }
  });
};

const getCompanyIdentifier = async (client:any) => {
  const user = await promisify(client.Users.get)("self");
  if (!(user.companies && user.company_id)) {
    return null;
  }
  const company = user.companies[user.company_id];
  return (company && company.identifier) || null;
};

function convertToPipedriveContact(contact:any) {
  const phone = contact.phoneNumbers
    ? contact.phoneNumbers.map((phoneNumber:any) => ({
        label: parseToPipedriveLabel(phoneNumber.label),
        value: phoneNumber.phoneNumber
      }))
    : [];
  return {
    name: contact.name,
    email: contact.email ? contact.email : null,
    phone
  };
}

function convertFromPipedriveContact(contact:any, companyIdentifier?:string) {
  return {
    id: String(contact.id),
    name: contact.name,
    firstName: null,
    lastName: null,
    organization: contact.org_name || null,
    email: contact.email.length > 0 ? contact.email[0].value : null,
    contactUrl: companyIdentifier
      ? `https://${companyIdentifier}.pipedrive.com/person/${contact.id}`
      : null,
    avatarUrl: null,
    phoneNumbers: contact.phone
      .filter((phoneNumber:any) => phoneNumber.value)
      .map((phoneNumber:any) => ({
        label: parseFromPipedriveLabel(phoneNumber.label),
        phoneNumber: formatNumber(phoneNumber.value)
      }))
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

export async function getContacts(apiKey:string) {
  const client = new Client(apiKey, {
    strictMode: true
  });
  const anonymizedKey = anonymizeKey(apiKey);

  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unauthorized for ${anonymizedKey}`);
    throw new ServerError(401, "Unauthorized");
  }

  const companyIdentifier = await getCompanyIdentifier(client);
  return loadPage(0, [], client, companyIdentifier);
}

export async function createContact(apiKey:string, contact:ContactTemplate) {
  const client = new Client(apiKey, {
    strictMode: true
  });
  const companyIdentifier = await getCompanyIdentifier(client);

  const anonymizedKey = anonymizeKey(apiKey);
  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unauthorized for ${anonymizedKey}`);
    throw new ServerError(401, "Unauthorized");
  }
  const convertedContact = convertToPipedriveContact(contact);
  const response = await promisify(client.Persons.add)(convertedContact);

  return convertFromPipedriveContact(response, companyIdentifier);
}

export async function updateContact(apiKey:string, id:string, contact:ContactUpdate) {
  const client = new Client(apiKey, {
    strictMode: true
  });
  const companyIdentifier = await getCompanyIdentifier(client);
  const anonymizedKey = anonymizeKey(apiKey);
  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unauthorized for ${anonymizedKey}`);
    throw new ServerError(401, "Unauthorized");
  }
  const convertedContact = convertToPipedriveContact(contact);
  const response = await promisify(client.Persons.update)(id, convertedContact);

  return convertFromPipedriveContact(response, companyIdentifier);
}

export async function deleteContact(apiKey:string, id:string) {
  const client = new Client(apiKey, {
    strictMode: true
  });
  const anonymizedKey = anonymizeKey(apiKey);
  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.log(`Unauthorized for ${anonymizedKey}`);
    throw new ServerError(401, "Unauthorized");
  }
  const response = await promisify(client.Persons.remove)(id);
}
