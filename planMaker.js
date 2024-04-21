const airtableAPI = require('./airtableAPI');
const {read} = require("@1password/op-js");

async function planSessions(show) {
    airtableAPI.configure(read.parse(process.env.AIRTABLE_API_TOKEN_OP_PATH), show['base-id'])
    console.log(`Creating plan for the show ${show.name}`)
    await airtableAPI.emptyTable("Plan")
    try {
        const actors = await airtableAPI.loadActors();
        const sessions = await airtableAPI.loadSessions();
        const scenes = await airtableAPI.loadScenes();
        const characters = await airtableAPI.loadCharacters();

        const scenesByDate = organizeScenesByDate(sessions, scenes, characters, actors);
        await createPlans(scenesByDate, actors, characters, sessions);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

function organizeScenesByDate(sessions, scenes, characters, actors) {
    let scenesByDate = {};
    for (let session of sessions) {
        let sessionId = session.id;
        let sessionDate = session.date;

        if (!scenesByDate[sessionDate]) {
            scenesByDate[sessionDate] = {
                sessionId: sessionId,
                scenes: []
            };
        }

        scenes.forEach(scene => {
            if (sceneCanBeRehearsed(scene, characters, actors, sessionId)) {
                scenesByDate[sessionDate].scenes.push(scene);
            }
        });
    }
    return scenesByDate;
}

function sceneCanBeRehearsed(scene, characters, actors, sessionId) {
    return scene.characters.every(characterId => {
        const character = characters.find(c => c.id === characterId);
        if (!character) {
            console.log(`Character not found: ${characterId}`);
            return false;
        }
        const actorId = character.actor[0];
        const actor = actors.find(a => a.id === actorId);
        if (!actor) {
            console.log(`Actor not found for character: ${actorId}`);
            return false;
        }
        // Ensure actor is available and the Availabilities include the sessionId
        return actor.availabilities && actor.availabilities.includes(sessionId);
    });
}

async function createPlans(scenesByDate, actors, characters, sessions) {
    for (let session of sessions) {
        let sessionDate = session.date;
        let sessionId = session.id;
        let scenes = scenesByDate[sessionDate] ? scenesByDate[sessionDate].scenes : [];

        console.log(`Planning for session on ${sessionDate} with ${scenes.length} scenes.`);

        // Determine available actors for this session
        const availableActorIds = new Set(actors.filter(actor =>
            actor.availabilities && actor.availabilities.includes(sessionId))
            .map(actor => actor.id));

        // Determine needed actor IDs from the scenes that can be rehearsed
        const neededActorIds = new Set();
        scenes.forEach(scene => {
            scene.characters.forEach(characterId => {
                const character = characters.find(c => c.id === characterId);
                if (character && sceneCanBeRehearsed(scene, characters, actors, sessionId)) {
                    const actorId = character.actor[0];
                    neededActorIds.add(actorId);
                }
            });
        });

        // Calculate not needed but available actors
        const notNeededActorIds = Array.from(availableActorIds).filter(id => !neededActorIds.has(id));

        // If scenes are available to rehearse, create or update the plan record
        if (scenes.length > 0) {
            await airtableAPI.createPlanRecords(sessionId, scenes.map(scene => scene.id), notNeededActorIds, Array.from(neededActorIds)).catch(err => {
                console.error(`Error creating plan record for ${sessionDate}:`, err);
            });
        }
    }
}

module.exports = {
    planSessions
};