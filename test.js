const axios = require('axios');
async function test() {
    const res = await axios.get('https://api.rscripts.net/v1/scripts/vrhands-for-pc-mobile-coming-soon-MCpL', {
        headers: { 'Authorization': 'Bearer rsc_live_KlN7Tb3Sc1VzmWmXQ16FIg2cSjT1BPbj' }
    });
    console.log(JSON.stringify(res.data.data, null, 2));
}
test();
