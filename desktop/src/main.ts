import dgram from 'dgram';
import electron, { app, BrowserWindow, ipcMain } from 'electron';
import net from 'net';
import os from 'os';
import path from 'path';
import robot from 'robotjs';

const ipc = electron.ipcMain;
const PORT = 41414;

/*
  PORT = tcp & udp server listening for messages sent from mobile
  PORT + 1 = udp client that broadcasts to broadcast address of local network
*/

const udpServer = dgram.createSocket("udp4");
const tcpServer = net.createServer({ allowHalfOpen: false });
// tcpServer.maxConnections = 1;

let udpServerConnectedInfo: { ip: string, port: number };
let isConnected = false;
let waitingforPong = false;

let win: BrowserWindow;

// TODO: test if multiple phones can connect (they shouldn't be able to)
tcpServer.on('connection', (conn) => {
  let address = conn.remoteAddress;
  address = address.replace(/^.*:/, ''); // strip ::ffff: part

  console.log("TCP: new client connection from " + address);

  // TODO: fix error: cannot call write after a stream was destroyed (is fixed?)
  let heartbeatInterval: NodeJS.Timeout;

  function connectionClosed() {
    waitingforPong = false;
    isConnected = false;
    udpServerConnectedInfo = { ip: "", port: -1 };
    udpServer.disconnect();
    clearInterval(heartbeatInterval);
  }

  conn.on('data', (msg) => {
    let data: any = msg.toString();

    if (isConnected && udpServerConnectedInfo.ip === address) {
      if (data === "pong") {
        waitingforPong = false;
        return;
      }
    }

    data = JSON.parse(data);

    switch (data.operation) {
      case 'connect':
        {
          if (isConnected)
            return;

          win.webContents.send("connect", data.name);

          udpServer.connect(conn.localPort, address);
          udpServerConnectedInfo = { port: conn.localPort, ip: address };
          isConnected = true;

          heartbeatInterval = setInterval(() => {
            if (waitingforPong) {
              console.log("didn't receive pong, closing connection");
              conn.destroy();
              connectionClosed();
              return;
            }

            conn.write("ping");
            waitingforPong = true;
          }, 3000);
          break;
        }
    }
  });

  conn.once('close', () => {
    console.log("TCP: client " + address + " has closed the connection");
    if (isConnected && udpServerConnectedInfo.ip === address) {
      win.webContents.send('disconnect');
      connectionClosed();
    }
  });
})

tcpServer.listen(PORT, () => {
  console.log("tcp server is listening");
})

udpServer.on('message', (msg, rinfo) => {
  if (!isConnected) return;
  if (rinfo.address !== udpServerConnectedInfo.ip) return;

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

udpServer.bind(PORT);

const broadcastClient = dgram.createSocket('udp4');
broadcastClient.on('listening', () => {
  broadcastClient.setBroadcast(true);
  setInterval(() => {
    const ip = getNetworkInfo().address;
    const hostname = os.hostname();
    broadcastClient.send(JSON.stringify({ ip: ip, name: hostname }), PORT + 1, getBroadcastIP());
  }, 1000)
})

broadcastClient.bind(PORT + 1);

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
  win.loadFile(path.join(__dirname, 'public/index.html'));

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

ipcMain.on("get_pc_info", function (event: any, arg: any) {
  const networkInfo = getNetworkInfo();

  if (!networkInfo)
    throw "Network info is not valid";

  event.reply('get_pc_info', { ip: networkInfo.address, name: os.hostname() });
});