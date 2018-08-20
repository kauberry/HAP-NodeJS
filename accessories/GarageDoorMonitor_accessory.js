// HomeKit types required
var types = require("./types.js");
var exports = module.exports = {};
var uuid = require('../').uuid;

var mqtt = require('mqtt');
var log = require('yalm');
log.setLevel('debug');

var execute = function (accessory, characteristic, value) {
  log.info("executed accessory: " + accessory + ", and characteristic: " + characteristic + ", with value: " + value + ".");
};
var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;


var gdoUUID = uuid.generate('hap-nodejs:accessories:main_garage_door');
var gdo = exports.accessory = new Accessory('Main Garage Door', gdoUUID);

gdo.username = "3C:5A:3D:EE:5E:FA";
gdo.pincode = "031-45-154";

// var mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0', retain: true}});
// console.log("Client Info");
// console.log(client);
var name = 'garage';
var myID = 1;
var inPrefix = name + '/in/' + myID;
var outPrefix = name + '/out/' + myID;
var packet_types = {
  status: 'status',
  door_control: 'door_trigger',
  light_control: 'light_trigger',
  ambient_temperature: 'temperature',
  case_temperature: 'case_temperature',
  identify: 'identify'
};

var options = {
  // port: 1833,
  // host: '192.168.1.7',
  clientId: 'MainGarageDoor',
  will: {
    topic: name + '/connected',
    payload: '0',
    retain: true
  }
};
// var client = mqtt.connect(options);
var client = mqtt.connect('mqtt://192.168.1.7',options);
log.info('mqtt trying to connect');

if(client){
  log.info("GDO Connected to MQTT broker", options.host);
}else{
  log.info("Couldn't connect");
}



var GARAGE_DOOR_MONITOR = {
  position_status: false,
  current_temp_c: 105.1,
  current_case_temp_c: 107.2,
  getCurrentStatus: function () {
    log.debug("Checking current door status");
    var topic = inPrefix + '/' + packet_types.status;
    var message = '0';
    // GARAGE_DOOR_MONITOR.position_status = message == 'closed' ? 1 : 0;
    client.publish(topic, message);
    //return GARAGE_DOOR_MONITOR.position_status;
  },
  setDoorState: function(current_state){
    log.debug("Trying to set current state to",current_state);
    gdo
      .getService(Service.GarageDoorOpener)
      .setCharacteristic(Characteristic.CurrentDoorState,current_state)
    this.position_status = current_state;
    //this.updateIOS();
  },
  setCurrentTemperature: function(current_temp_c){
    log.debug("Setting local temperature to", current_temp_c);
    gdo
      .getService(Service.TemperatureSensor)
      .setCharacteristic(Characteristic.CurrentTemperature, current_temp_c);
    this.current_temp_c = current_temp_c;
  },
  setNewDoorState: function(requested_state){
    requested_state = parseInt(requested_state,10);
    log.debug("Current State is",this.position_status,"Desired state is",requested_state);
    if(requested_state != this.position_status){
        switch(requested_state){
            case 0:
                log.debug("Attempting to open door")
                this.sendDoorTrigger();
                break;
            case 1:
                log.debug("Attempting to close door");
                this.sendDoorTrigger();
                break;
            default:
        }
    }else{
        log.debug("Door is already in requested status [" + this.position_status + "]");
    }
  },
  getCurrentTemperature: function(){
    var topic = inPrefix + '/' + packet_types.temperature
    var message = '';
    client.publish(topic,message);
    return this.current_temp_c;
  },
  sendDoorTrigger: function(){
    var topic = inPrefix + '/' + packet_types.door_control;
    var message = '0';
    client.publish(topic,message);
  },
  identify: function() {
    log.debug("Do something to identify the Opener");
    var topic = inPrefix + '/' + packet_types.identify;
    var message = '0';
    client.publish(topic,message);
    //flash the status light or something
  },
  //update the IOS device with the current state of the accessory
  updateIOS: function(){
    gdo
      .getService(Service.GarageDoorOpener)
      .getCharacteristic(Characteristic.CurrentDoorState)
      .updateValue(this.position_status);
  }
}



