var mqtt = require('mqtt');
var log = require('yalm');
log.setLevel('info');

log.info("Connecting to MQTT broker...");
var options = {
  port: 1883,
  host: '192.168.1.7',
  clientId: 'WifiSwitchedOutlet'
};
var setCommand = 'set';
var myID = 'christmas-tree';
var myName = 'Christmas Tree Lights';
var prefix = 'devices' + '/' + myID;
var client = mqtt.connect(options);

var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var err = null; // in case there were any problems

// here's a fake hardware device that we'll expose to HomeKit
var MQTT_OUTLET = {

  setPowerOn: function(on) {
    log.debug("Turning the switch %s...", on ? "on" : "off");
    var state = on ? '1' : '0';
    var topic = prefix + '/switch/on/' + setCommand;
    var message = on ? "true" : "false";
    MQTT_OUTLET.powerOn = on ? true : false;
    MQTT_OUTLET.inUse = on ? true : false
    client.publish(topic, message);

    if (on) {
      MQTT_OUTLET.powerOn = true;
      if(err) { return log.error(err); }
      log.debug("...outlet is now on.");
    } else {
      MQTT_OUTLET.powerOn = false;
      if(err) { return log.error(err); }
      log.debug("...outlet is now off.");
    }
  },
  identify: function() {
    log.debug("Identify the outlet.");
  }
}

// Generate a consistent UUID for our outlet Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the accessory name.
var outletUUID = uuid.generate('hap-nodejs:accessories:Outlet');

// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var outlet = exports.accessory = new Accessory('Outlet', outletUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
outlet.username = "1A:2B:3C:4D:5D:FF";
outlet.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
outlet
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "WorkChoice")
  .setCharacteristic(Characteristic.Model, "1 OI Wi-Fi Switch")
  .setCharacteristic(Characteristic.SerialNumber, "382B78023E48");

// listen for the "identify" event for this Accessory
outlet.on('identify', function(paired, callback) {
  MQTT_OUTLET.identify();
  callback(); // success
});

// Add the actual outlet Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
var myOutlet = outlet
  .addService(Service.Outlet, myName) // services exposed to the user should have "names" like "Fake Light" for us

myOutlet
  .getCharacteristic(Characteristic.OutletInUse)
  .on('get', function(callback) {
    if (MQTT_OUTLET.inUse) {
      console.log("Are we in use? Yes.");
      callback(err, true);
    }
    else {
      console.log("Are we in use? No.");
      callback(err, false);
    }
  });


myOutlet
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    MQTT_OUTLET.setPowerOn(value);
    callback(); // Our fake Outlet is synchronous - this value has been successfully set
  })

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
  .on('get', function(callback) {

    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.

    var err = null; // in case there were any problems

    if (MQTT_OUTLET.powerOn) {
      console.log("Are we on? Yes.");
      callback(err, true);
    }
    else {
      console.log("Are we on? No.");
      callback(err, false);
    }
  });

client.subscribe(prefix + '/#');
client.on('message', function(topic, message){
  log.debug("In subscription handler...");
  log.debug("Topic => " + topic);
  var topic_array = topic.split("/");
  var characteristic_type = topic_array.pop();
  var node_type = topic_array.pop();
  log.debug("node_type => " + node_type + "  /  char_type => " + characteristic_type);
  switch(node_type){
    case "switch":
      if(characteristic_type == 'on') {
        var pState = message  == "true" ? true : false;
        MQTT_OUTLET.powerOn = pState;
        MQTT_OUTLET.inUse = pState;
        myOutlet
        .updateCharacteristic(Characteristic.On, pState)
        .updateCharacteristic(Characteristic.OutletInUse, pState);
      }
      break;
    default:
      break;
  }
});
