const Airtable = require('airtable');
const { formatISO } = require('date-fns');

// Module-scoped variables to hold the Airtable base instance
let base;

// Initialization function to configure the module
function configure(apiKey, baseId) {
    base = new Airtable({ apiKey: apiKey }).base(baseId);
}

function loadActors() {
    return new Promise((resolve, reject) => {
        let actors = [];
        base('Actor').select({
            sort: [{field: 'Name', direction: 'asc'}]
        }).eachPage(function page(records, fetchNextPage) {
            records.forEach(function(record) {
                // console.log('Retrieved ', record.get('Name'));
                actors.push({
                    id: record.id,
                    characters: record.get('Characters'),
                    availabilities: record.get('Availabilities'),
                    name: record.get('Name')
                });
            });

            fetchNextPage();
        }, function done(error) {
            if (error) {
                reject(error);
            } else {
                resolve(actors);
            }
        });
    });
};

async function loadSessions(includePast) {
    const today = new Date();
    const formattedToday = formatISO(today, { representation: 'date' }); // format as 'YYYY-MM-DD'

    return new Promise((resolve, reject) => {
        let sessions = [];
        base('Session').select({
            filterByFormula: !includePast ? `IS_AFTER({Date}, '${formattedToday}')` : '',
            sort: [{field: 'Date', direction: 'asc'}],
        }).eachPage(function page(records, fetchNextPage) {
            records.forEach(function(record) {
                console.log('Retrieved ', record.get('Date'));
                sessions.push({
                    id: record.id,
                    date: record.get('Date'),
                    availableActors: record.get('Actors')
                });
            });

            fetchNextPage();
        }, function done(error) {
            if (error) {
                reject(error);
            } else {
                resolve(sessions);
            }
        });
    });
};

async function loadScenes() {
    return new Promise((resolve, reject) => {
        let scenes = [];
        base('Scene').select({
            sort: [{field: 'Number', direction: 'asc'}],
        }).eachPage(function page(records, fetchNextPage) {
            records.forEach(function(record) {
                // console.log('Retrieved ', record.get('Number'));
                scenes.push({
                    id: record.id,
                    number: record.get('Number'),
                    characters: record.get('Characters')
                });
            });

            fetchNextPage();
        }, function done(error) {
            if (error) {
                reject(error);
            } else {
                resolve(scenes);
            }
        });
    });
};

async function loadCharacters() {
    return new Promise((resolve, reject) => {
        let characters = [];
        base('Character').select({
            sort: [{field: 'Name', direction: 'asc'}],
        }).eachPage(function page(records, fetchNextPage) {
            records.forEach(function(record) {
                // console.log('Retrieved ', record.get('Name'));
                characters.push({
                    id: record.id,
                    name: record.get('Name'),
                    actor: record.get('Actor'),
                    scenes: record.get('Scenes')
                });
            });

            fetchNextPage();
        }, function done(error) {
            if (error) {
                reject(error);
            } else {
                resolve(characters);
            }
        });
    });
};

async function emptyTable(tableName) {
    try {
        const recordsToDelete = [];
        // Step 1: Fetch all record IDs in the table
        await base(tableName).select({
            //No need to fetch any specific field, we just need the internal "id" which is retrieved anyway
        }).eachPage((records, fetchNextPage) => {
            records.forEach(record => {
                recordsToDelete.push(record.id);
            });
            fetchNextPage();
        });

        // Step 2: Batch delete records in groups of up to 10
        while (recordsToDelete.length > 0) {
            const batch = recordsToDelete.splice(0, 10); // Get the next 10 records
            await base(tableName).destroy(batch, (err, deletedRecords) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(`Deleted batch of ${deletedRecords.length} records.`);
            });
        }
    } catch (error) {
        console.error("Failed to delete records:", error);
    }
}

async function createPlanRecords(sessionId, sceneIds, notNeededActorIds, neededActorIds) {
    return new Promise((resolve, reject) => {
        base('Plan').create({
            "Session": [sessionId],
            "Scenes": sceneIds,
            "Not needed actors": notNeededActorIds,
            "Needed actors": neededActorIds
        }, function (err, record) {
            if (err) {
                reject(err);
            } else {
                resolve(record);
            }
        });
    });
}


module.exports = {
    configure,
    loadActors,
    loadSessions,
    loadScenes,
    loadCharacters,
    emptyTable,
    createPlanRecords
};