import * as dgram from 'dgram';
import electron, { app, BrowserWindow, ipcMain } from 'electron';
import os from 'os';
import * as robot from 'robotjs';
import * as net from 'net';

const ipc = electron.ipcMain;
const PORT = 41414;

/*
  PORT + 1 = udp server listening for messages sent from mobile
  PORT + 2 = udp client that broadcasts to broadcast address of local network
  TODO: maybe all sockets can be on a single port?
*/

const udpServer = dgram.createSocket("udp4");
const tcpServer = net.createServer({ allowHalfOpen: false });
tcpServer.maxConnections = 1;

let udpServerConnectedInfo: { ip: string, port: number };
let isConnected = false;
let waitingforPong = false;

let win: BrowserWindow;

// TODO: test if multiple phones can connect (they shouldn't be able to)
tcpServer.on('connection', (conn) => {
  let address = conn.remoteAddress;
  address = address.replace(/^.*:/, ''); // strip ::ffff: part

  console.log("TCP: new client connection from " + address);

  // TODO: fix error: cannot call write after a stream was destroyed
  const heartbeatInterval = setInterval(() => {
    if (conn.destroyed) {
      clearInterval(heartbeatInterval);
      return;
    }

    if (waitingforPong) {
      console.log("didn't receive pong, closing connection");
      conn.destroy();
    }

    conn.write("ping");
    waitingforPong = true;
  }, 3000);

  conn.on('data', (msg) => {
    let data: any = msg.toString();

    if (data === "pong") {
      waitingforPong = false;
      return;
    }

    data = JSON.parse(data);

    switch (data.operation) {
      case 'connect':
        {
          win.webContents.send("connect", data.name);

          udpServer.connect(conn.localPort, address);
          udpServerConnectedInfo = { port: conn.localPort, ip: address };
          isConnected = true;
          break;
        }
    }
  });

  conn.once('close', () => {
    console.log("TCP: client " + address + " has closed the connection");
    udpServer.disconnect();
    win.webContents.send('disconnect');
    clearInterval(heartbeatInterval);
  });
})

tcpServer.listen(PORT + 1, () => {
  console.log("tcp server is listening");
})

udpServer.on('message', (msg, rinfo) => {
  // TODO: check if the rinfo sender is the phone we must be connected to

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
    broadcastClient.send(JSON.stringify({ ip: ip, name: hostname }), PORT + 2, getBroadcastIP());
  }, 1000)
})

broadcastClient.bind(PORT + 2);

function createWindow() {
  win = new BrowserWindow({
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