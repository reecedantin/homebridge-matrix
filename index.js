var Service;
var Characteristic;

var net = require('net');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-matrix", "HDMIMatrix", MatrixAccessory);
}

function MatrixAccessory(log, config) {
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

MatrixAccessory.prototype.matchesString = function(match) {
  if(this.exactMatch) {
    return (match === this.onValue);
  }
  else {
    return (match.indexOf(this.onValue) > -1);
  }
}

MatrixAccessory.prototype.setState = function(powerOn, callback) {
  var accessory = this;
  var state = powerOn ? 'on' : 'off';
  var prop = state + 'Command';
  var command = accessory[prop];
  var host = this.host;
  var port = this.port;
  var pass = 0;

  accessory.log('starting set');

  var client = new net.Socket();
  client.connect(port, host, function() {
      accessory.log('CONNECTED TO: ' + host + ':' + port);
  });

  client.on('data', function(data) {
      accessory.log('DATA: ' + data.toString('utf-8').trim());
      var state = data.toString('utf-8').trim();
      var checkready = state.split("\n");
      var isCarrot = checkready[checkready.length-1];
      accessory.log("is this a carrott? -"+isCarrot);
      if(pass == 0)
      {
        accessory.log('Was it written? -admin');
        client.write('admin\r\n');
      }
      else if(pass == 1)
      {
        client.write('123\r\n');
        accessory.log('Was it written? -123');
      }
      else if(pass == 2)
      {
        client.write(command +'\r\n');
        accessory.log('Was it written? -' + command);
      }
      else if(pass > 2 && isCarrot == ">")
      {
        accessory.log("is this a carrott? -"+isCarrot);
        client.destroy();
        pass = -1;
      }
      pass++;
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

MatrixAccessory.prototype.getState = function(callback) {
  var accessory = this;
  var command = 'STMAP';
  var host = this.host;
  var port = this.port;
  var i = true

  accessory.log('starting get');

  var client = new net.Socket();
  client.connect(port, host, function() {
      accessory.log('CONNECTED TO: ' + host + ':' + port);
  });

  client.on('data', function(data) {
      accessory.log('DATA: ' + data.toString('utf-8').trim());
      var state = data.toString('utf-8').trim();

      if(pass == 0)
      {
        accessory.log('Was it written? -admin');
        client.write('admin\r\n');
        pass++;
      }
      else if(pass == 1)
      {
        client.write('123\r\n');
        accessory.log('Was it written? -123');

        pass++;
      }
      else if(pass == 2)
      {
        client.write(command +'\r\n');
        accessory.log('Was it written? -' + command);
        pass++;
      }
      else if(pass == 3)
      {
        client.destroy();
        pass = 0;
      }
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

MatrixAccessory.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();
  var switchService = new Service.Switch(this.name);

  informationService
  .setCharacteristic(Characteristic.Manufacturer, 'Matrix Manufacturer')
  .setCharacteristic(Characteristic.Model, 'Matrix Model')
  .setCharacteristic(Characteristic.SerialNumber, 'Matrix Serial Number');

  var characteristic = switchService.getCharacteristic(Characteristic.On)
  .on('set', this.setState.bind(this));

  if (this.stateCommand) {
    characteristic.on('get', this.getState.bind(this))
  };

  return [switchService];
}
