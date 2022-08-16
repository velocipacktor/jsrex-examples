'use strict';

import { default as Trex } from '../index.mjs';

import { default as clog } from 'ee-log';

const session_id = 123456;
const force_acquire = false;

const trex = new Trex({
  server: 'tcp://trex.straylight.goosga.ng:4501', // Default 127.0.0.1:4501
  debug: false, // Default false
  user: 'goos', // Default uuid.v4()
  manage_api_h: true, // Default true - Have the library manage the api_h variable for us
  manage_port_handler: true, // Default true - Have the lib manage the handler var (from acquire()) for us
});

// Setup a response container
let response = '';

// Connect to the zmq server
response = await trex.connect();

// Acquire ports
await trex.acquire({ session_id: session_id, force: force_acquire });

// List profiles
response = await trex.get_profile_list();
clog.debug(response);

// Release ports
await trex.release();
