const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(path.join(__dirname, '../../gui/js/defense.js'), 'utf8');

function setup() {
  const requests = [];
  const app = {
    activeProject: { id: 'project-1' },
    api: async (url, options) => {
      requests.push({ url, method: options.method, body: JSON.parse(options.body || 'null') });
    },
    toast() {},
    refreshActiveProject() {},
  };
  const component = runInNewContext(source + '\ndefenseComponent()', { Alpine: { store: () => app } });
  return { component, requests };
}

test('starting a defense only forces a new session when one is already displayed', async () => {
  const { component, requests } = setup();
  await component.startDefense();
  component.activeSession = { id: 'previous-defense', status: 'passed' };
  await component.startDefense();

  assert.deepEqual(requests, [false, true].map(force_new => ({
    url: '/api/defense/projects/project-1/start', method: 'POST', body: { force_new },
  })));
});

test('replies identify the active turn, including the first and a resumed turn', async () => {
  const { component, requests } = setup();
  for (const index of [0, 2]) {
    component.activeSession = { id: 'defense-1', current_turn_index: index };
    component.studentAnswer = '  Mi respuesta.  ';
    await component.submitAnswer();
    assert.deepEqual(requests.at(-1), {
      url: '/api/defense/sessions/defense-1/reply',
      method: 'POST',
      body: { turn_index: index, student_answer: 'Mi respuesta.' },
    });
  }
});
