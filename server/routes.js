const mysql = require('mysql')
const config = require('./config.json')

// Creates MySQL connection using database credential provided in config.json
// Do not edit. If the connection fails, make sure to check that config.json is filled out correctly
const connection = mysql.createConnection({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db
});
connection.connect((err) => err && console.log(err));

/******************
 * WARM UP ROUTES *
 ******************/

// Route 1: GET /author/:type
const author = async function(req, res) {
  // TODO (TASK 1): replace the values of name and pennKey with your own
  const name = 'Madeleine';
  const pennKey = 'leine';

  // checks the value of type the request parameters
  // note that parameters are required and are specified in server.js in the endpoint by a colon (e.g. /author/:type)
  if (req.params.type === 'name') {
    // res.send returns data back to the requester via an HTTP response
    res.send(`Created by ${name}`);
  } else if (req.params.type == 'pennkey') {
    // TODO (TASK 2): edit the else if condition to check if the request parameter is 'pennkey' and if so, send back response 'Created by [pennkey]'
    res.send(`Created by ${pennKey}`);
  } else {
    // we can also send back an HTTP status code to indicate an improper request
    res.status(400).send(`'${req.params.type}' is not a valid author type. Valid types are 'name' and 'pennkey'.`);
  }
}

// Route 2: GET /random
const random = async function(req, res) {
  // you can use a ternary operator to check the value of request query values
  // which can be particularly useful for setting the default value of queries
  // note if users do not provide a value for the query it will be undefined, which is falsey
  const explicit = req.query.explicit === 'true' ? 1 : 0;

  // Here is a complete example of how to query the database in JavaScript.
  // Only a small change (unrelated to querying) is required for TASK 3 in this route.
  connection.query(`
    SELECT *
    FROM Songs
    WHERE explicit <= ${explicit}
    ORDER BY RAND()
    LIMIT 1
  `, (err, data) => {
    if (err || data.length === 0) {
      // If there is an error for some reason, or if the query is empty (this should not be possible)
      // print the error message and return an empty object instead
      console.log(err);
      // Be cognizant of the fact we return an empty object {}. For future routes, depending on the
      // return type you may need to return an empty array [] instead.
      res.json({});
    } else {
      // Here, we return results of the query as an object, keeping only relevant data
      // being song_id and title which you will add. In this case, there is only one song
      // so we just directly access the first element of the query results array (data)
      // TODO (TASK 3): also return the song title in the response
      res.json({
        song_id: data[0].song_id,
        title: data[0].title,
      });
    }
  });
}

/********************************
 * BASIC SONG/ALBUM INFO ROUTES *
 ********************************/

// Route 3: GET /song/:song_id
const song = async function(req, res) {
  const songId = req.params.song_id;

  connection.query(
    'SELECT * FROM Songs WHERE song_id = ?',
    [songId],
    (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else if (data.length === 0) {
        res.status(404).json({ error: 'Song not found' });
      } else {
        const songData = {
          song_id: data[0].song_id,
          album_id: data[0].album_id,
          title: data[0].title,
          number: data[0].number,
          duration: data[0].duration,
          plays: data[0].plays,
          danceability: data[0].danceability,
          energy: data[0].energy,
          valence: data[0].valence,
          tempo: data[0].tempo,
          key_mode: data[0].key_mode,
          explicit: data[0].explicit,
        };
        res.json(songData);
      }
    }
  );
};


// Route 4: GET /album/:album_id
const album = async function(req, res) {
  const albumId = req.params.album_id;

  connection.query(
    `SELECT * FROM Albums WHERE album_id = '${albumId}'`,
    (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else if (data.length === 0) {
        res.status(404).json({ error: 'Album not found' });
      } else {
        const albumData = {
          album_id: data[0].album_id,
          title: data[0].title,
          release_date: data[0].release_date,
          thumbnail_url: data[0].thumbnail_url,
        };
        res.json(albumData);
      }
    }
  );
};

// Route 5: GET /albums
const albums = async function(req, res) {
  // TODO (TASK 6): implement a route that returns all albums ordered by release date (descending)
  // Note that in this case you will need to return multiple albums, so you will need to return an array of objects
  connection.query(
    'SELECT * FROM Albums ORDER BY release_date DESC',
    (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        const albumsData = data.map(album => ({
          album_id: album.album_id,
          title: album.title,
          release_date: album.release_date,
          thumbnail_url: album.thumbnail_url,
        }));
        res.json(albumsData);
      }
    }
  );
}; 


// Route 6: GET /album_songs/:album_id
const album_songs = async function(req, res) {
  // TODO (TASK 7): implement a route that given an album_id, returns all songs on that album ordered by track number (ascending)
  const albumId = req.params.album_id;

  connection.query(
    `SELECT song_id, title, number, duration, plays 
     FROM Songs 
     WHERE album_id = '${albumId}' 
     ORDER BY number ASC`,
    (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        const songsData = data.map(song => ({
          song_id: song.song_id,
          title: song.title,
          number: song.number,
          duration: song.duration,
          plays: song.plays,
        }));
        res.json(songsData);
      }
    }
  );
};

