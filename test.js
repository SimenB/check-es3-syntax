/* eslint-env jest */

import fs from 'fs';
import path from 'path';
import os from 'os';
import Promise from 'bluebird';
import del from 'del';
import checkEs3Syntax, { checkString } from './check';

const fixturesDirectory = path.resolve('./fixtures');
const { EOL } = os;

const readFile = Promise.promisify(fs.readFile);

const errorReturn = [
  { count: 10, value: 'var o = { ' },
  { count: 1, added: true, removed: undefined, value: '"' },
  { count: 5, value: 'class' },
  { count: 1, added: true, removed: undefined, value: '"' },
  { count: 11 + EOL.length, value: `: 'name' };${EOL}` }, // A couple of stupid hacks for windows
];

afterAll(() => del('*.patch'));

test.concurrent('should return empty array if no errors in files', async () => {
  const res = await checkEs3Syntax(path.join(fixturesDirectory, 'compatible.js'));

  expect(res).toHaveLength(0);
});

test.concurrent('should return empty array if no files', async () => {
  const res = await checkEs3Syntax();

  expect(res).toHaveLength(0);
});

test.concurrent('should return undefined if no errors in  string', async () => {
  const res = await checkString("var o = { 'class': 'name' }");

  expect(res).toBeUndefined();
});

test.concurrent('should return error in file', async () => {
  const res = await checkEs3Syntax(path.join(fixturesDirectory, 'notCompatible.js'));

  expect(res).toHaveLength(1);
  expect(res[0].textDiff).toEqual(errorReturn);
});

test.concurrent('should return error in array of files', async () => {
  const res = await checkEs3Syntax([path.join(fixturesDirectory, 'notCompatible.js')]);

  expect(res).toHaveLength(1);
  expect(res[0].textDiff).toEqual(errorReturn);
});

test.concurrent('should return error in directory', async () => {
  const res = await checkEs3Syntax(fixturesDirectory);

  expect(res).toHaveLength(2);
  expect(res[0].textDiff).toEqual(errorReturn);
  expect(res[1].textDiff).toEqual(errorReturn);
});

test.concurrent('should return error in string', async () => {
  const res = await checkString(`var o = { class: 'name' };${EOL}`);

  expect(res.textDiff).toEqual(errorReturn);
});

test.concurrent('should print patch from file to file if error, and enabled', async () => {
  await checkEs3Syntax(path.join(fixturesDirectory, 'notCompatible.js'), { savePatchToDisk: true, directory: process.cwd() });

  const fileContent = await readFile('./notCompatible.js.patch');

  expect(fileContent).toBeTruthy();
});

test('should print patch from string to file if error, and enabled', async () => {
  await checkString("var o = { class: 'name' };\n", { savePatchToDisk: true, directory: process.cwd() });

  const fileContent = await readFile('./stringInput.patch');

  expect(fileContent).toBeTruthy();
});

test('should print patch from string to file if error, and enabled with custom name', async () => {
  await checkString("var o = { class: 'name' };\n", { savePatchToDisk: true, directory: process.cwd(), filename: 'meep' });

  const fileContent = await readFile('./meep.patch');

  expect(fileContent).toBeTruthy();
});
