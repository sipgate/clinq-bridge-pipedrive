const { promisify } = require("util");
const Pipedrive = require("pipedrive");
const HARD_MAX = 40000;
const cache = [];

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
    .map(contact => ({
      id: String(contact.id),
      name: contact.name,
      company: contact.org_name || null,
      email: contact.email.length > 0 ? contact.email[0].value : null,
      contactUrl: companyIdentifier ? `https://${companyIdentifier}.pipedrive.com/person/${contact.id}` : null,
      avatarUrl: null,
      phoneNumbers: contact.phone
        .filter(phoneNumber => phoneNumber.value)
        .map(phoneNumber => ({
          label: phoneNumber.label
            ? capitalizeFirstLetter(phoneNumber.label)
            : null,
          phoneNumber: formatNumber(phoneNumber.value)
        }))
    }));

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

const getCompanyIdentifier = async (client) => {
  const user = await promisify(client.Users.get)('self');
  if (!(user.companies && user.company_id)) {
    return null;
  }
  const company = user.companies[user.company_id];
  return company && company.identifier || null;
};

exports.getContactList = async function(key) {
  const client = new Pipedrive.Client(key, { strictMode: true });

  try {
    await promisify(client.Currencies.getAll)();
  } catch (error) {
    console.error(error);
    throw new Error("Unauthorized");
  }

  const companyIdentifier = await getCompanyIdentifier(client);
  loadPage(0, [], client, companyIdentifier).then(response => {
    cache[key] = response;
  });

  return cache[key] || [];
};
