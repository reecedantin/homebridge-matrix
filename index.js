var Service;
var Characteristic;

var net = require('net');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-tcp", "TCP", TcpAccessory);
}

function TcpAccessory(log, config) {
  this.log = log;
  this.service = 'Switch';

  this.name		       = config['name'];
  this.onCommand	   = config['on'];
  this.offCommand	   = config['off'];
  this.stateCommand	 = config['state'];
  this.onValue		   = config['on_value'] || "playing";
  this.onValue	   	 = this.onValue.trim();
  this.exactMatch	   = config['exact_match'] || true;
  this.host          = config['host'];
  this.port          = config['port'];
}

TcpAccessory.prototype.matchesString = function(match) {
  if(this.exactMatch) {
    return (match === this.onValue);
  }
  else {
    return (match.indexOf(this.onValue) > -1);
  }
}

TcpAccessory.prototype.setState = function(powerOn, callback) {
  var accessory = this;
  var state = powerOn ? 'on' : 'off';
  var prop = state + 'Command';
  var command = accessory[prop];
  var host = this.host;
  var port = this.port;

  accessory.log('starting set');

  var client = new net.Socket();
  client.connect(port, host, function() {
      accessory.log('CONNECTED TO: ' + host + ':' + port);
      var date = new Date();
      var curDate = null;
      do { curDate = new Date(); }
      while(curDate-date < 1000);
      accessory.log('Was it written? -' + client.write(command + '\n') + '- '+ command);
    });



  client.on('data', function(data) {
      accessory.log('DATA: ' + data.toString('utf-8').trim());
      // Close the client socket completely
      client.destroy();
  });

  client.on('close', function() {
    accessory.log('Set ' + accessory.name + ' to ' + state);
    callback(null);
  });

  client.on('error', function (err) {
    accessory.log('Error: ' + err);
    callback(err || new Error('Error setting ' + accessory.name + ' to ' + state));
  });
}

TcpAccessory.prototype.getState = function(callback) {
  var accessory = this;
  var command = accessory['stateCommand'];
  var host = this.host;
  var port = this.port;

  var client = new net.Socket();
  client.connect(port, host, function() {
      accessory.log('CONNECTED TO: ' + host + ':' + port);
      var date = new Date();
      var curDate = null;
      do { curDate = new Date(); }
      while(curDate-date < 1000);
      accessory.log('Was it written? -' + client.write(command + '\n') + '- '+ command);
  });

  client.on('data', function(data) {
      accessory.log('DATA: ' + data.toString('utf-8').trim());
      var state = data.toString('utf-8').trim();
      accessory.log('State of ' + accessory.name + ' is: ' + state);
      callback(null, accessory.matchesString(state));
      client.destroy();
  });

  accessory.log('here now');

  client.on('error', function (err) {
    accessory.log('Error: ' + err);
    callback(err || new Error('Error getting state from ' + accessory.name));
  });

  accessory.log('all done');
}

TcpAccessory.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();
  var switchService = new Service.Switch(this.name);

  informationService
  .setCharacteristic(Characteristic.Manufacturer, 'TCP Manufacturer')
  .setCharacteristic(Characteristic.Model, 'TCP Model')
  .setCharacteristic(Characteristic.SerialNumber, 'TCP Serial Number');

  var characteristic = switchService.getCharacteristic(Characteristic.On)
  .on('set', this.setState.bind(this));

  if (this.stateCommand) {
    characteristic.on('get', this.getState.bind(this))
  };

  return [switchService];
}
