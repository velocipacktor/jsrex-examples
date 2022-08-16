'use strict';

import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Profile {
  constructor() {
    this.profile_id = profile_id;
    this.profile = profile;
  }
}

const profile_id = 'http-simple';

const buf_list = [];

buf_list[0] = readFileSync(`${__dirname}/buf/req.buf`);
buf_list[1] = readFileSync(`${__dirname}/buf/resp.buf`);

const profile = {
  buf_list: buf_list,
  ip_gen_dist_list: [
    {
      dir: 'c',
      distribution: 'seq',
      ip_end: '16.0.0.255',
      ip_offset: '1.0.0.0',
      ip_start: '16.0.0.0',
    },
    {
      dir: 's',
      distribution: 'seq',
      ip_end: '48.0.255.255',
      ip_offset: '1.0.0.0',
      ip_start: '48.0.0.0',
    },
  ],
  program_list: [
    {
      commands: [
        {
          buf_index: 0,
          name: 'tx_msg',
        },
        {
          min_pkts: 1,
          name: 'rx_msg',
        },
      ],
      stream: false,
    },
    {
      commands: [
        {
          min_pkts: 1,
          name: 'rx_msg',
        },
        {
          buf_index: 1,
          name: 'tx_msg',
        },
      ],
      stream: false,
    },
  ],
  templates: [
    {
      client_template: {
        cluster: {},
        cps: 100,
        ip_gen: {
          dist_client: {
            index: 0,
          },
          dist_server: {
            index: 1,
          },
        },
        port: 80,
        program_index: 0,
      },
      server_template: {
        assoc: [
          {
            port: 80,
          },
        ],
        program_index: 1,
      },
      tg_id: 0,
    },
  ],
  tg_names: [],
};
