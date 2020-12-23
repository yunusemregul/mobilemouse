import { app, BrowserWindow, ipcMain } from "electron";
import * as http from 'http';
import * as robot from 'robotjs';
import * as dgram from 'dgram';
import electron from 'electron';
import os from 'os';

const ipc = electron.ipcMain;
const PORT = 41414;

const server = http.createServer(function (req, res) {
  res.writeHead(200, {
    'Content-Type': 'mobilemouse',
    'Connection': 'close'
  });
  res.end();
});

const udpServer = dgram.createSocket("udp4");

udpServer.on('message', (msg, rinfo) => {
  const data = JSON.parse(msg.toString());

  console.log(data);

  switch (data.operation) {
    case 'move':
      {
        // TODO: add sensitivity option to mobile
        data.x = data.x * 2;
        data.y = data.y * 2;

        const mousePos = robot.getMousePos();
        robot.moveMouse(mousePos.x + data.x, mousePos.y + data.y);
        break;
      }
    case 'click':
      {
        robot.mouseClick();
        break;
      }
  }
})

udpServer.bind(PORT + 1);
server.listen(PORT);

function createWindow() {
  const win = new BrowserWindow({
    width: 350,
    height: 550,
    webPreferences: {
      nodeIntegration: true,
    },
    resizable: false
  });

  win.removeMenu();
  win.loadFile("src/views/index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("get_pc_info", function (event, arg) {
  var interfaces = os.networkInterfaces();
  var addresses = [];
  for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
      var address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }

  if (addresses.length > 0) {
    event.reply('get_pc_info', { ip: addresses[0], name: os.hostname() });
  }
});