console.log("the bot is starting")

const config = require('./config.js');

// console.log(config);

const Mastodon = require('mastodon-api');
const fs = require('fs');
const M = new Mastodon(config);
const util = require('util');
const exec = util.promisify(require('child_process').exec);
// console.log(M)

// setInterval(toot, 1000*60);
// function toot() {
//     const num = Math.floor(Math.random()*100)
//     const params = {
//         spoiler_text: "The meaning of life is...",
//         status: num
//     }


const stream = fs.createReadStream('kitten.jpg')

const media = {
    file: stream,
    description: 'a cute grey kitten found on google image search'
}

M.post('media', media)
    .then(response => {
        console.log(response.data.id);
        // fs.writeFileSync('response.json', JSON.stringify(response, null, 2));
        const toot = {
            status: 'a kitten',
            media_ids: [response.data.id]
        }
        return M.post('statuses', toot);
    })
    .then(response => {
        console.log("Success!")
        console.log(`id: ${response.data.id} ${response.data.created_at}`)
    })
    .catch(error => console.error(error));




// v2 (with promises)

// M.post('statuses', params)
//     .then(response => {
//         console.log(`id: ${response.data.id} ${response.data.created_at}`)
//     })
//     .catch(error => {
//         console.log("error: " + error)
//     })


// v1
// M.post('statuses', params, (error,data) => {
//     if(error){
//         console.log("error: " + error)
//     }
//     else{
//         console.log(`id: ${data.id} ${data.created_at}`)
//     }
// });
// }