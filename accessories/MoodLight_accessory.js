var mqtt = require('mqtt');
var colorsys = require('colorsys');
var log = require('yalm');
log.setLevel('info');

log.info("Connecting to MQTT broker...");
var options = {
  port: 1883,
  host: '192.168.1.7',
  clientId: 'MoodLight'
};
var setCommand = 'set';
var mySerialNum = 'a020a61aab6f';
var prefix = 'homie' + '/' + mySerialNum;
var client = mqtt.connect(options);

log.info("Mood Light Connected to MQTT broker");


var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;

// here's a fake hardware device that we'll expose to HomeKit
var MOOD_LIGHT = {
  powerOn: false,
  warmWhiteOn: false,
  coolWhiteOn: false,
  hue: 0,
  saturation: 0,
  brightness: 100, // percentage
  white_1Brightness: 0,
  white_2Brightness: 0,
  setPowerOn: function(on) {
    log.debug("Turning the light %s...", on ? "on" : "off");
    var state = on ? '1' : '0';
    var topic = prefix + '/switch/state/' + setCommand;
    var message = on ? "1" : "0";
    MOOD_LIGHT.powerOn = on ? true : false;
    client.publish(topic, message);
  },
  setCWPowerOn: function(on) {
    log.debug("Turning the light %s...", on ? "on" : "off");
    var state = on ? '1' : '0';
    var topic = prefix + '/white_1/state/' + setCommand;
    MOOD_LIGHT.coolWhiteOn = on ? true : false;
    log.debug("topic => " + topic);
    client.publish(topic, state);
  },
  setWWPowerOn: function(on) {
    log.debug("Turning the light " + on ? "on" : "off");
    var state = on ? '1' : '0';
    var topic = prefix + '/white_2/state/' + setCommand;
    MOOD_LIGHT.warmWhiteOn = on ? true : false;
    client.publish(topic, state);
  },
  setHue: function(hue) {
    log.debug("Setting light Hue to %s", hue);
    var topic = prefix + '/color/hue/' + setCommand;
    MOOD_LIGHT.hue = hue;
    var message = MOOD_LIGHT.hue;
    client.publish(topic, message);
  },
  setSaturation: function(sat) {
    log.debug("Setting light Saturation to %s", sat);
    var topic = prefix + '/color/saturation/' + setCommand;
    var message = MOOD_LIGHT.saturation = sat;
    client.publish(topic, message);
  },
  setBrightness: function(brightness) {
    log.debug("Setting light Brightness to %s", brightness);
    var topic = prefix + '/color/brightness/' + setCommand;
    MOOD_LIGHT.brightness = brightness;
    var message = MOOD_LIGHT.brightness = brightness;
    client.publish(topic,message);
  },
  setW1Brightness: function(brightness) {
    log.debug("Setting w1 light brightness to %s", brightness);
    var topic = prefix + '/white_1/brightness/' + setCommand;
    MOOD_LIGHT.white_1Brightness = brightness;
    var message = MOOD_LIGHT.white_1Brightness;
    client.publish(topic, message);
  },
  setW2Brightness: function(brightness) {
    log.debug("Setting w2 light brightness to %s", brightness);
    var topic = prefix + '/white_2/brightness/' + setCommand;
    MOOD_LIGHT.white_2Brightness = brightness;
    var message = MOOD_LIGHT.white_2Brightness;
    client.publish(topic, message);
  },
  getStatus: function(filter) {
    if(filter == undefined){
      filter = '';
    }
    log.debug("Triggering status poll");
    var topic = prefix + '/info/status/' + setCommand;
    var message = filter;
    client.publish(topic, message);
  },
  identify: function() {
    log.debug("Identify the light!");
    var topic = prefix + '/identify/node/' + setCommand;
    var message = '1';
    client.publish(topic, message);
  }
}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:mood_light');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var light = exports.accessory = new Accessory('Mood Light', lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
light.username = "1A:2B:3C:4D:6E:FE";



light.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
light
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Oltica")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW");

