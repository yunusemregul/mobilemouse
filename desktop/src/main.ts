import { app, BrowserWindow } from "electron";
import * as WebSocket from 'ws';
import * as http from 'http';
import * as robot from 'robotjs';

const PORT = 41414;

const server = http.createServer(function (req, res) {
  res.writeHead(200, {
    'Content-Type': 'mobilemouse',
    'Connection': 'close'
  });
  res.end();
});

const wss = new WebSocket.Server({ server });

// TODO: it doesn't work as expected

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message: string) {
    /*let splitted = message.split(':');
    let x = Number(message[0]);
    let y = Number(message[1]);
    console.log(x, y);*/
    console.log(message);

    //robot.moveMouse(robot.getMousePos().x + 1, robot.getMousePos().y + 1);
  });
});

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

server.listen(PORT);