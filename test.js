/* eslint import/no-extraneous-dependencies: ["error", { "devDependencies": true }]*/

import fs from 'fs';
import path from 'path';
import os from 'os';
import test from 'ava';
import Promise from 'bluebird';
import del from 'del';
import 'babel-register';
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

test.afterEach(() => del('./*.patch'));

test('should return empty array if no errors in files', async t => {
  const res = await checkEs3Syntax(path.join(fixturesDirectory, 'compatible.js'));

  t.true(res.length === 0);
});

test('should return empty array if no files', async t => {
  const res = await checkEs3Syntax();

  t.true(res.length === 0);
});

test('should return undefined if no errors in  string', async t => {
  const res = await checkString("var o = { 'class': 'name' }");

  t.true(res == null);
});

test('should return error in file', async t => {
  const res = await checkEs3Syntax(path.join(fixturesDirectory, 'notCompatible.js'));

  t.true(res.length === 1);
  t.deepEqual(res[0].textDiff, errorReturn);
});

test('should return error in array of files', async t => {
  const res = await checkEs3Syntax([path.join(fixturesDirectory, 'notCompatible.js')]);

  t.true(res.length === 1);
  t.deepEqual(res[0].textDiff, errorReturn);
});

test('should return error in directory', async t => {
  const res = await checkEs3Syntax(fixturesDirectory);

  t.true(res.length === 2);
  t.deepEqual(res[0].textDiff, errorReturn);
  t.deepEqual(res[1].textDiff, errorReturn);
});

test('should return error in string', async t => {
  const res = await checkString(`var o = { class: 'name' };${EOL}`);

  t.deepEqual(res.textDiff, errorReturn);
});

test.serial('should print patch from file to file if error, and enabled', async t => {
  await checkEs3Syntax(path.join(fixturesDirectory, 'notCompatible.js'), { savePatchToDisk: true, directory: process.cwd() });

  const fileContent = await readFile('./notCompatible.js.patch');

  t.true(fileContent != null);
});

test.serial('should print patch from string to file if error, and enabled', async t => {
  await checkString("var o = { class: 'name' };\n", { savePatchToDisk: true, directory: process.cwd() });

  const fileContent = await readFile('./stringInput.patch');

  t.true(fileContent != null);
});

test.serial('should print patch from string to file if error, and enabled with custom name', async t => {
  await checkString("var o = { class: 'name' };\n", { savePatchToDisk: true, directory: process.cwd(), filename: 'meep' });

  const fileContent = await readFile('./meep.patch');

  t.true(fileContent != null);
});