// listen for the "identify" event for this Accessory
light.on('identify', function(paired, callback) {
  MOOD_LIGHT.identify();
  callback(); // success
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`

var rgb_light = light
  .addService(Service.Lightbulb, "RGB Light", "rgb_light"); // services exposed to the user should have "names" like "Fake Light" for us

rgb_light
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    var err = null;
    MOOD_LIGHT.getStatus('color_s');
    callback(null, MOOD_LIGHT.powerOn);
  })
  .on('set', function(value, callback) {
    MOOD_LIGHT.setPowerOn(value);
    callback(); // Our fake Light is synchronous - this value has been successfully set
  });

rgb_light
  .getCharacteristic(Characteristic.Hue)
  .on('get', function(callback) {
    MOOD_LIGHT.getStatus('hue');
    callback(null, MOOD_LIGHT.hue);
  })
  .on('set', function(value, callback) {
    MOOD_LIGHT.setHue(value.toString());
    callback();
  });

rgb_light
  // .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.Saturation)
  .on('get', function(callback) {
    MOOD_LIGHT.getStatus('saturation')
    callback(null, MOOD_LIGHT.saturation);
  })
  .on('set', function(value,callback) {
    MOOD_LIGHT.setSaturation(value.toString());
    callback();
  });

rgb_light
  // .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    MOOD_LIGHT.getStatus('brightness')
    callback(null, MOOD_LIGHT.brightness);
  })
  .on('set', function(value, callback) {
    MOOD_LIGHT.setBrightness(value.toString());
    callback();
  });

var w1_light = light
  .addService(Service.Lightbulb, "Cool White Light", "cool_white"); // services exposed to the user should have "names" like "Fake Light" for us

w1_light
  .getCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    MOOD_LIGHT.getStatus('w1_light_b');
    callback(null, MOOD_LIGHT.white_1Brightness);
  })
  .on('set', function(value, callback) {
    MOOD_LIGHT.setW1Brightness(value.toString());
    callback();
  });

w1_light
  // .getService(Service.Lightbulb)
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    MOOD_LIGHT.getStatus('w1_light_s');
    callback(null, MOOD_LIGHT.coolWhiteOn);
  })
  .on('set', function(value, callback) {
    MOOD_LIGHT.setCWPowerOn(value);
    callback();
  });

var w2_light = light
  .addService(Service.Lightbulb, "Warm White Light", "warm_white"); // services exposed to the user should have "names" like "Fake Light" for us

w2_light
  .getCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    MOOD_LIGHT.getStatus('w2_light_b');
    callback(null, MOOD_LIGHT.white_2Brightness);
  })
  .on('set', function(value, callback) {
    MOOD_LIGHT.setW2Brightness(value.toString());
    callback();
  });

w2_light
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    MOOD_LIGHT.getStatus('w2_light_s');
    callback(null, MOOD_LIGHT.warmWhiteOn);
  })
  .on('set', function(value, callback) {
    MOOD_LIGHT.setWWPowerOn(value);
    callback();
  });


client.subscribe(prefix + '/#' );
client.on('message', function(topic, message){
  log.debug("In subscription handler");
  log.debug("Topic => " + topic);
  var topic_array = topic.split("/");
  var characteristic_type = topic_array.pop();
  var node_type = topic_array.pop()
  log.debug("node_type => " + node_type + "  /  char_type => " + characteristic_type);
  switch(node_type){
    case "switch":
      if(characteristic_type == 'state') {
        var wState = message == "on" ? true : false;
        MOOD_LIGHT.powerOn = wState;
        rgb_light
        .updateCharacteristic(Characteristic.On, wState);
      }
      break;
    case "white_1":
      if(characteristic_type == 'brightness'){
        var wBrightnessValue = parseInt(message, 10);
        MOOD_LIGHT.white_1Brightness = wBrightnessValue;
        w1_light
        .updateCharacteristic(Characteristic.Brightness, wBrightnessValue)
        if(parseInt(wBrightnessValue, 10) == 0){
          w1_light.updateCharacteristic(Characteristic.On, false);
        }

      }else if(characteristic_type == 'state'){
        var wState = message == "on" ? true : false;
        MOOD_LIGHT.coolWhiteOn = wState;
        w1_light
        .updateCharacteristic(Characteristic.On, wState);
      }
      break;
    case "white_2":
      if(characteristic_type == 'brightness'){
        var wBrightnessValue = parseInt(message, 10);
        MOOD_LIGHT.white_2Brightness = wBrightnessValue;
        w2_light
        .updateCharacteristic(Characteristic.Brightness, wBrightnessValue)
        if(parseInt(wBrightnessValue, 10) == 0){
          w2_light.updateCharacteristic(Characteristic.On, false);
        }
      }else if(characteristic_type == 'state'){
        var wState2 = message == "on" ? true : false;
        MOOD_LIGHT.warmWhiteOn = wState2;
        w2_light
        .updateCharacteristic(Characteristic.On, wState2);
      }
      break;
    case "color":
      var acceptable_characteristics = ["hue", "saturation", "brightness", "state"];
      if(acceptable_characteristics.indexOf(characteristic_type) >= 0){
        var colorComponentValue = parseInt(message, 10);
        var stateValue = message.toString();
        log.debug("message: ", colorComponentValue);
        MOOD_LIGHT[characteristic_type] = colorComponentValue;
        switch(characteristic_type){
          case "hue":
            rgb_light
            .updateCharacteristic(Characteristic.Hue, colorComponentValue);
            break;
          case "saturation":
            rgb_light
            .updateCharacteristic(Characteristic.Saturation, colorComponentValue);
            break;
          case "brightness":
            rgb_light
            .updateCharacteristic(Characteristic.Brightness, colorComponentValue)
            if(parseInt(colorComponentValue, 10) == 0){
              rgb_light.updateCharacteristic(Characteristic.On, false);
            }
            break;
          case "state":
            rgb_light
            .updateCharacteristic(Characteristic.On, stateValue == 'on' ? true : false);
            break;
        }
      }
      break;
    default:
      break;
  }
});
