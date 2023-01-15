const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const morgan = require('morgan');
const helpers = require("./helper");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = 3000;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('tiny'));

require("dotenv").config();
const apiKey = `${process.env.API_KEY}`;
const cc = "us";
const units = "imperial";
const baseCurrentURL = `http://api.openweathermap.org/data/2.5/weather?zip=`;
const baseGeoURL = `http://api.openweathermap.org/geo/1.0/zip?zip=`;
const baseURL = "http://api.openweathermap.org/data/2.5/forecast?";

// fetch current
const currentWeather = async (zipCode) => {
    try {
        const url = `${baseCurrentURL}${zipCode},${cc}&appid=${apiKey}&units=${units}`;
        const weatherData = await fetch(url);
        const weatherDataJSON = await weatherData.json();
        return weatherDataJSON;
    } catch (err) {
        console.error("error in `currentWeather`:", err);
    }
};

// fetch five day
const fiveDayWeather = async (zipCode) => {
    try {
        const url = `${baseGeoURL}${zipCode},${cc}&appid=${apiKey}&units=${units}`;
        const geoData = await fetch(url);
        const geoDataJSON = await geoData.json();
        const { lat, lon } = geoDataJSON;
        const fiveDayURL = `${baseURL}lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
        const fiveDayData = await fetch(fiveDayURL);
        const fiveDayDataJSON = await fiveDayData.json();
        return fiveDayDataJSON;
    } catch (err) {
        console.error("Error fetching five day data:", err);
    }
};

app.get("/", (req, res) => {
    res.render("index");
});

// render data
app.post("/zip", async (req, res) => {
    try {
        const zipCode = req.body.zip;
        const weatherData = await currentWeather(zipCode);
        const fiveDayWeatherData = await fiveDayWeather(zipCode);
        const { coord, base, weather, main, wind, clouds, sys, timezone, name } = weatherData;
        const { list } = fiveDayWeatherData;
        res.render("index", {
            coord: coord,
            base: base,
            weather: weather,
            main: main,
            wind: wind,
            clouds: clouds,
            sys: sys,
            timezone: timezone,
            name: name,
            list: list,
            unixTimeConvertor: helpers.unixTimeConvertor,
        });
        mydb(coord, base, weather, main, wind, clouds, sys, timezone, name);
    } catch (err) {
        console.error("Error rendering data:", err);
        res.status(500).send("Error getting weather data.");
    }
});

// ------------------ MongoDB Atlas ------------------ //
const uri = `mongodb+srv://${process.env.MONGO_DB_CONNECTION_STRING}`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

// Update the mydb function to accept the variables as arguments
const mydb = async (coord, base, weather, main, wind, clouds, sys, timezone, name) => {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        const weatherDataCollection = client.db("openweatherapi").collection("weathers");
        await weatherDataCollection.insertOne({
            coord: coord,
            base: base,
            weather: weather,
            main: main,
            wind: wind,
            clouds: clouds,
            sys: sys,
            timezone: timezone,
            name: name,
        });
    } catch (err) {
        console.error("Error connecting to MongoDB Atlas:", err);
    }
};
mydb();

app.get("/weather", async (req, res) => {
    const weatherDataCollection = client.db("openweatherapi").collection("weathers");
    const weatherData = await weatherDataCollection.find().toArray();
    res.render("weather", { weatherData: weatherData });
});

// Error & exception handling
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(500).send("ERROR created in app.use");
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
