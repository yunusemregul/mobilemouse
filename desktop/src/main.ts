import { app, BrowserWindow } from "electron";
import * as http from 'http';
import * as robot from 'robotjs';
import * as dgram from 'dgram';

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
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

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