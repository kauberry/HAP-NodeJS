var mqtt = require('mqtt');
var log = require('yalm');
log.setLevel('info');

log.info("Connecting to MQTT broker...");
var options = {
  port: 1883,
  host: '192.168.1.7',
  clientId: 'MoodLight'
};

var hostName = 'moodlights';
var setCommand = 'set';
var mySerialNum = 'a020a61aab6f';
var prefix = hostName;
var switchTopic = [prefix, "relay", "0"].join("/");
var hsvTopic = [prefix, "hsv"].join("/");
var miredTopic = [prefix, "mired"].join("/");
var client = mqtt.connect(options);

log.info("Mood Light Connected to MQTT broker");

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

var MOOD_LIGHT = {
  powerState: false,
  hue: 0,
  saturation: 0,
  brightness: 0,
  mired: 500,
  setPower: function(newState) {
    var state = newState ? "on" : "off";
    log.debug("Turning the light %s...", state);
    var topic = [switchTopic, setCommand].join("/");
    var message = state;
    client.publish(topic, message, {retain: true});
  },
  getPower: function() {
    var topic = [switchTopic, setCommand].join("/");
    var message = "query";
    client.publish(topic, message);
  },
  getStatus: function() {
    var topic = [hsvTopic, setCommand].join("/");
    var message = "query";
    client.publish(topic, message);
  },
  setTemp: function(value) {
    log.debug("Setting Temp to " + value + " mired");
    var topic = [miredTopic, setCommand].join("/");
    var message = value;
    client.publish(topic, message, {retain: true});
  },
  setColor: function(value) {
    var topic = [hsvTopic, setCommand].join("/");
    var messageObj = [
      this.hue, this.saturation, this.brightness
    ];
    var message = messageObj.join(",");
    client.publish(topic, message, {retain: true});
  }
};

var lightUUID = uuid.generate('hap-nodejs:accessories:mood_light');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var light = exports.accessory = new Accessory('Mood Light', lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
light.username = "1A:2B:3C:4D:6E:FE";

light.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
light
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Lixada")
  .setCharacteristic(Characteristic.Model, "H801")
  .setCharacteristic(Characteristic.SerialNumber, "A020A61AAB6F");

var rgb_light = light
  .addService(Service.Lightbulb, "Colored Light", "rgb_light"); // services exposed to the user should have "names" like "Fake Light" for us

rgb_light
  .getCharacteristic(Characteristic.On)
  .on("get", function(callback) {
    MOOD_LIGHT.getPower();
    MOOD_LIGHT.getStatus();
    callback(null, MOOD_LIGHT.powerState);
  })
  .on("set", function(value, callback) {
    MOOD_LIGHT.setPower(value);
    callback();
  });

rgb_light
  .getCharacteristic(Characteristic.Hue)
  .on("get", function(callback) {
    MOOD_LIGHT.getStatus();
    callback(null, MOOD_LIGHT.hue);
  })
  .on("set", function(value, callback) {
    MOOD_LIGHT.hue = parseInt(value, 10);
    MOOD_LIGHT.setColor(value.toString());
    callback();
  });

rgb_light
  .getCharacteristic(Characteristic.Saturation)
  .on("get", function(callback) {
    MOOD_LIGHT.getStatus();
    callback(null, MOOD_LIGHT.saturation);
  })
  .on("set", function(value, callback) {
    MOOD_LIGHT.saturation = parseInt(value, 10);
    MOOD_LIGHT.setColor(value);
    callback();
  });

rgb_light
  .getCharacteristic(Characteristic.Brightness)
  .on("get", function(callback) {
    MOOD_LIGHT.getStatus();
    callback(null, MOOD_LIGHT.brightness);
  })
  .on("set", function(value, callback) {
    MOOD_LIGHT.brightness = parseInt(value, 10);
    MOOD_LIGHT.setColor(value);
    callback();
  });

rgb_light
  .getCharacteristic(Characteristic.ColorTemperature)
  .on("get", function(callback) {
    MOOD_LIGHT.getStatus();
    log.debug("mired value =>", MOOD_LIGHT.mired);
    callback(null, MOOD_LIGHT.mired);
  })
  .on("set", function(value, callback) {
    MOOD_LIGHT.mired = parseInt(value, 10);
    MOOD_LIGHT.setTemp(value.toString());
    callback();
  });

client.subscribe([prefix, "data", "#"].join("/"));

client.on("connect", function(topic, message) {
  MOOD_LIGHT.getPower();
  MOOD_LIGHT.getStatus();
});

client.on("message", function(topic, message) {
  log.debug("In message handler");
  log.debug("Topic => '" + topic + "'");
  log.debug("Message => " + message);
  var messageObj = JSON.parse(message);
  if ("relay/0" in messageObj) {
    log.debug("Setting PowerState to", messageObj["relay/0"]);
    MOOD_LIGHT.powerState = messageObj["relay/0"] == "1";
    rgb_light
    .updateCharacteristic(Characteristic.On, MOOD_LIGHT.powerState);
  }
  if ("hsv" in messageObj) {
    var hsv = messageObj["hsv"].split(",");
    MOOD_LIGHT.hue = hsv[0];
    MOOD_LIGHT.saturation = hsv[1];
    MOOD_LIGHT.brightness = hsv[2];
    rgb_light
    .updateCharacteristic(Characteristic.Hue, MOOD_LIGHT.hue)
    .updateCharacteristic(Characteristic.Saturation, MOOD_LIGHT.saturation)
    .updateCharacteristic(Characteristic.Brightness, MOOD_LIGHT.brightness);
  }
  if ("mired" in messageObj) {
    MOOD_LIGHT.mired = messageObj["mired"];
    log.debug("Processing Mired Value of", MOOD_LIGHT.mired);
    rgb_light
    .updateCharacteristic(Characteristic.ColorTemperature, MOOD_LIGHT.mired);
  }
  if ("brightness" in messageObj) {
    var b_percent = parseInt(messageObj["brightness"], 10) / 255 * 100
    MOOD_LIGHT.brightness = Math.round(b_percent).toString();
    rgb_light
    .updateCharacteristic(Characteristic.Brightness, MOOD_LIGHT.brightness);
  }
});
