"use strict";

const u = require('url');
const FtpClient = require('ftp');
const request = require('request');
const fs = require('fs');
const debug = require('debug')('uri-stream');
const {
  PassThrough
} = require("stream");
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});

function connectToFtpServer(c, parsedUrl) {
  return new Promise((resolve, reject) => {
    debug("FTP: Connecting to ... " + parsedUrl.href);
    const authPair = parsedUrl.auth ? parsedUrl.auth.split(':') : [null,
      null
    ];

    c.once('ready', () => {
      debug("FTP: Connected: " + parsedUrl.href);
      resolve();
    });
    c.once('error', (e) => {
      debug("FTP error: ", e);
      reject(e);
    });
    c.connect({
      host: parsedUrl.hostname,
      port: parsedUrl.port,
      secure: false,
      user: authPair[0],
      password: authPair[1],
      debug: (msg) => debug(parsedUrl.hostname + ' - ' + msg)
    });
  });
}

async function createFtpReadStream(parsedUrl) {
  const c = new FtpClient();
  await connectToFtpServer(c, parsedUrl);

  return await new Promise((resolve, reject) => {
    debug("FTP: GET " + parsedUrl.path);
    c.get(parsedUrl.path, (err, stream) => {
      if (err) {
        reject(err);
      } else {
        stream.once('close', () => c.end());
        debug("FTP: Start download: " + parsedUrl.href);
        resolve(stream);
      }
    });
  });
}

async function createFtpWriteStream(parsedUrl) {
  const c = new FtpClient();
  await connectToFtpServer(c, parsedUrl);

  const stream = new PassThrough();
  debug("FTP: uploading... " + parsedUrl.href);
  c.put(stream, parsedUrl.path, false, (err) => {
    if (err) {
      debug("FTP: Upload failed: " + parsedUrl.href, err);
      stream.emit('error', err);
    } else {
      debug("FTP: Upload completed: " + parsedUrl.href);
    }
    c.end();
  });
  return stream;
}

function createS3WriteStream(parsedUrl, callback) {
  const pass = new PassThrough();
  s3.upload({
    Bucket: parsedUrl.host,
    Key: parsedUrl.pathname.substring(1),
    Body: pass
  }, callback);
  return pass;
}

function createS3ReadStream(parsedUrl) {
  return s3.getObject({
    Bucket: parsedUrl.host,
    Key: parsedUrl.pathname.substring(1)
  }).createReadStream();
}

module.exports.createReadStream = async(url) => {
  const parsed = u.parse(url);
  switch (parsed.protocol) {
    case 's3:':
      return Promise.resolve(createS3ReadStream(parsed));
    case 'ftp:':
      return await createFtpReadStream(parsed);
    case 'http:':
    case 'https:':
      return request(url);
    case 'file:':
      return fs.createReadStream(parsed.pathname);
    default:
      throw new Error(`Unsupported protocol ${parsed.protocol}, url: ${url}`);
  }
};

module.exports.createWriteStream = async(url, callback) => {
  const parsed = u.parse(url);
  switch (parsed.protocol) {
    case 's3:':
      return Promise.resolve(createS3WriteStream(parsed, callback));
    case 'ftp:':
      return await createFtpWriteStream(parsed);
    case 'file:':
      return fs.createWriteStream(parsed.pathname);
    default:
      throw new Error(`Unsupported protocol ${parsed.protocol}, url: ${url}`);
  }
};
