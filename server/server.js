'use strict';

const Twit = require('twit');
const _ = require('lodash');
const Scaledrone = require('scaledrone-node-push');
const fs = require('fs');
const config = require('../config.json');
const savedLoc = require('../location.json');

const twitter = new Twit({
    consumer_key: config.twitter_consumer_key,
    consumer_secret: config.twitter_consumer_secret,
    access_token: config.twitter_access_token,
    access_token_secret: config.twitter_access_token_secret,
});

const sd = new Scaledrone({
    channelId: config.scale_drone_channelId,
    secretKey: config.scale_drone_secretKey,
});

const googleMapsClient = require('@google/maps').createClient({
    key: config.google_geolocation_key,
});

let TEAMS = [
    '#WorldCupFinal',
    '#CROATIA',
    '#CRO',
    '#WorldCup',
    '#WorldCup2018',
    '#FRA',
    '#FRANCE',
    '#FiersdetreBleus',
    '#FIFAWorldCup2018',
    '#WorldCupFinal2018',
    '#Vatreni',
    '#hrvatska',
    '#lesblues',
    '#lafrance',
    '#flamingpride',
    '#beproud',
    '#budiponosan',
    '#griezmann',
    '#modric',
    '#rakitic',
    '#mbappe',
    '#pogba',
    '#crofra',
    '#fracro',
    '#hns',
];

TEAMS = TEAMS.map((data) => data.toLowerCase());
const tweetStream = twitter.stream('statuses/filter', { track: TEAMS.join(','), });

tweetStream.on('tweet', (tweet) => {
    post(tweet);
    if(!_.isEmpty(tweet.retweeted_status)) {
        post(tweet.retweeted_status);
    }
});

const post = (tweet) => {
    let cro = false;
    let fra = false;

    const fixFrance = [
        '#fiersdetrebleus', '#lesblues', '#fra', '#france',
        '#lafrance', '#griezmann', '#mbappe', '#pogba',
    ];
    const fixCroatia = [
        '#vatreni', '#croatia', '#cro', '#hrvatska', '#flamingpride',
        '#beproud', '#budiponosan', '#modric', '#rakitic', '#hns',
    ];

    _.each(tweet.entities.hashtags, (hashtag) => {
        const hashStr = '#' + hashtag.text.toLowerCase();

        if (fixFrance.indexOf(hashStr) > -1 ) {
            fra = true;
        }

        if (fixCroatia.indexOf(hashStr) > -1 ) {
            cro = true;
        }
    });

    const pub = (loc, url, name) => {
        const room = 'fifa';
        if (cro) {
            const message = { loc: loc, team: 'cro', url: url, name: name, };
            sd.publish(room, message, (error) => {
                if(error) console.log('sd error', error);
            });
        }

        if (fra) {
            const message = { loc: loc, team: 'fra', url: url, name: name, };
            sd.publish(room, message, (error) => {
                if(error) console.log('sd error', error);
            });
        }
    };

    if (cro || fra) {
        if (tweet.user.location) {
            const url = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`;
            const name = tweet.user.screen_name;
            const location = tweet.user.location;
            if (savedLoc[location]) {
                pub(savedLoc[location], url, name);
            } else {
                googleMapsClient.geocode({
                    address: tweet.user.location,
                }, (err, response) => {
                    if (!err) {
                        const loc = response.json.results[0].geometry.location;
                        savedLoc[location] = loc;
                        updateLoc();
                        pub(loc, url, name);
                    }
                });
            }
        }
    }
};

const updateLoc = () => {
    fs.writeFile('location.json', JSON.stringify(savedLoc), 'utf8', (err)=>{
        if (err) console.log('Error updating file');
    });
};