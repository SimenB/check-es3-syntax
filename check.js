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

const hashString = string =>
  crypto.createHash('md5').update(string).digest('hex');

function checkContent(contentPromise, savePatchToDisk, directory) {
  return contentPromise
    .map(({ content, filename }) => {
      const hash = hashString(content);
      const es3Content = transform(content);
      const es3Hash = hashString(es3Content);

      return Promise.props({
        filename,
        content,
        hash,
        es3Content,
        es3Hash,
      });
    })
    .filter(({ hash, es3Hash }) => hash !== es3Hash)
    .map(({ filename, content, es3Content }) =>
      Promise.props({
        filename,
        patch: createPatch(filename, content, es3Content),
        textDiff: diffChars(content, es3Content),
      })
    )
    .tap(arr => {
      if (savePatchToDisk) {
        return Promise.all(
          arr.map(res =>
            writeFile(
              path.join(directory, `${path.basename(res.filename)}.patch`),
              res.patch
            )
          )
        );
      }

      return Promise.resolve();
    });
}

export function checkString(
  content,
  { savePatchToDisk, directory, filename = 'stringInput' } = {}
) {
  // Unwrap the array, as it's only ever one result
  return checkContent(
    Promise.resolve([Promise.props({ content, filename })]),
    savePatchToDisk,
    directory
  ).spread(res => res);
}

export default function(files = [], { savePatchToDisk, directory } = {}) {
  const filesArray = (Array.isArray(files) ? files : [files]).map(filename => {
    if (fs.lstatSync(filename).isDirectory()) {
      return read(filename)
        .filter(file => path.extname(file) === '.js')
        .map(file => path.join(filename, file));
    }

    return filename;
  });

  const readFilesAsPromise = Promise.map(flatten(filesArray), filename =>
    Promise.props({
      content: readFile(filename, 'utf-8'),
      filename,
    })
  );

  return checkContent(readFilesAsPromise, savePatchToDisk, directory);
}
