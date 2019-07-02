var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var log = require('yalm');

var NAME = "Weather Station";
var USERNAME = "11:22:34:43:55:66";
var SERIAL = "462189005";

var MQTT_ID = "homekit_" + SERIAL;
var MQTT_IP = "192.168.1.7";

var devName = "weather-station";

var statusTopic = devName + "/bme280/";

var temperatureTopic = statusTopic + 'Temperature';
var humidityTopic = statusTopic + 'Humidity';
var pressureTopic = statusTopic + 'Pressure';

var domoticz_index = 134;

var mqtt = require('mqtt');
var options = {
  port: 1883,
  host: MQTT_IP,
  clientId: MQTT_ID
};

// here's a fake temperature sensor device that we'll expose to HomeKit
var EnvironmentSensor = {
  CurrentTemperature: 50,
  CurrentRelativeHumidity: 500,
  CurrentBarPressure: 2,
  name: NAME,
  pincode: "031-45-154",
  username: USERNAME,
  manufacturer: "HAP-NodeJS",
  model: "AE-35",
  serialNumber: SERIAL,
  getTemperature: function() {
    console.log("Getting the current temperature!");
    return this.CurrentTemperature;
  },
  getHumidity: function() {
    console.log("Getting current Humidity");
    return this.CurrentRelativeHumidity;
  },
  getPressure: function() {
    console.log("Getting Barometric Pressure");
    return this.CurrentBarPressure;
  }
}


// Generate a consistent UUID for our Temperature Sensor Accessory that will remain the same
// even when restarting our server. We use the `uuid.generate` helper function to create
// a deterministic UUID based on an arbitrary "namespace" and the string "temperature-sensor".
var sensorUUID = uuid.generate('hap-nodejs:accessories:temperature-sensor');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake lock.
var sensor = exports.accessory = new Accessory(EnvironmentSensor.name, sensorUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
sensor.username = EnvironmentSensor.username;
sensor.pincode = EnvironmentSensor.pincode;

sensor
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, EnvironmentSensor.manufacturer)
    .setCharacteristic(Characteristic.Model, EnvironmentSensor.model)
    .setCharacteristic(Characteristic.SerialNumber, EnvironmentSensor.serialNumber);

// Add the actual TemperatureSensor Service.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
sensor
  .addService(Service.TemperatureSensor, "Temperature")
  .getCharacteristic(Characteristic.CurrentTemperature)
  .setProps({
    minValue: -100,
    maxValue: 100
  })
  .on('get', function(callback) {
    // return our current value
    callback(null, EnvironmentSensor.getTemperature());
  })


sensor
  .addService(Service.HumiditySensor, "Humidity")
  .getCharacteristic(Characteristic.CurrentRelativeHumidity)
  .on('get', function(callback) {
     callback(null, EnvironmentSensor.getHumidity());
  });

var client = mqtt.connect(options);

client.on('connect', function() {
  console.log("Connection to MQTT broker established");
})

client.on('message', function(topic, message) {
  data_obj = JSON.parse(message);
  if("idx" in data_obj && data_obj.idx == domoticz_index) {
    svalues = data_obj.svalue.split(";");
    var values = {
      "temperature": parseFloat(svalues[0]),
      "humidity": parseFloat(svalues[1]),
      "pressure": parseFloat(svalues[3])
    }
    EnvironmentSensor.CurrentTemperature = values.temperature;
    sensor
    .getService(Service.TemperatureSensor)
    .getCharacteristic(Characteristic.CurrentTemperature)
    .updateValue(EnvironmentSensor.CurrentTemperature);

    EnvironmentSensor.CurrentRelativeHumidity = values.humidity;
    sensor
    .getService(Service.HumiditySensor)
    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .updateValue(EnvironmentSensor.CurrentRelativeHumidity);

  }
  // value = parseFloat(message);
  // if (topic == temperatureTopic) {
  //   EnvironmentSensor.CurrentTemperature = value;
  //   sensor
  //   .getService(Service.TemperatureSensor)
  //   .getCharacteristic(Characteristic.CurrentTemperature)
  //   .updateValue(EnvironmentSensor.CurrentTemperature);
  // }
  // if (topic == humidityTopic) {
  //   EnvironmentSensor.CurrentRelativeHumidity = value;
  //   sensor
  //   .getService(Service.HumiditySensor)
  //   .getCharacteristic(Characteristic.CurrentRelativeHumidity)
  //   .updateValue(EnvironmentSensor.CurrentRelativeHumidity);

    // sensor
    // .updateCharacteristic(Characteristic.CurrentRelativeHumidity, EnvironmentSensor.CurrentRelativeHumidity);
  // }
  // if (topic == pressureTopic) {
  //   EnvironmentSensor.CurrentBarPressure = value;
  //   sensor
  //   .updateCharacteristic(CustomCharacteristic.AtmosphericPressureLevel, EnvironmentSensor.CurrentBarPressure);
  // }
});

// client.subscribe(statusTopic + "#", {qos: 1});
client.subscribe("domoticz/in", {qos: 1});

setInterval(function() {

  // update the characteristic value so interested iOS devices can get notified
  sensor
    .getService(Service.TemperatureSensor)
    // .setCharacteristic(Characteristic.CurrentTemperature, EnvironmentSensor.CurrentTemperature);
    .getCharacteristic(Characteristic.CurrentTemperature)
    .updateValue(EnvironmentSensor.CurrentTemperature, null);
  sensor
    .getService(Service.HumiditySensor)
    .setCharacteristic(Characteristic.CurrentRelativeHumidity, EnvironmentSensor.CurrentRelativeHumidity);

}, 3000);