client.on('connect', function () {
  log.debug("subscribing to ", outPrefix + '/#');
  client.subscribe(outPrefix + '/#');
  client.publish(inPrefix + '/presence', 'MQTT Online');
  client.publish(inPrefix + '/ambient_temperature', '');
  client.publish(inPrefix + '/case_temperature', '');
  client.publish(inPrefix + '/status','');
  GARAGE_DOOR_MONITOR.updateIOS();
});

// client.on('packetreceive', function(packet){
//   log.info("received packet");
//   log.debug(packet);
// });

// client.on('data', function(packet){
//   log.info("received data ");
//   log.debug(packet);
// });


client.on('message', function(topic,message){
    //gdo
    log.debug("topic received =>",topic)
    var split_topic = topic.split("/");
    var type = split_topic.pop();
    var packet_type = packet_types[type];
    var id = parseInt(split_topic.pop(),10);
    var msg_string = message.toString('utf-8');
    var pkt = msg_string.split("|");
    log.debug("Received packet of type",type);
    log.debug(packet_type);
    switch(packet_type){
        case packet_types.status:
            log.debug("Received door status message:", msg_string);
            GARAGE_DOOR_MONITOR.setDoorState(parseInt(msg_string,10));
            // GARAGE_DOOR_MONITOR.position_status = parseInt(msg_string,10);
            log.debug("Set position status to",GARAGE_DOOR_MONITOR.position_status);
            break;
        case packet_types.door_trigger:
            var cur_position = GARAGE_DOOR_MONITOR.position_status;
            log.debug("Received door trigger ack");
            log.debug("Door currently is in position",cur_position);
            // GARAGE_DOOR_MONITOR.setDoorState
            break;
        case packet_types.light_trigger:
            log.debug("Received light trigger ack");
            break;
        case packet_types.ambient_temperature:
            log.debug("In temp request",msg_string);
            GARAGE_DOOR_MONITOR.setCurrentTemperature(parseFloat(msg_string));
            break;
    }
});

var getPositionState = function(msg_string){
  switch(msg_string){
    case 'open':
      return 0;
    case 'closed':
      return 1;
    case 'opening':
      return 2;
    case 'closing':
      return 3;
    default:
      return 4;
  }
  return 4;
};


gdo
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "KDA Enterprises")
    .setCharacteristic(Characteristic.Model, "Garage Monitor v5")
    .setCharacteristic(Characteristic.SerialNumber, "98200-38411-AE35N");

gdo.on('identify', function(paired, callback){
    GARAGE_DOOR_MONITOR.identify();
    log.debug("This is the GDO identify routine");
    callback();
});

gdo
    .addService(Service.GarageDoorOpener, "Main Garage Door")
    .getCharacteristic(Characteristic.TargetDoorState)
    .on('set', function(value, callback){
        value_string = value == true ? "closed" : "open";
        log.debug("trying to set door state to",value_string);
        GARAGE_DOOR_MONITOR.setNewDoorState(value);
        callback(null, value);
    })
    .on('get', function(callback){
        GARAGE_DOOR_MONITOR.getCurrentStatus();
        callback(null, GARAGE_DOOR_MONITOR.position_status);
    });

gdo
    .getService(Service.GarageDoorOpener)
    .getCharacteristic(Characteristic.CurrentDoorState)
    .on('get', function(callback){
        var err = null;
        GARAGE_DOOR_MONITOR.getCurrentStatus();
        log.debug("in GDO CurrentDoorState get =>",GARAGE_DOOR_MONITOR.position_status);
        callback(null, GARAGE_DOOR_MONITOR.position_status);
    })
    .on('change', function(callback){
        log.debug("in GDO CurrentDoorState update");
    });


gdo
    .getService(Service.GarageDoorOpener)
    .getCharacteristic(Characteristic.ObstructionDetected)
    .on('get', function(callback){
        // var err = null;
        // var door_state = GARAGE_DOOR_MONITOR.getCurrentStatus();
        // callback(null, GARAGE_DOOR_MONITOR.position_status);
        log.debug("This is the Obstruction routine");
        callback(null, false);
    });

gdo
    .addService(Service.TemperatureSensor)
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', function(callback){
      callback(null, GARAGE_DOOR_MONITOR.getCurrentTemperature());
    })
