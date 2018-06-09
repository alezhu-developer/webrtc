  var logger = exports;
  var fs = require('fs');
  var dateTime = require('node-datetime');
  var dt = dateTime.create();

  logger.debugLevel = 'warn';

  logger.log = function(level, ip, message) {
    var levels = ['error', 'warn', 'info'];
    if (levels.indexOf(level) >= levels.indexOf(logger.debugLevel) ) {
      if (typeof message !== 'string') {
        message = JSON.stringify(message);
      };
      console.log(level+': '+message);
    
    
     var formatted = dt.format('Y.m.d H:M:S');
     
     fs.appendFile('server.log', formatted + ': ' + ip + ': ' + level + '# ' + message + '\n', function (err) {
        if (err) throw err;
     }); 
    }
  }