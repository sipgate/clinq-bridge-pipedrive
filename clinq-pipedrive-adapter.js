const Pipedrive = require('pipedrive')
const HARD_MAX=40000
var apiKey = null
var cache = []
var cached_keys = []

var formatNumber = (number) => {
    var p = number.replace(/[^0-9\+]/ig,"")
    p = p.replace(/^00/, "")
    p = p.replace(/^\+/, "")
    p = "+"+p.replace(/^0/, "49")
    return p
}

var keyOut = (key) => {
    return "********" +key.substr(key.length - 5)
}

var mapResult = (input) => {
    var data =[];
    input.forEach(contact => {
        if (typeof contact.name !=="undefined") {
            var mapped = {
                "name":contact.name
            }
            mapped.phoneNumbers=[]
            contact.phone.forEach(function(numberinfo) {
                if (numberinfo.value != "")
                    mapped.phoneNumbers.push({"label":numberinfo.label, "phoneNumber":formatNumber(numberinfo.value)})
            })
            if (mapped.phoneNumbers.length > 0) data.push(mapped)
        }
    });
    
    return data
}

var getAllPromise = (client, params) => {
    return new Promise((resolve, reject) => {
        client.Persons.getAll(params, function(error, data, additional) {
            resolve({"contacts":data, "info":additional})
        })
    })
}
var loadPage = async (offset, cache, client) => {
    var options = {
        start:offset,
        limit:100}
    return getAllPromise(client, options).then((data) => {
        var mapped = mapResult(data.contacts).concat(cache)
        if (data.info["pagination"]["more_items_in_collection"] && mapped.length <= HARD_MAX) {
            offset = data.info["pagination"]["limit"]+data.info["pagination"]["start"]
            return loadPage(offset, mapped, client)
        } else {
            return mapped
        }
    })
}
var loadList = async (key) => {
    pipedriveClient = new Pipedrive.Client(key, { strictMode: true });
    return loadPage(0, [], pipedriveClient)
}

var clearCache = (key) => {
    cache[key] = null
}

exports.getContactList = async function(key) {
    if (cached_keys.includes(key)) {
        console.log("Responding from cache: "+keyOut(key)+" ("+cache[key].length+" contacts)")
        return cache[key]
    }
    console.log("Preparing empty cache: "+keyOut(key))
    cache[key] = []
    cached_keys.push(key)
    loadList(key).then((apiResponse) => {
        console.log("Filled cache: "+keyOut(key)+" ("+apiResponse.length+" contacts)")
        cache[key] = apiResponse
        return apiResponse
    })
    return []
}
