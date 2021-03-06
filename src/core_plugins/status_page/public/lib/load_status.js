/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

import chrome from 'ui/chrome';
import { notify } from 'ui/notify';

// Module-level error returned by notify.error
let errorNotif;

/*
Returns an object of any keys that should be included for metrics.
*/
function formatMetrics(data) {
  if (!data.metrics) {
    return null;
  }

  return [
    {
      name: 'Heap total',
      value: _.get(data.metrics, 'process.memory.heap.size_limit'),
      type: 'byte'
    }, {
      name: 'Heap used',
      value: _.get(data.metrics, 'process.memory.heap.used_in_bytes'),
      type: 'byte'
    }, {
      name: 'Load',
      value: [
        _.get(data.metrics, 'os.load.1m'),
        _.get(data.metrics, 'os.load.5m'),
        _.get(data.metrics, 'os.load.15m')
      ],
      type: 'float'
    }, {
      name: 'Response time avg',
      value: _.get(data.metrics, 'response_times.avg_in_millis'),
      type: 'ms'
    }, {
      name: 'Response time max',
      value: _.get(data.metrics, 'response_times.max_in_millis'),
      type: 'ms'
    }, {
      name: 'Requests per second',
      value: _.get(data.metrics, 'requests.total') * 1000 / _.get(data.metrics, 'collection_interval_in_millis')
    }
  ];
}

async function fetchData() {
  return fetch(
    chrome.addBasePath('/api/status'),
    {
      method: 'get',
      credentials: 'same-origin'
    }
  );
}

/*
Get the status from the server API and format it for display.

`fetchFn` can be injected for testing, defaults to the implementation above.
*/
async function loadStatus(fetchFn = fetchData) {
  // Clear any existing error banner.
  if (errorNotif) {
    errorNotif.clear();
    errorNotif = null;
  }

  let response;

  try {
    response = await fetchFn();
  } catch (e) {
    // If the fetch failed to connect, display an error and bail.
    errorNotif = notify.error('Failed to request server status. Perhaps your server is down?');
    return e;
  }

  if (response.status >= 400) {
    // If the server does not respond with a successful status, display an error and bail.
    errorNotif = notify.error(`Failed to request server status with status code ${response.status}`);
    return;
  }

  const data = await response.json();

  return {
    name: data.name,
    statuses: data.status.statuses,
    serverState: data.status.overall.state,
    metrics: formatMetrics(data),
  };
}

export default loadStatus;