import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Promise from 'bluebird';
import es3ify from 'es3ify';
import read from 'fs-readdir-recursive';
import flatten from 'lodash.flatten';
import { createPatch, diffChars } from 'diff';

const { transform } = es3ify;
const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);

export default (files = [], { savePatchToDisk, directory } = {}) => {
  const filesArray = (Array.isArray(files) ? files : [files])
    .map(filename => {
      if (fs.lstatSync(filename).isDirectory()) {
        return read(filename).filter(file => path.extname(file) === '.js').map(file => path.join(filename, file));
      }

      return filename;
    });

  return Promise
    .map(flatten(filesArray), filename => Promise.props({ content: readFile(filename, 'utf-8'), filename }))
    .map(({ content, filename }) => {
      const hash = crypto.createHash('md5').update(content).digest('hex');
      const es3Content = transform(content);
      const es3Hash = crypto.createHash('md5').update(es3Content).digest('hex');

      return Promise.props({
        filename,
        content,
        hash,
        es3Content,
        es3Hash,
      });
    })
    .filter(({ hash, es3Hash }) => hash !== es3Hash)
    .map(({ filename, content, es3Content }) => Promise.props({
      filename,
      patch: createPatch(filename, content, es3Content),
      textDiff: diffChars(content, es3Content),
    }))
    .tap(arr => {
      if (savePatchToDisk) return arr.map(res => writeFile(path.join(directory, `${res.filename}.patch`), res.patch));

      return Promise.resolve();
    });
};
