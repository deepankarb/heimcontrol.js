if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define([ 'pi-gpio' ], function(gpio) {

  /**
   * Gpio Plugin. Can access the GPIO on the Raspberry PI
   *
   * @class Gpio
   * @param {Object} app The express application
   * @constructor 
   */
  var Gpio = function(app) {

    this.name = 'GPIO';
    this.collection = 'Gpio';
    this.icon = 'icon-lightbulb';

    this.app = app;
    this.id = this.name.toLowerCase();
    this.pluginHelper = app.get('plugin helper');

    this.values = {};

    var that = this;

    // Ping interval
    setInterval(function() {
      that.parse();
    }, 100);

    app.get('sockets').on('connection', function(socket) {

      // GPIO toggle
      socket.on('gpio-toggle', function(data) {
        that.toggle(data);
      });

    });
  };

  /**
   * Toggle a GPIO port
   * 
   * @method toggle
   * @param {Object} data The websocket data
   * @param {String} data.id The ID of the database entry
   * @param {String} data.value The value to set
   */
  Gpio.prototype.toggle = function(data) {
    var that = this;
    this.pluginHelper.findItem(this.collection, data.id, function(err, item, collection) {
      item.value = data.value + '';
      gpio.open(parseInt(item.pin), "output", function(err) {
        gpio.write(parseInt(item.pin), parseInt(item.value), function() {
          gpio.close(parseInt(item.pin));
          that.values[item._id] = item.value;
          that.app.get('sockets').emit('gpio-output', {
            id: item._id,
            value: item.value
          });
        });
      });
    });
  };

  /**
   * Parse GPIO the ports that are used as input and send the result to the client websocket
   * 
   * @method parse
   */
  Gpio.prototype.parse = function() {
    var that = this;
    if (that.app.get('clients').length > 0) {
      that.app.get('db').collection(this.collection, function(err, collection) {
        collection.find({
          direction: 'input'
        }).toArray(function(err, result) {
          result.forEach(function(item) {
            gpio.setDirection(parseInt(item.pin), "input", function(err) {
              gpio.read(parseInt(item.pin), function(err, value) {
                if (!err) {
                  that.values[item._id] = value;
//		  console.log(item.pin + " : " + value);
                  that.app.get('sockets').emit('gpio-input', {
                    id: item._id,
                    value: value
                  });
                }

		else {
		  console.log(getDateTime() + ': Error while reading pin ' + item.pin + '! ' + err);
		}
              });
            });
          });
        });
      });
    }
  };

function getDateTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;    
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    
    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

  /**
   * Manipulate the items array before render
   *
   * @method beforeRender
   * @param {Array} items An array containing the items to be rendered
   * @param {Function} callback The callback method to execute after manipulation
   * @param {String} callback.err null if no error occured, otherwise the error
   * @param {Object} callback.result The manipulated items
   */
  Gpio.prototype.beforeRender = function(items, callback) {
    var that = this;
    items.forEach(function(item) {
      item.value = that.values[item._id] ? that.values[item._id] : 0;
    });
    return callback(null, items);
  }

  var exports = Gpio;

  return Gpio;

});
