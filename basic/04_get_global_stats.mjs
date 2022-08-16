'use strict';

import { default as Trex } from '../index.mjs';

import { default as clog } from 'ee-log';

const trex = new Trex({
  server: 'tcp://trex.straylight.goosga.ng:4501', // Default 127.0.0.1:4501
  debug: false, // Default false
  user: 'goos', // Default uuid.v4()
  manage_api_h: true, // Default true - Have the library manage the api_h variable for us
  manage_port_handler: true, // Default true - Have the lib manage the handler var (from acquire()) for us
});

await trex.connect();

let response = '';

response = await trex.get_global_stats();
clog.debug(response);

await trex.release();
