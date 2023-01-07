const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const path = require("path");

const port = 3000;
app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));

require("dotenv").config();
const apiKey = `${process.env.API_KEY}`;
const cc = "us";
const units = "imperial";
const baseURL = "https://api.openweathermap.org/data/2.5/weather";

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/zip", (req, res) => {
    const zipCode = req.body.zip;
    const url = `${baseURL}?zip=${zipCode},${cc}&appid=${apiKey}&units=${units}`;
    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            const { coord, base, weather, main, wind, clouds, sys, timezone, name } = data;
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
            });
            // Call the mydb function and pass the variables as arguments
            mydb(coord, base, weather, main, wind, clouds, sys, timezone, name);
        });
});

// Error & exception handling
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(500).send("Something went wrong on the server.");
});

// MongoDB Atlas //
const uri =
    `mongodb+srv://${process.env.MONGO_DB_CONNECTION_STRING}`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

// Update the mydb function to accept the variables as arguments
async function mydb(coord, base, weather, main, wind, clouds, sys, timezone, name) {
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
}
mydb();

app.get("/weather", async (req, res) => {
    const weatherDataCollection = client.db("openweatherapi").collection("weathers");
    const weatherData = await weatherDataCollection.find().toArray();
    res.render("weather", { weatherData: weatherData });
});

app.listen(port, () => {
    console.log(`Fetching OpenWeather API and listening on port ${port}`);
});
