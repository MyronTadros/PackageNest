'use strict';

var path = require('path');
var http = require('http');
import * as dotenv from "dotenv";
dotenv.config();


var oas3Tools = require('oas3-tools');
var serverPort = 8080;

// swaggerRouter configuration
var options = {
    routing: {
        controllers: path.join(__dirname, './src/controllers'),
    }
};

var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'src/api/openapi.yaml'), options);
var app = expressAppConfig.getApp();


// Initialize the Swagger middleware
http.createServer(app).listen(serverPort, function () {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
});