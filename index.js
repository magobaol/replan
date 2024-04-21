#!/usr/bin/env node
'use strict';

const yaml = require('js-yaml');

const { Command, Option, Argument } = require('commander');
const fs = require("fs");
const {planSessions} = require("./planMaker");
const program = new Command();
require('dotenv').config({ path: __dirname+'/.env' })

const showsYaml = `shows.yaml`;

function loadShows() {
    return yaml.load(fs.readFileSync(showsYaml), {});
}

function getShowsIds() {
    return loadShows().map(show => show.id)
}

function getShowById(id) {
    return loadShows().find(s => s.id === id);
}

program
    .name('Rehearsals planner')
    .version('1.0.0')
    .description('Plan rehearsal sessions based on actors availabilities');

program
    .command('plan')
    .addArgument(new Argument('show', 'Show').choices(getShowsIds()))
    .option('-ip, --include-past', 'Create plans for past sessions too')
    .action((show, options) => {
        planSessions(getShowById(show), options.includePast).catch(err => console.error('Failed to run planning sessions:', err))
    })

// Parse the command-line arguments only if the script is being run directly
if (require.main === module) {
    program.parse();
}

const options = program.opts();

