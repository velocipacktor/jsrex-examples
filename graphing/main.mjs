'use strict';

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

import { default as Trex } from 'jsrex';

import { drawGraph as bpsDrawGraph, bpsData } from './generators/bps.mjs';
import { drawGraph as ppsDrawGraph, ppsData } from './generators/pps.mjs';
import { drawGraph as flowsDrawGraph, flowsData} from './generators/flows.mjs';

const session_id = 123456;
const force_acquire = true;

const multiplier = 1;
const duration = 60; // seconds
const prewarmup = 0; // seconds
const precapture = 10; // seconds
const cooldown = 10; // seconds

const sampleInterval = 250; // ms

const initTime = new Date();

console.log(`--- Logs begin at ${initTime.toUTCString()} ---`);

// Setup our connection to Trex
const trex = new Trex({
  server: 'tcp://trex.straylight.goosga.ng:4501', // Default 127.0.0.1:4501
  debug: false, // Default false
  user: 'goos', // Default uuid.v4()
  manage_api_h: true, // Default true - Have the library manage the api_h variable for us
  manage_port_handler: true, // Default true - Have the lib manage the handler var (from acquire()) for us
});

// Setup the profile
const sfrProfile = {
  profile_id: 'sfr', // Used in Trex and graph/json output file paths
  profile: readFileSync('./profiles/sfr/sfr.json'),
};

// Connect to the Trex server
await trex.connect();

await new Promise(r => setTimeout(r, 1000));

let response = null;

// Acquire ports
response = await trex.acquire({ session_id: session_id, force: force_acquire });
console.log(`Ports acquired, Session Handler: ${response.result.handler}`);
console.log(`Port IDs: [0: ${response.result.ports['0']}] [1: ${response.result.ports['1']}]`);

await new Promise(r => setTimeout(r, 1000));

// Clear old profile by the same name
await trex.profile_clear({
  profile_id: sfrProfile.profile_id,
});

await new Promise(r => setTimeout(r, 1000));

console.log('Uploading profile');
// Upload chunked profile
await trex.astf_load_profile(sfrProfile.profile.toString(), sfrProfile.profile_id);

await new Promise(r => setTimeout(r, 1000));

// List profiles
response = await trex.get_profile_list();
console.log(`Available profiles: ${JSON.stringify(response.result)}`);

await new Promise(r => setTimeout(r, (prewarmup * 1000)));

// Start sampling data
console.log('Sampling stats');
const interval = setInterval(async () => {
  response = await trex.get_global_stats();

  const timestamp = new Date();

  const pps_delta = response.result.m_tx_pps - response.result.m_rx_pps;

  let humanReadable = `bps [tx/rx/drop]: [${response.result.m_tx_bps}/${response.result.m_rx_bps}/${response.result.m_rx_drop_bps}] `;
  humanReadable += `pps [tx/rx/delta]: [${response.result.m_tx_pps}/${response.result.m_rx_pps}/${pps_delta}]`;
  console.log(humanReadable);

  bpsData.tx_bps.push({
    x: timestamp,
    y: response.result.m_tx_bps / 1000000
  });
  bpsData.rx_bps.push({
    x: timestamp,
    y: response.result.m_rx_bps / 1000000
  });
  bpsData.rx_drop_bps.push({
    x: timestamp,
    y: response.result.m_rx_drop_bps / 1000000
  });

  ppsData.tx_pps.push({
    x: timestamp,
    y: response.result.m_tx_pps
  });
  ppsData.rx_pps.push({
    x: timestamp,
    y: response.result.m_rx_pps
  });
  ppsData.delta.push({
    x: timestamp,
    y: (response.result.m_tx_pps - response.result.m_rx_pps)
  });

  flowsData.tx_cps.push({
    x: timestamp,
    y: response.result.m_tx_cps
  });
  flowsData.active_flows.push({
    x: timestamp,
    y: response.result.m_active_flows
  });
}, sampleInterval);

// Start traffic after precapture period
await new Promise(r => setTimeout(r, (precapture * 1000)));
console.log('Attempting to start traffic');
await trex.start({
  duration: duration,
  mult: multiplier,
  nc: false,
  ipv6: false,
  latency: 0,
  profile_id: sfrProfile.profile_id,
});

// Let it run for the duration
await new Promise(r => setTimeout(r, (duration * 1000)));
console.log('Stopping traffic');
await trex.stop({
  profile_id: sfrProfile.profile_id,
});

// Sleep for the cooldown period
await new Promise(r => setTimeout(r, (cooldown * 1000)));

// Stop sampling stats
clearInterval(interval);

console.log('Releasing ports');
await trex.release();

// Create graphs
console.log('Creating graphs');

// Setup title
const graphTitle = `dut:some_dut run:example name:${sfrProfile.profile_id} mult:${multiplier} dur:${duration} prof:${sfrProfile.profile_id}`;

// Cook the toast
const bpsGraphB64Image = bpsDrawGraph(bpsData, graphTitle);
const ppsGraphB64Image = ppsDrawGraph(ppsData, graphTitle);
const flowsGraphB64Image = flowsDrawGraph(flowsData, graphTitle);

// Build our dirs
const filePath = `./output/example/${initTime.toJSON().replaceAll(':', '-').substring(0, 19)}/sfr/`
const fileName = `example-sfr-mult_${multiplier}-dur_${duration}-${initTime.toJSON().replaceAll(':', '-')}`

// Create the output dir if required
if (!existsSync(filePath)){
  mkdirSync(filePath, { recursive: true });
}

// and finally output our files
writeFileSync(`${filePath}/${fileName}-bits.png`, bpsGraphB64Image, {encoding: 'base64'});
writeFileSync(`${filePath}/${fileName}-packets.png`, ppsGraphB64Image, {encoding: 'base64'});
writeFileSync(`${filePath}/${fileName}-flows.png`, flowsGraphB64Image, {encoding: 'base64'});

console.log('Done');
