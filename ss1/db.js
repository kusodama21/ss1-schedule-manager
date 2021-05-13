const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient


let _db = null


async function connect() {
    
    // CHANGE THE DATABASE URL HERE
    const url = 'mongodb://localhost:27017/';


    await MongoClient.connect(url, {useUnifiedTopology: true})
        .then(result => {

            // CHANGE THE DATABASE NAME HERE
            _db = result.db('lehoangnam');

            console.log('Database connected.');
        })
        .catch(err => console.log(err));
}


function get() {
    return _db;
}


module.exports = {connect, get}