uri-stream
==========

npm module that creating stream to read/write from/to a URI.

Supported protocol:

| Protocol | Operation  |
|:---------|------------|
| HTTP     | Read |
| HTTPS    | Read |
| S3       | Read/Write |
| FTP      | Read/Write |
| FILE     | Read/Write |

## Install

```
$ npm install nstkhr/get-stream
```

## Usage

```js
const uriStream = require('uri-stream');

uriStream
  .createReadStream('file:///path/to/file')
  .pipe(
    uriStream
      .createWriteStream('s3://bucket-name/path/to/object'
  ));
```

## License

MIT
