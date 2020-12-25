import { app, BrowserWindow, ipcMain } from "electron";
import * as http from 'http';
import * as robot from 'robotjs';
import * as dgram from 'dgram';
import electron from 'electron';
import os from 'os';
import { assert } from "console";

const ipc = electron.ipcMain;
const PORT = 41414;

/*
  PORT + 1 = udp server listening for messages sent from mobile
  PORT + 2 = udp client that broadcasts to broadcast address of local network
*/

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

const broadcastClient = dgram.createSocket('udp4');
broadcastClient.on('listening', () => {
  broadcastClient.setBroadcast(true);
  setInterval(() => {
    const ip = getNetworkInfo().address;
    const hostname = os.hostname();
    broadcastClient.send([ip, hostname], PORT + 2, getBroadcastIP());
  }, 1000)
})

broadcastClient.bind(PORT + 2);

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

  console.log(getBroadcastIP());
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

function getNetworkInfo() {
  var interfaces = os.networkInterfaces();

  for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
      var address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        return { address: address.address, mask: address.netmask };
      }
    }
  }

  return null;
}

function ipToNumberArray(ip: string) {
  return ip.split('.').map((value) => parseInt(value));
}

function getBroadcastIP() {
  const networkInfo = getNetworkInfo();

  const ipv4Parts = ipToNumberArray(networkInfo.address);
  const subnetParts = ipToNumberArray(networkInfo.mask);

  const networkAddress = ipv4Parts.map((value, i) => (value & subnetParts[i]));

  const broadcastIp = networkAddress.map((value, i) => (value | ~subnetParts[i] + 256));

  return broadcastIp.join('.');
}

ipcMain.on("get_pc_info", function (event, arg) {
  const networkInfo = getNetworkInfo();

  if (!networkInfo)
    throw "Network info is not valid";

  event.reply('get_pc_info', { ip: networkInfo.address, name: os.hostname() });
});