/************************
 * ADVANCED INFO ROUTES *
 ************************/

// Route 7: GET /top_songs
const top_songs = async function(req, res) {
  const page = req.query.page;
  const pageSize = req.query.page_size ? req.query.page_size : 10;

  if (!page) {
    connection.query(
      `SELECT s.song_id, s.title, s.album_id, a.title AS album, s.plays
       FROM Songs s
       JOIN Albums a ON s.album_id = a.album_id
       ORDER BY s.plays DESC`,
      (err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          const songsData = data.map(song => ({
            song_id: song.song_id,
            title: song.title,
            album_id: song.album_id,
            album: song.album,
            plays: song.plays,
          }));
          res.json(songsData);
        }
      }
    );
  } else {
    const offset = (page - 1) * pageSize;
    connection.query(
      `SELECT s.song_id, s.title, s.album_id, a.title AS album, s.plays
       FROM Songs s
       JOIN Albums a ON s.album_id = a.album_id
       ORDER BY s.plays DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      (err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          const songsData = data.map(song => ({
            song_id: song.song_id,
            title: song.title,
            album_id: song.album_id,
            album: song.album,
            plays: song.plays,
          }));
          res.json(songsData);
        }
      }
    );
  }
};

// Route 8: GET /top_albums
const top_albums = async function(req, res) {
  const page = req.query.page;
  const pageSize = req.query.page_size ? req.query.page_size : 10;

  if (!page) {
    // Case 1: Return all top albums ordered by aggregate number of plays (descending)
    connection.query(
      `SELECT a.album_id, a.title, SUM(s.plays) AS plays
       FROM Albums a
       JOIN Songs s ON a.album_id = s.album_id
       GROUP BY a.album_id
       ORDER BY plays DESC`,
      (err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          const albumsData = data.map(album => ({
            album_id: album.album_id,
            title: album.title,
            plays: album.plays,
          }));
          res.json(albumsData);
        }
      }
    );
  } else {
    // Case 2: Return paginated top albums ordered by aggregate number of plays (descending)
    const offset = (page - 1) * pageSize;
    connection.query(
      `SELECT a.album_id, a.title, SUM(s.plays) AS plays
       FROM Albums a
       JOIN Songs s ON a.album_id = s.album_id
       GROUP BY a.album_id
       ORDER BY plays DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      (err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          const albumsData = data.map(album => ({
            album_id: album.album_id,
            title: album.title,
            plays: album.plays,
          }));
          res.json(albumsData);
        }
      }
    );
  }
};

// Route 9: GET /search_albums
const search_songs = async function(req, res) {
  // TODO: return all songs that match the given search query with parameters defaulted to those specified in API spec ordered by title (ascending)
  // Some default parameters have been provided for you, but you will need to fill in the rest
  const title = req.query.title ?? '';
  const durationLow = req.query.duration_low ?? 60;
  const durationHigh = req.query.duration_high ?? 660;
  const playsLow = req.query.plays_low ?? 0;
  const playsHigh = req.query.plays_high ?? 1100000000;
  const danceabilityLow = req.query.danceability_low ?? 0;
  const danceabilityHigh = req.query.danceability_high ?? 1;
  const energyLow = req.query.energy_low ?? 0;
  const energyHigh = req.query.energy_high ?? 1;
  const valenceLow = req.query.valence_low ?? 0;
  const valenceHigh = req.query.valence_high ?? 1;
  const explicit = req.query.explicit === 'true' ? true : false;

  // Construct the SQL query based on the specified filters
  const query = `
    SELECT *
    FROM Songs
    WHERE title LIKE '%${title}%'
      AND duration >= ${durationLow} AND duration <= ${durationHigh}
      AND plays >= ${playsLow} AND plays <= ${playsHigh}
      AND danceability >= ${danceabilityLow} AND danceability <= ${danceabilityHigh}
      AND energy >= ${energyLow} AND energy <= ${energyHigh}
      AND valence >= ${valenceLow} AND valence <= ${valenceHigh}
      ${explicit ? '' : 'AND explicit = 0'}
    ORDER BY title ASC`;

  connection.query(query, (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const songsData = data.map(song => ({
        song_id: song.song_id,
        album_id: song.album_id,
        title: song.title,
        number: song.number,
        duration: song.duration,
        plays: song.plays,
        danceability: song.danceability,
        energy: song.energy,
        valence: song.valence,
        tempo: song.tempo,
        key_mode: song.key_mode,
        explicit: song.explicit,
      }));
      res.json(songsData);
    }
  });
};

module.exports = {
  author,
  random,
  song,
  album,
  albums,
  album_songs,
  top_songs,
  top_albums,
  search_songs,
}
