const Pipedrive = require('pipedrive');
const HARD_MAX = 40000;
const cache = [];
const cached_keys = [];

const formatNumber = (number) => {
	let p = number.replace(/[^0-9+]/ig, "");
	p = p.replace(/^00/, "");
	p = p.replace(/^\+/, "");
	p = "+" + p.replace(/^0/, "49");
	return p
};

const keyOut = (key = '') => {
	return "********" + key.substr(key.length - 5)
};

const mapResult = (input) => {
	const data = [];
	input.forEach(contact => {
		if (typeof contact.name !== "undefined") {
			const mapped = {
				"name": contact.name
			};
			mapped.phoneNumbers = [];
			contact.phone.forEach(function (numberinfo) {
				if (numberinfo.value && numberinfo.value !== "") {
					mapped.phoneNumbers.push(
						{"label": numberinfo.label, "phoneNumber": formatNumber(numberinfo.value)})
				}
			});
			if (mapped.phoneNumbers.length > 0) {
				data.push(mapped)
			}
		}
	});

	return data
};

const getAllPromise = (client, params) => {
	return new Promise((resolve) => {
		client.Persons.getAll(params, function (error, data, additional) {
			resolve({"contacts": data, "info": additional})
		})
	})
};
const loadPage = async (offset, cache, client) => {
	const options = {
		start: offset,
		limit: 100
	};
	return getAllPromise(client, options).then((data) => {
		const mapped = mapResult(data.contacts).concat(cache);
		if (data.info["pagination"]["more_items_in_collection"] && mapped.length <= HARD_MAX) {
			offset = data.info["pagination"]["limit"] + data.info["pagination"]["start"];
			return loadPage(offset, mapped, client)
		} else {
			return mapped
		}
	})
};
const loadList = async (key) => {
	pipedriveClient = new Pipedrive.Client(key, {strictMode: true});
	return loadPage(0, [], pipedriveClient)
};

exports.getContactList = async function (key) {
	console.log("Requesting Key: " + keyOut(key));
	if (cached_keys.includes(key)) {
		console.log("Responding from cache: " + keyOut(key) + " (" + cache[key].length
			+ " contacts)");
		loadList(key).then((apiResponse) => {
			console.log("Filled cache: " + keyOut(key) + " (" + apiResponse.length + " contacts)");
			cache[key] = apiResponse
		});
		return cache[key]
	}
	console.log("Preparing empty cache: " + keyOut(key));
	cache[key] = [];
	cached_keys.push(key);
	loadList(key).then((apiResponse) => {
		console.log("Filled cache: " + keyOut(key) + " (" + apiResponse.length + " contacts)");
		cache[key] = apiResponse;
		return apiResponse
	});
	return []
};
