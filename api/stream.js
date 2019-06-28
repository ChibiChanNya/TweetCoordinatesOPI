import express from 'express';

const fs = require('fs');
const path = require('path');
const DelimiterStream = require('delimiter-stream');
const app = express();
app.use(express.json());

app.get('/', async (req, res)  => {

  console.log("ENDPOINT REACHED");
  let linestream = new DelimiterStream();
  let input = fs.createReadStream(path.resolve(__dirname + '/../static/stream.jsonl'));

  async function readData() {

    return new Promise((resolve, reject) => {
      let data = [];
      let counter = 0;

      linestream.on('data', (chunk) => {
        counter++;
        let parsed = JSON.parse(chunk);
        if (parsed.coordinates)
          data.push({
            coordinates: parsed.coordinates.coordinates,
            country: parsed.place && parsed.place.country_code,
            location: parsed.place && parsed.place.full_name,
            user: parsed.user.id
          });
      });

      linestream.on('end', () => {
        console.log("FINISHU");
        resolve({data: data, counter: counter});
      });

      input.pipe(linestream);
    });
  }

  const items = await readData();
  res.json({items: items.data, counter: items.counter});

});

module.exports = {
  path: '/api/stream',
  handler: app
};
